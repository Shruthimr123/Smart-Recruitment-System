import React, { useState } from "react";
import { toast } from "sonner";
import "./css/AddCodingQuestions.css";

interface LanguageConfig {
  language: string;
  signature: string;
  functionName: string;
}

interface TestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

interface CodingQuestion {
  key: string;
  title: string;
  description: string;
  difficulty: string;
  createdBy: string;
  languageConfigs: LanguageConfig[];
  testCases: TestCase[];
}

const AddCodingQuestions: React.FC = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [question, setQuestion] = useState<CodingQuestion>({
    key: "",
    title: "",
    description: "",
    difficulty: "medium",
    createdBy: user?.id || "",
    languageConfigs: [{ language: "", signature: "", functionName: "" }],
    testCases: [{ input: "", expectedOutput: "", isHidden: false }],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
    field: keyof CodingQuestion
  ) => {
    setQuestion({ ...question, [field]: e.target.value });
  };

  const handleLangConfigChange = (
    index: number,
    field: keyof LanguageConfig,
    value: string
  ) => {
    const updatedConfigs = question.languageConfigs.map((config, i) =>
      i === index ? { ...config, [field]: value } : config
    );
    setQuestion({ ...question, languageConfigs: updatedConfigs });
  };

  const addLanguageConfig = () => {
    setQuestion({
      ...question,
      languageConfigs: [
        ...question.languageConfigs,
        { language: "", signature: "", functionName: "" },
      ],
    });
    toast.success("Language configuration added");
  };

  const removeLanguageConfig = (index: number) => {
    if (question.languageConfigs.length > 1) {
      const updatedConfigs = question.languageConfigs.filter(
        (_, i) => i !== index
      );
      setQuestion({ ...question, languageConfigs: updatedConfigs });
      toast.info("Language configuration removed");
    } else {
      toast.error("At least one language configuration is required");
    }
  };

  const handleTestCaseChange = (
    index: number,
    field: keyof TestCase,
    value: string | boolean
  ) => {
    const testCases = question.testCases.map((test, i) =>
      i === index ? { ...test, [field]: value } : test
    );
    setQuestion({ ...question, testCases });
  };

  const addTestCase = () => {
    setQuestion({
      ...question,
      testCases: [
        ...question.testCases,
        { input: "", expectedOutput: "", isHidden: false },
      ],
    });
    toast.success("Test case added");
  };

  const removeTestCase = (index: number) => {
    if (question.testCases.length > 1) {
      const testCases = question.testCases.filter((_, i) => i !== index);
      setQuestion({ ...question, testCases });
      toast.info("Test case removed");
    } else {
      toast.error("At least one test case is required");
    }
  };

  const safeJsonParse = (jsonString: string): any => {
    try {
      if (
        jsonString.trim().startsWith("{") ||
        jsonString.trim().startsWith("[")
      ) {
        return JSON.parse(jsonString);
      }

      return { value: jsonString };
    } catch (error) {
      const trimmed = jsonString.trim();

      if (!isNaN(Number(trimmed))) {
        return { value: Number(trimmed) };
      }

      if (
        trimmed.toLowerCase() === "true" ||
        trimmed.toLowerCase() === "false"
      ) {
        return { value: trimmed.toLowerCase() === "true" };
      }

      return { value: trimmed };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (
        !question.key.trim() ||
        !question.title.trim() ||
        !question.description.trim()
      ) {
        toast.error("Please fill in all required fields");
        setIsSubmitting(false);
        return;
      }

      // Validate language configurations
      for (const config of question.languageConfigs) {
        if (!config.language || !config.signature || !config.functionName) {
          toast.error("Please fill in all language configuration fields");
          setIsSubmitting(false);
          return;
        }
      }

      // Validate test cases
      for (const testCase of question.testCases) {
        if (!testCase.input.trim() || !testCase.expectedOutput.trim()) {
          toast.error("Please fill in all test case fields");
          setIsSubmitting(false);
          return;
        }
      }

      // Transform data to match API format with safe JSON parsing
      const submissionData = {
        key: question.key,
        title: question.title,
        description: question.description,
        difficulty: question.difficulty,
        userId: question.createdBy,
        languageConfigs: question.languageConfigs,
        testCases: question.testCases.map((testCase) => ({
          input: safeJsonParse(testCase.input),
          expectedOutput: safeJsonParse(testCase.expectedOutput),
          isHidden: testCase.isHidden,
        })),
      };

      console.log("Submitting data:", submissionData);

      const response = await fetch("http://localhost:3000/add-problem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionData),
      });

      const responseData = await response.json();

      if (response.ok) {
        toast.success("Question added successfully!");
        // Reset form
        setQuestion({
          key: "",
          title: "",
          description: "",
          difficulty: "medium",
          createdBy: user?.id || "",
          languageConfigs: [{ language: "", signature: "", functionName: "" }],
          testCases: [{ input: "", expectedOutput: "", isHidden: false }],
        });
      } else {
        throw new Error(responseData.message || "Failed to add question");
      }
    } catch (error) {
      console.error("Error submitting question:", error);
      toast.error(
        `Error adding question: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const languageOptions = [
    { value: "python", label: "Python" },
    { value: "javascript", label: "JavaScript" },
    { value: "java", label: "Java" },
    { value: "c", label: "C" },
    { value: "cpp", label: "C++" },
    { value: "csharp", label: "C#" },
  ];

  return (
    <div className="add-coding-container">
      <div className="form-header">
        <h1>Add Coding Question</h1>
        <p>Create a new coding challenge for your assessment</p>
      </div>

      <form className="coding-form" onSubmit={handleSubmit}>
        <div className="form-section">
          <h3>Problem Details</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Question Key *</label>
              <input
                type="text"
                value={question.key}
                onChange={(e) => handleChange(e, "key")}
                placeholder="e.g., longest_increasing_subsequence"
                required
              />
              <small>Unique identifier for the question (snake_case)</small>
            </div>

            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                value={question.title}
                onChange={(e) => handleChange(e, "title")}
                placeholder="e.g., Longest Increasing Subsequence"
                required
              />
            </div>

            <div className="form-group full-width">
              <label>Difficulty *</label>
              <select
                value={question.difficulty}
                onChange={(e) => handleChange(e, "difficulty")}
                required
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label>Description *</label>
              <textarea
                value={question.description}
                onChange={(e) => handleChange(e, "description")}
                placeholder="Describe the problem statement, constraints, and examples..."
                rows={6}
                required
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="section-header">
            <h3>Language Configurations</h3>
            <button
              type="button"
              onClick={addLanguageConfig}
              className="add-button"
            >
              + Add Language
            </button>
          </div>

          <div className="configs-grid">
            {question.languageConfigs.map((config, i) => (
              <div key={i} className="config-card">
                <div className="card-header">
                  <h4>Language Configuration {i + 1}</h4>
                  {question.languageConfigs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLanguageConfig(i)}
                      className="remove-button"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Language *</label>
                    <select
                      value={config.language}
                      onChange={(e) =>
                        handleLangConfigChange(i, "language", e.target.value)
                      }
                      required
                    >
                      <option value="">Select Language</option>
                      {languageOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Function Name *</label>
                    <input
                      type="text"
                      placeholder="e.g., lengthOfLIS"
                      value={config.functionName}
                      onChange={(e) =>
                        handleLangConfigChange(
                          i,
                          "functionName",
                          e.target.value
                        )
                      }
                      required
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Function Signature *</label>
                    <input
                      type="text"
                      placeholder="e.g., def lengthOfLIS(nums: List[int]) -> int:"
                      value={config.signature}
                      onChange={(e) =>
                        handleLangConfigChange(i, "signature", e.target.value)
                      }
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-section">
          <div className="section-header">
            <h3>Test Cases</h3>
            <button type="button" onClick={addTestCase} className="add-button">
              + Add Test Case
            </button>
          </div>

          <div className="test-cases-grid">
            {question.testCases.map((test, i) => (
              <div key={i} className="test-case-card">
                <div className="card-header">
                  <h4>Test Case {i + 1}</h4>
                  {question.testCases.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTestCase(i)}
                      className="remove-button"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Input (JSON) *</label>
                    <input
                      type="text"
                      placeholder='e.g., {"nums": [10,9,2,5,3,7,101,18]} or simply "123"'
                      value={test.input}
                      onChange={(e) =>
                        handleTestCaseChange(i, "input", e.target.value)
                      }
                      required
                    />
                    <small>Enter JSON object or simple value</small>
                  </div>

                  <div className="form-group">
                    <label>Expected Output (JSON) *</label>
                    <input
                      type="text"
                      placeholder='e.g., {"result": 4} or simply "true"'
                      value={test.expectedOutput}
                      onChange={(e) =>
                        handleTestCaseChange(
                          i,
                          "expectedOutput",
                          e.target.value
                        )
                      }
                      required
                    />
                    <small>Enter JSON object or simple value</small>
                  </div>

                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={test.isHidden}
                        onChange={(e) =>
                          handleTestCaseChange(i, "isHidden", e.target.checked)
                        }
                      />
                      Hidden Test Case
                    </label>
                    <small>
                      Hidden cases are not visible to users during practice
                    </small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="submit-btn" disabled={isSubmitting}>
            {isSubmitting ? "Adding Question..." : "Add Coding Question"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddCodingQuestions;
