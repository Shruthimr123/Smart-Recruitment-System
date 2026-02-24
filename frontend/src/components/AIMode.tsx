import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import axiosInstance from "../api/axiosInstance";
import { useNavigate } from "react-router-dom";
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

interface CandidateFormData {
  email: string;
  name: string;
  phone: string;
  job: string;
  experience: string;
  skillA: string;
  skillB: string;
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

const AIMode: React.FC = () => {
  const navigate = useNavigate();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [testLinkData, setTestLinkData] = useState<TestLinkData | null>(null);

  const [formData, setFormData] = useState<CandidateFormData>({
    email: "",
    name: "",
    phone: "",
    job: "",
    experience: "",
    skillA: "",
    skillB: "",
  });

  const [errors, setErrors] = useState({ email: "", name: "", phone: "" });

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
    const savedTestLink = localStorage.getItem("aiTestLinkData");
    if (savedTestLink) {
      try {
        const testLink = JSON.parse(savedTestLink);
        setTestLinkData(testLink);
      } catch (error) {
        console.error("Error parsing saved test link data:", error);
        localStorage.removeItem("aiTestLinkData");
      }
    }
  }, []);

  const getFrontendBaseUrl = () => {
    // Use environment variable if set
    const envUrl = import.meta.env.VITE_FRONTEND_BASE_URL;
    if (envUrl) return envUrl;

    // Otherwise, determine based on current environment
    if (window.location.hostname === "localhost") {
      return "http://localhost:5173"; // Your Vite dev server port
    }

    // For production
    return window.location.origin;
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
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
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
      localStorage.removeItem("aiTestLinkData");
    }
  };

  // Generate AI Test Link
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
      mcq_mode: "ai", // Add test mode flag
    };

    try {
      setLoading(true);
      clearExistingTestLink();

      const response = await axiosInstance.post(
        "/ai-test/generate-ai-link",
        payload,
      );

      console.log("Generate AI test link response:", response.data);

      const token = response.data.token;
      const attemptId = response.data.attemptId;
      const applicantId = response.data.applicantId;
      const codingProblemKey = response.data.codingProblemKey;

      if (!token || !attemptId || !applicantId) {
        throw new Error("Missing required data in response");
      }

      //   const generatedLink = `${window.location.origin}/ai-test/${token}/${applicantId}/${attemptId}`;
      // const generatedLink = `${window.location.protocol}//${window.location.hostname}:5173/ai-test/${token}/${applicantId}/${attemptId}`;
      const generatedLink = `${getFrontendBaseUrl()}/ai-test/${token}/${applicantId}/${attemptId}`;

      const newTestLinkData: TestLinkData = {
        token: token,
        attemptId: attemptId,
        applicantId: applicantId,
        link: generatedLink,
        generatedAt: new Date().toISOString(),
        isPreview: false,
        codingProblemKey: codingProblemKey,
      };

      setTestLinkData(newTestLinkData);
      localStorage.setItem("aiTestLinkData", JSON.stringify(newTestLinkData));

      toast.success("AI Test link generated successfully!");
    } catch (error: any) {
      console.error("Error generating AI test link:", error);
      toast.error("Failed to generate test link.");
    } finally {
      setLoading(false);
    }
  };

  // Send AI Test Link to Candidate
  const handleSendTest = async () => {
    if (!validateForm()) return;

    if (!testLinkData) {
      toast.error("Please generate test link first!");
      return;
    }

    try {
      setSending(true);

      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const ta_id = user?.id || "";

      const finalPayload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        job_id: formData.job,
        experience_level_id: formData.experience,
        primary_skill_id: formData.skillA,
        secondary_skill_id: formData.skillB || null,
        ta_id,
        mcq_mode: "ai",
        previewProblemKey: testLinkData?.codingProblemKey,
      };

      console.log("Calling /ai-test/generate-ai-final-link");

      await axiosInstance.post("/ai-test/generate-ai-final-link", finalPayload);

      // Clear localStorage and reset form
      localStorage.removeItem("aiTestLinkData");

      setFormData({
        email: "",
        name: "",
        phone: "",
        job: "",
        experience: "",
        skillA: "",
        skillB: "",
      });
      setTestLinkData(null);

      toast.success("AI Test link sent successfully to candidate!");
    } catch (error: any) {
      console.error("Error in handleSendTest:", error);

      if (error.response?.data?.message?.includes("already exists")) {
        toast.error(
          "This candidate already has an active test. Please use a different email.",
        );
      } else if (
        error.response?.data?.message?.includes("Maximum test attempts")
      ) {
        toast.error("Maximum test attempts exceeded (3).");
      } else if (error.response?.data?.message?.includes("email")) {
        toast.error(
          "Failed to send email. Please check your email configuration.",
        );
      } else {
        toast.error("Failed to send test link. Please try again.");
      }
    } finally {
      setSending(false);
    }
  };

  // Handle skill change - clear test link
  const handleSkillChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Clear test link when primary skill changes
    if (name === "skillA" && testLinkData) {
      clearExistingTestLink();
    }
  };

  return (
    <div className="send-link-container">
      <div className="send-link-form-container">
        <form className="send-link-form" onSubmit={(e) => e.preventDefault()}>
          <div className="ai-mode-header">
            <h2>AI Mode - Adaptive Test</h2>
            {/* <p className="ai-mode-description">
              In AI mode, the test adapts to the candidate's performance. 
              Questions are served in sets of 5 with difficulty adjustment based on scores.
            </p> */}
          </div>

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
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button
              className="action-btn generate-btn"
              onClick={handleGenerateLink}
              disabled={loading}
            >
              {loading ? "Generating..." : "Generate AI Test Link"}
            </button>

            <button
              className="action-btn send-btn"
              onClick={handleSendTest}
              disabled={!testLinkData || sending}
            >
              {sending ? "Sending..." : "Send AI Test Link"}
            </button>
          </div>

          {/* Test Link Display */}
          {testLinkData && (
            <div className="test-link-display">
              <h3>AI Test Link Generated</h3>
              <div className="link-container">
                <input
                  type="text"
                  readOnly
                  value={testLinkData.link}
                  className="link-input"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  className="copy-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(testLinkData.link);
                    toast.success("Link copied to clipboard!");
                  }}
                >
                  Copy
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AIMode;
