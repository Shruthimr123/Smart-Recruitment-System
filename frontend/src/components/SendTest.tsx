import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import axiosInstance from "../api/axiosInstance";
import "./css/SendTest.css";
import "./css/SelectMCQs.css";
import "./css/TestPreview.css";

interface Skill {
  id: string;
  name: string;
}

interface Job {
  id: string;
  title: string;
  clientName: string;
}

interface MCQ {
  id: string;
  questionTitle: string;
  difficulty: string;
  options: Array<{
    id: string;
    optionText: string;
    isCorrect: boolean;
  }>;
  skill: { id: string; name: string };
}

interface Problem {
  key: string;
  title: string;
  description: string;
  difficulty: string;
  functionSignature: string;
  functionName: string;
  testCases: any[];
  languageConfigs: any[];
}

interface TestLinkData {
  token: string;
  attemptId: string;
  applicantId: string;
  link: string;
  generatedAt: string;
  isPreview?: boolean;
  codingProblemKey?: string;
}

interface CandidateFormData {
  email: string;
  name: string;
  phone: string;
  job: string;
  experience: string;
  skillA: string;
  skillB: string;
}

const SendTest = () => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [testLinkData, setTestLinkData] = useState<TestLinkData | null>(null);
  const [showConfigWarningPopup, setShowConfigWarningPopup] = useState(false);

  const [hasConfigChanged, setHasConfigChanged] = useState(false);

  const [formData, setFormData] = useState<CandidateFormData>(() => {
    const saved = localStorage.getItem("candidateFormData");
    return saved
      ? JSON.parse(saved)
      : {
          email: "",
          name: "",
          phone: "",
          job: "",
          experience: "",
          skillA: "",
          skillB: "",
        };
  });

  const [errors, setErrors] = useState({ email: "", name: "", phone: "" });

  // Manual questions from localStorage
  const [manualMcqs, setManualMcqs] = useState<string[]>(() => {
    const saved = localStorage.getItem("manualMcqs");
    return saved ? JSON.parse(saved) : [];
  });

  // Modal state
  const [showMcqModal, setShowMcqModal] = useState(false);
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [skillFilter, setSkillFilter] = useState("");

  // Test Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewMcqs, setPreviewMcqs] = useState<MCQ[]>([]);
  const [previewCodingProblems, setPreviewCodingProblems] = useState<Problem[]>(
    []
  );
  const [previewLoading, setPreviewLoading] = useState(false);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("candidateFormData", JSON.stringify(formData));
  }, [formData]);

  // Save manual MCQs to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("manualMcqs", JSON.stringify(manualMcqs));
  }, [manualMcqs]);

  // Check if configuration has changed when form data or manual MCQs change
  useEffect(() => {
    if (testLinkData) {
      setHasConfigChanged(true);
    }
  }, [formData, manualMcqs]);

  // Load skills and jobs
  useEffect(() => {
    const fetchSkillsAndJobs = async () => {
      try {
        const [skillsRes, jobsRes] = await Promise.all([
          axiosInstance.get("/skills"),
          axiosInstance.get("/jobs"),
        ]);
        setSkills(skillsRes.data.data || []);
        setJobs(jobsRes.data.data || []);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load skills or jobs.");
      }
    };
    fetchSkillsAndJobs();
  }, []);

  // Load test link data from localStorage on component mount
  useEffect(() => {
    const savedTestLink = localStorage.getItem("testLinkData");

    if (savedTestLink) {
      try {
        const testLink = JSON.parse(savedTestLink);
        setTestLinkData(testLink);
        setHasConfigChanged(false);
      } catch (error) {
        console.error("Error parsing saved test link data:", error);
        localStorage.removeItem("testLinkData");
      }
    }
  }, []);

  // open MCQ modal without showing warning
  const openMcqModalWithoutWarning = async () => {
    try {
      const res = await axiosInstance.get(`/mcq-questions`);
      const data: MCQ[] = Array.isArray(res.data.data) ? res.data.data : [];
      setMcqs(data);
      if (data.length === 0)
        toast.info("No questions returned for this skill.");
      setShowMcqModal(true);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load questions.");
    }
  };

  // Open MCQ modal
  const openMcqModal = async () => {
    if (!formData.skillA) {
      toast.error("Please select a primary skill first!");
      return;
    }

    if (testLinkData) {
      setShowConfigWarningPopup(true);
      return;
    }

    try {
      const res = await axiosInstance.get(`/mcq-questions`);
      const data: MCQ[] = Array.isArray(res.data.data) ? res.data.data : [];
      setMcqs(data);
      if (data.length === 0)
        toast.info("No questions returned for this skill.");
      setShowMcqModal(true);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load questions.");
    }
  };

  // Toggle select MCQ
  const toggleSelectMcq = (id: string) => {
    setManualMcqs((prev) => {
      if (prev.includes(id)) return prev.filter((q) => q !== id);

      if (prev.length >= 30) return prev;

      return [...prev, id];
    });

    // Separate side effect
    setManualMcqs((prev) => {
      if (prev.length >= 30 && !prev.includes(id)) {
        toast.error("You can select a maximum of 30 manual questions only.");
      }
      return prev;
    });
  };

  // Validate inputs
  const validateField = (name: string, value: string) => {
    let error = "";
    if (name === "email") {
      if (!value.trim()) error = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
        error = "Invalid email format";
    }
    if (name === "name") {
      if (!value.trim()) error = "Name is required";
      else if (!/^[A-Za-z\s]{3,}$/.test(value))
        error = "Name must be at least 3 letters";
    }
    if (name === "phone") {
      if (!value.trim()) error = "Phone is required";
      else if (!/^\d{10}$/.test(value)) error = "Phone must be 10 digits";
    }
    setErrors((prev) => ({ ...prev, [name]: error }));
    return error;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (["email", "name", "phone"].includes(name)) {
      validateField(name, value);
    }
  };

  // Validate form before any action
  const validateForm = (): boolean => {
    const emailError = validateField("email", formData.email);
    const nameError = validateField("name", formData.name);
    const phoneError = validateField("phone", formData.phone);

    if (emailError || nameError || phoneError) {
      toast.error("Please fix the highlighted errors.");
      return false;
    }

    if (!formData.job || !formData.experience || !formData.skillA) {
      toast.error("Please fill all required fields.");
      return false;
    }

    return true;
  };

  // Clear existing test link
  const clearExistingTestLink = () => {
    if (testLinkData) {
      setTestLinkData(null);
      localStorage.removeItem("testLinkData");
      setHasConfigChanged(false);
    }
  };

  // Generate Test Link
  const handleGenerateLink = async () => {
    if (!validateForm()) return;

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const ta_id = user?.id || "";

    const payload = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      job_id: formData.job,
      experience_level_id: formData.experience,
      primary_skill_id: formData.skillA,
      secondary_skill_id: formData.skillB || null,
      ta_id,
      manual_mcqs: manualMcqs,
    };

    try {
      setLoading(true);
      clearExistingTestLink();

      const response = await axiosInstance.post(
        "/test/generate-preview-link",
        payload
      );

      console.log("Generate preview link response:", response.data);

      const token = response.data.token;
      const attemptId = response.data.attemptId;
      const applicantId = response.data.applicantId;
      const codingProblemKey = response.data.codingProblemKey;

      if (!token || !attemptId || !applicantId) {
        throw new Error("Missing required data in response");
      }

      const generatedLink = `${window.location.origin}/test/${token}/${applicantId}/${attemptId}`;

      const newTestLinkData: TestLinkData = {
        token: token,
        attemptId: attemptId,
        applicantId: applicantId,
        link: generatedLink,
        generatedAt: new Date().toISOString(),
        isPreview: response.data.isPreview || false,
        codingProblemKey: codingProblemKey,
      };

      setTestLinkData(newTestLinkData);
      localStorage.setItem("testLinkData", JSON.stringify(newTestLinkData));

      // Reset config changed flag after successful generation
      setHasConfigChanged(false);

      console.log("Coding problem key stored:", codingProblemKey);

      toast.success(
        "Test link generated successfully! Preview the test before sending."
      );
    } catch (error: any) {
      console.error("Error generating test link:", error);
      toast.error("Failed to generate test link.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch actual assigned questions for preview
  const handleTestPreview = async () => {
    if (!testLinkData) {
      toast.error("Please generate test link first!");
      return;
    }

    if (hasConfigChanged) {
      toast.error(
        "Please regenerate test link first as configuration has changed."
      );
      return;
    }

    setPreviewLoading(true);
    try {
      // Fetch actual assigned MCQ questions
      const mcqRes = await axiosInstance.get(
        `/applicant-questions/assigned/${testLinkData.applicantId}/${testLinkData.attemptId}`
      );

      console.log("MCQ Preview Response:", mcqRes.data); // Add logging

      const mcqData: any[] = Array.isArray(mcqRes.data.questions)
        ? mcqRes.data.questions
        : [];

      // Transform the data to match MCQ interface
      const previewMcqs: MCQ[] = mcqData.map((item: any) => ({
        id: item.mcq_question?.id || item.id,
        questionTitle: item.mcq_question?.questionTitle || "No title",
        difficulty: item.mcq_question?.difficulty || "medium",
        options: item.mcq_question?.options || [],
        skill: item.mcq_question?.skill || { id: "", name: "Unknown" },
      }));

      setPreviewMcqs(previewMcqs);
      console.log("Preview MCQs set:", previewMcqs.length); // Add logging

      // Fetch the SAME coding problem that was assigned during generation
      const javaLanguageId = "58367b22-5147-4543-812c-48177a1f5feb";
      try {
        const codingRes = await axiosInstance.get(
          `/test/preview-coding/${testLinkData.applicantId}/${testLinkData.attemptId}/${javaLanguageId}`
        );

        const codingData = codingRes.data;
        const codingProblems: Problem[] = [
          {
            key: codingData.problemKey,
            title: codingData.title,
            description: codingData.description,
            difficulty: codingData.difficulty,
            functionSignature: codingData.functionSignature,
            functionName: codingData.functionName,
            testCases: codingData.testCases || [],
            languageConfigs: [],
          },
        ];

        setPreviewCodingProblems(codingProblems);
      } catch (codingError) {
        console.warn("Could not fetch coding problem:", codingError);
        toast.error(
          "Failed to load coding problem. Please regenerate the test link."
        );
        setPreviewCodingProblems([]);
      }

      setShowPreview(true);
    } catch (error: any) {
      console.error("Error fetching test preview:", error);

      toast.error(
        "Failed to load test preview. Please try generating the link again."
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  // Send Test Link to Candidate
  const handleSendTest = async () => {
    if (!validateForm()) return;

    if (hasConfigChanged) {
      toast.error(
        "Please regenerate test link first as configuration has changed."
      );
      return;
    }

    try {
      setSending(true);

      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const ta_id = user?.id || "";

      //Get the preview problem key from testLinkData
      const previewProblemKey = testLinkData?.codingProblemKey;

      console.log("Preview problem key:", previewProblemKey);

      const finalPayload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        job_id: formData.job,
        experience_level_id: formData.experience,
        primary_skill_id: formData.skillA,
        secondary_skill_id: formData.skillB || null,
        ta_id,
        manual_mcqs: manualMcqs,
        previewProblemKey: previewProblemKey,
        previewAttemptId: testLinkData?.attemptId,
      };

      console.log(
        "Calling /test/generate-link with previewProblemKey:",
        previewProblemKey
      );

      // Remove the unused variable assignment
      await axiosInstance.post("/test/generate-link", finalPayload);

      // Clean up preview data
      try {
        await axiosInstance.delete("/test/cleanup-preview-data");
      } catch (cleanupError) {
        console.warn("Could not clean up preview data:", cleanupError);
      }

      // Clear localStorage and reset form
      localStorage.removeItem("candidateFormData");
      localStorage.removeItem("manualMcqs");
      localStorage.removeItem("testLinkData");

      setFormData({
        email: "",
        name: "",
        phone: "",
        job: "",
        experience: "",
        skillA: "",
        skillB: "",
      });
      setManualMcqs([]);
      setTestLinkData(null);
      setHasConfigChanged(false);

      toast.success("Test link sent successfully to candidate!");
    } catch (error: any) {
      console.error("Error in handleSendTest:", error);

      if (error.response?.data?.message?.includes("already exists")) {
        toast.error(
          "This candidate already has an active test. Please use a different email."
        );
      } else if (
        error.response?.data?.message?.includes("Maximum test attempts")
      ) {
        toast.error("Maximum test attempts exceeded (3).");
      } else if (error.response?.data?.message?.includes("email")) {
        toast.error(
          "Failed to send email. Please check your email configuration."
        );
      } else {
        toast.error("Failed to send test link. Please try again.");
      }
    } finally {
      setSending(false);
    }
  };

  // Auto-clear test link when manual questions change
  useEffect(() => {
    if (testLinkData && manualMcqs.length > 0) {
      clearExistingTestLink();
    }
  }, [manualMcqs]);

  // Handle skill change - clear test link
  const handleSkillChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Clear test link when primary skill changes
    if (name === "skillA" && testLinkData) {
      clearExistingTestLink();
    }
  };

  // Calculate button states
  const canGenerateLink = !loading;
  const canPreviewTest = testLinkData && !hasConfigChanged && !previewLoading;
  const canSendTest = testLinkData && !hasConfigChanged && !sending;

  const difficultyCounts = mcqs.reduce((acc, q) => {
    const key = q.difficulty.toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const displayedMcqs = mcqs.filter((q) => {
    const difficultyMatch = difficultyFilter
      ? q.difficulty.toLowerCase() === difficultyFilter.toLowerCase()
      : true;

    const skillMatch = skillFilter ? q.skill.name === skillFilter : true;

    return difficultyMatch && skillMatch;
  });

  return (
    <div className="send-link-container">
      <div className="send-link-form-container">
        <form className="send-link-form" onSubmit={(e) => e.preventDefault()}>
          {/* Form Fields Grid */}
          <div className="form-grid">
            <div className="input-wrapper">
              <input
                className="send-link-input"
                type="email"
                name="email"
                placeholder="Email Id"
                value={formData.email}
                onChange={handleChange}
              />
              {errors.email && <p className="error">{errors.email}</p>}
            </div>

            <div className="input-wrapper">
              <input
                className="send-link-input"
                type="text"
                name="name"
                placeholder="Name"
                value={formData.name}
                onChange={handleChange}
              />
              {errors.name && <p className="error">{errors.name}</p>}
            </div>

            <div className="input-wrapper">
              <input
                className="send-link-input"
                type="tel"
                name="phone"
                placeholder="Phone No."
                value={formData.phone}
                onChange={handleChange}
              />
              {errors.phone && <p className="error">{errors.phone}</p>}
            </div>

            <div className="input-wrapper">
              <select
                className="send-link-input"
                name="job"
                value={formData.job}
                onChange={handleChange}
                required
              >
                <option value="">Select Job</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} ({job.clientName})
                  </option>
                ))}
              </select>
            </div>

            <div className="input-wrapper">
              <select
                className="send-link-input"
                name="experience"
                value={formData.experience}
                onChange={handleChange}
                required
              >
                <option value="">Select Experience Level</option>
                <option value="a0c3f9cb-d673-461f-b130-4437e57cedcf">
                  Fresher
                </option>
                <option value="833d6ee0-27f6-462f-aba3-f4df251bf47e">
                  Junior
                </option>
                <option value="2ec03951-43b3-42a6-ad36-346d9b8d4ab6">
                  Mid-Level
                </option>
                <option value="8b5adf1a-2ec5-4094-89a8-992cee152f07">
                  Senior
                </option>
              </select>
            </div>

            <div className="input-wrapper">
              <select
                className="send-link-input"
                name="skillA"
                value={formData.skillA}
                onChange={handleSkillChange}
                required
              >
                <option value="">Select Primary Skill</option>
                {skills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-wrapper">
              <select
                className="send-link-input"
                name="skillB"
                value={formData.skillB}
                onChange={handleChange}
              >
                <option value="">Select Secondary Skill (Optional)</option>
                {skills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Manual Questions Section */}
            <div className="manual-section">
              <button
                type="button"
                className="manual-questions-btn"
                onClick={openMcqModal}
              >
                <span className="btn-icon">📝</span>
                Select Manual Questions
                <span className="selected-count">({manualMcqs.length}/30)</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button
              className="action-btn generate-btn"
              onClick={handleGenerateLink}
              disabled={!canGenerateLink}
            >
              {loading ? "Generating..." : "Generate Test Link"}
            </button>

            <button
              className="action-btn preview-btn"
              onClick={handleTestPreview}
              disabled={!canPreviewTest}
            >
              {previewLoading ? "Loading..." : "Test Preview"}
            </button>

            <button
              className="action-btn send-btn"
              onClick={handleSendTest}
              disabled={!canSendTest}
            >
              {sending ? "Sending..." : "Send Test Link"}
            </button>
          </div>
        </form>
      </div>

      {/* ---------- MCQ Modal ---------- */}
      {showMcqModal && (
        <div className="modal-overlay">
          <div className="modal-content preview-modal">
            <h3>
              Select Questions for Skill:{" "}
              <span className="skill-name">
                {mcqs[0]?.skill.name || "(Unknown Skill)"}
              </span>
            </h3>

            <div className="filters">
              <label>Filter by Skill:</label>
              <select
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value)}
              >
                <option value="">All</option>
                {Array.from(new Set(mcqs.map((q) => q.skill.name))).map(
                  (skill) => (
                    <option key={skill} value={skill}>
                      {skill}
                    </option>
                  )
                )}
              </select>
              <label>Filter by Difficulty:</label>
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
              >
                <option value="">All</option>
                <option value="easy">
                  Easy ({difficultyCounts["easy"] || 0})
                </option>
                <option value="medium">
                  Medium ({difficultyCounts["medium"] || 0})
                </option>
                <option value="hard">
                  Hard ({difficultyCounts["hard"] || 0})
                </option>
              </select>
            </div>

            <div className="mcq-list">
              {displayedMcqs.length === 0 ? (
                <p>No questions found for this skill.</p>
              ) : (
                displayedMcqs.map((q) => (
                  <label
                    key={q.id}
                    className={`mcq-item ${
                      manualMcqs.includes(q.id) ? "selected" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={manualMcqs.includes(q.id)}
                      onChange={() => toggleSelectMcq(q.id)}
                    />
                    <span className="question-text">{q.questionTitle}</span>
                    <span
                      className={`difficulty ${q.difficulty.toLowerCase()}`}
                    >
                      {q.difficulty}
                    </span>
                  </label>
                ))
              )}
            </div>

            <div className="mcq-actions">
              <p>Selected: {manualMcqs.length} / 30</p>
              <button
                className="save-btn"
                onClick={() => setShowMcqModal(false)}
              >
                Save & Close
              </button>
              <button className="cancel-btn" onClick={() => setManualMcqs([])}>
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Test Preview Modal ---------- */}
      {showPreview && (
        <div className="modal-overlay preview-overlay">
          <div className="preview-modal">
            <div className="preview-header">
              <h2>Test Preview</h2>
              <button
                className="close-preview"
                onClick={() => setShowPreview(false)}
              >
                ×
              </button>
            </div>

            <div className="preview-content">
              {/* Test Information */}
              <section className="preview-info">
                <h3>Test Information</h3>
                <br />
                <div className="info-grid">
                  <div className="info-item">
                    <strong>Candidate:</strong> {formData.name}
                  </div>
                  <div className="info-item">
                    <strong>Email:</strong> {formData.email}
                  </div>
                  <div className="info-item">
                    <strong>Primary Skill:</strong>{" "}
                    {skills.find((s) => s.id === formData.skillA)?.name ||
                      "N/A"}
                  </div>
                  <div className="info-item">
                    <strong>Secondary Skill:</strong>{" "}
                    {formData.skillB
                      ? skills.find((s) => s.id === formData.skillB)?.name
                      : "None"}
                  </div>
                  <div className="info-item">
                    <strong>Experience Level:</strong>
                    {formData.experience ===
                    "a0c3f9cb-d673-461f-b130-4437e57cedcf"
                      ? "Fresher"
                      : formData.experience ===
                        "833d6ee0-27f6-462f-aba3-f4df251bf47e"
                      ? "Junior"
                      : formData.experience ===
                        "2ec03951-43b3-42a6-ad36-346d9b8d4ab6"
                      ? "Mid-Level"
                      : formData.experience ===
                        "8b5adf1a-2ec5-4094-89a8-992cee152f07"
                      ? "Senior"
                      : "N/A"}
                  </div>
                  <div className="info-item">
                    <strong>Preview Mode:</strong>{" "}
                    {testLinkData?.isPreview
                      ? "Yes - Data will be cleaned up"
                      : "No - Real test data"}
                  </div>
                  <div className="info-item">
                    <strong>Configuration Status:</strong>{" "}
                    {hasConfigChanged ? (
                      <span style={{ color: "orange" }}>
                        Outdated - Regenerate Required
                      </span>
                    ) : (
                      <span style={{ color: "green" }}>Current</span>
                    )}
                  </div>
                </div>
              </section>
              <br />

              {/* MCQ Section Preview */}
              <section className="preview-section">
                <h3>MCQ Section ({previewMcqs.length} questions)</h3>
                <div className="mcq-preview-list">
                  {previewMcqs.map((mcq, index) => (
                    <div key={mcq.id} className="preview-mcq-item">
                      <div className="preview-question-header">
                        <span className="question-number">Q{index + 1}.</span>
                        <span
                          className={`difficulty-badge ${mcq.difficulty.toLowerCase()}`}
                        >
                          {mcq.difficulty}
                        </span>
                        <span className="skill-badge">
                          {mcq.skill?.name || "General"}
                        </span>
                      </div>
                      <p className="preview-question-text">
                        {mcq.questionTitle}
                      </p>
                      {mcq.options && mcq.options.length > 0 && (
                        <div className="preview-options">
                          <strong>Options:</strong>
                          <ul>
                            {mcq.options.map((option, optIndex) => (
                              <li
                                key={option.id}
                                className={
                                  option.isCorrect ? "correct-option" : ""
                                }
                              >
                                {String.fromCharCode(65 + optIndex)}.{" "}
                                {option.optionText}
                                {option.isCorrect && " ✓"}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Coding Section Preview */}
              <section className="preview-section">
                <h3>Coding Section ({previewCodingProblems.length} problem)</h3>
                <div className="coding-preview-list">
                  {previewCodingProblems.map((problem, index) => (
                    <div key={problem.key} className="preview-coding-item">
                      <div className="preview-problem-header">
                        <span className="problem-number">
                          Problem {index + 1}:
                        </span>
                        <span
                          className={`difficulty-badge ${problem.difficulty.toLowerCase()}`}
                        >
                          {problem.difficulty}
                        </span>
                      </div>
                      <h4 className="preview-problem-title">{problem.title}</h4>
                      <p className="preview-problem-description">
                        {problem.description}
                      </p>

                      <div className="preview-function-signature">
                        <strong>Function Signature:</strong>
                        <code>{problem.functionSignature}</code>
                      </div>

                      {problem.testCases && problem.testCases.length > 0 && (
                        <div className="preview-test-cases">
                          <h5>Sample Test Cases:</h5>
                          <ul>
                            {problem.testCases
                              .filter((testCase: any) => !testCase.isHidden)
                              .slice(0, 3)
                              .map((testCase: any, idx: number) => (
                                <li key={idx}>
                                  <strong>Input:</strong>
                                  {testCase.input &&
                                  typeof testCase.input === "object" ? (
                                    Object.entries(testCase.input).map(
                                      ([key, value]) => (
                                        <div key={key}>
                                          <strong>{key}</strong>:{" "}
                                          {Array.isArray(value)
                                            ? `[${value.join(", ")}]`
                                            : value == null
                                            ? "N/A"
                                            : String(value)}
                                        </div>
                                      )
                                    )
                                  ) : (
                                    <span> {testCase.input}</span>
                                  )}
                                  <strong> Output:</strong>{" "}
                                  {typeof testCase.expectedOutput === "object"
                                    ? JSON.stringify(testCase.expectedOutput)
                                    : testCase.expectedOutput}
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Test Summary */}
              <section className="preview-summary">
                <h3>Test Summary</h3>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span className="summary-label">Total MCQ Questions:</span>
                    <span className="summary-value">{previewMcqs.length}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">
                      Total Coding Problems:
                    </span>
                    <span className="summary-value">
                      {previewCodingProblems.length}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Manual MCQs Selected:</span>
                    <span className="summary-value">{manualMcqs.length}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Auto-generated MCQs:</span>
                    <span className="summary-value">
                      {previewMcqs.length - manualMcqs.length}
                    </span>
                  </div>
                </div>
              </section>
            </div>

            <div className="preview-actions">
              <button
                className="close-preview-btn"
                onClick={() => setShowPreview(false)}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Warning Popup */}
      {showConfigWarningPopup && (
        <div className="config-warning-popup-overlay">
          <div className="config-warning-popup">
            <button
              className="close-popup-btn"
              onClick={() => setShowConfigWarningPopup(false)}
            >
              ×
            </button>
            <div className="popup-content">
              <div className="warning-icon">⚠️</div>
              <h3>Configuration Change Required</h3>
              <p>
                You've already generated a test link. If you modify the manual
                questions selection, you'll need to regenerate the test link to
                ensure the candidate receives the updated test configuration.
              </p>
              <div className="popup-actions">
                <button
                  className="proceed-btn"
                  onClick={() => {
                    setShowConfigWarningPopup(false);
                    // Proceed to open MCQ modal after a small delay
                    setTimeout(() => {
                      openMcqModalWithoutWarning();
                    }, 100);
                  }}
                >
                  Continue Anyway
                </button>
                <button
                  className="cancel-popup-btn"
                  onClick={() => setShowConfigWarningPopup(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SendTest;
