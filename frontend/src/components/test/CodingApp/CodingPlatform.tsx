import Editor from "@monaco-editor/react";
import React, { useEffect, useState } from "react";
import axiosInstance from "../../../api/axiosInstance";
import axiosProctorInstance from "../../../api/axiosProctorInstance";
import "./CodingPlatform.css";

interface TestCase {
  input: any;
  expectedOutput: any;
  isHidden: boolean;
}

interface QuestionResponse {
  status: string;
  problemKey: string;
  title: string;
  description: string;
  difficulty: string;
  functionSignature: string;
  functionName: string;
  testCases: TestCase[];
}

interface TestResult {
  input: any;
  expected: any;
  actual: any;
  passed: boolean;
  stderr: string;
}

interface RunResponse {
  status: string;
  total: number;
  passed: number;
  output: string;
  testResults: TestResult[];
  error?: string;
}

interface Props {
  handleFinalSubmit: () => void;
  autoSubmit?: boolean;
}

const CODE_LANGUAGE_OPTIONS = [
  { value: "ade9c9b9-b772-459e-9e98-d5f591f83826", label: "Python" },
  { value: "af451228-e9e6-404f-97ac-070e89e23ff9", label: "JavaScript" },
  { value: "58367b22-5147-4543-812c-48177a1f5feb", label: "Java" },
  { value: "6d823c70-4ed1-4c6f-8cd6-a188d820881d", label: "C#" },
  { value: "793dc2e1-24f1-4690-8aec-39c90c938812", label: "Cpp" },
];

const CODE_LANGUAGE_MAP: Record<string, string> = {
  "ade9c9b9-b772-459e-9e98-d5f591f83826": "python",
  "af451228-e9e6-404f-97ac-070e89e23ff9": "javascript",
  "58367b22-5147-4543-812c-48177a1f5feb": "java",
  "6d823c70-4ed1-4c6f-8cd6-a188d820881d": "csharp",
  "793dc2e1-24f1-4690-8aec-39c90c938812": "cpp",
};

const CodePlatform: React.FC<Props> = ({ handleFinalSubmit, autoSubmit }) => {
  const [question, setQuestion] = useState<QuestionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [runResult, setRunResult] = useState<RunResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string>("");
  const [language, setLanguage] = useState(CODE_LANGUAGE_OPTIONS[0].value);

  const applicantId = localStorage.getItem("applicantId");
  const attemptId = localStorage.getItem("attemptId");
  const selectedLanguage = CODE_LANGUAGE_MAP[language];

  const formatTestCaseInput = (input: any): string => {
    if (input === null || input === undefined) return "";
    if (Array.isArray(input)) {
      if (input.length > 0 && Array.isArray(input[0])) {
        return `[${input.map((row) => `[${row.join(", ")}]`).join(", ")}]`;
      }
      return `[${input.join(", ")}]`;
    }
    if (typeof input === "object") {
      return Object.entries(input)
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            if (value.length > 0 && Array.isArray(value[0])) {
              return `${key} = [[${value
                .map((row) => row.join(", "))
                .join("], [")}]]`;
            }
            return `${key} = [${value.join(", ")}]`;
          } else if (typeof value === "object" && value !== null) {
            return `${key} = ${formatTestCaseInput(value)}`;
          } else {
            return `${key} = ${value}`;
          }
        })
        .join(", ");
    }
    return String(input);
  };

  const formatTestCaseOutput = (output: any): string => {
    if (output === null || output === undefined) return "";
    if (Array.isArray(output)) {
      if (output.length > 0 && Array.isArray(output[0])) {
        return `[[${output.map((row) => row.join(", ")).join("], [")}]]`;
      }
      return `[${output.join(", ")}]`;
    }
    if (typeof output === "object") {
      const values = Object.values(output);
      if (values.length === 1) return formatTestCaseOutput(values[0]);
      return `{ ${Object.entries(output)
        .map(([k, v]) => `${k}: ${formatTestCaseOutput(v)}`)
        .join(", ")} }`;
    }
    return String(output);
  };

  const getCodeTemplate = (data: QuestionResponse, lang: string): string => {
    const langKey = CODE_LANGUAGE_MAP[lang];
    const templates: Record<string, string> = {
      python: `${data.functionSignature}\n    # Write your code here\n    pass`,
      javascript: `${data.functionSignature} {\n    // Write your code here\n}`,
      java: `${data.functionSignature} {\n    // Write your code here\n}`,
      csharp: `${data.functionSignature}\n{\n    // Write your code here\n}`,
      cpp: `${data.functionSignature}\n{\n    // Write your code here\n}`,
    };
    return templates[langKey] || `${data.functionSignature}\n{\n    // Write your code here\n}`;
  };

  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await axiosInstance.get(
          `/applicant-questions/start/${applicantId}/${attemptId}/${language}`
        );
        const data = res.data;
        setQuestion(data);
        setCode(getCodeTemplate(data, language));
      } catch (error: any) {
        console.error("Error fetching question:", error);
        setError(`Failed to load question: ${error.response?.data?.message || error.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestion();
  }, [language, applicantId, attemptId]);

  const handleRun = async () => {
    if (!question || !code.trim()) return;
    setRunning(true);
    setError("");
    setRunResult(null);

    try {
      const res = await axiosInstance.post("/validate", {
        problemKey: question.problemKey,
        language: selectedLanguage,
        userCode: code,
      });
      if (res.data.error) {
        setError(res.data.error);
      } else {
        setRunResult(res.data);
      }
    } catch (err: any) {
      console.error("Error running code:", err);
      setError(`Execution failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    if (autoSubmit && !submitting) handleAutoSubmit();
  }, [autoSubmit]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAutoSubmit = async () => {
    if (!question) return;
    setSubmitting(true);
    try {
      await axiosInstance.post("/validate", {
        problemKey: question.problemKey,
        language: selectedLanguage,
        userCode: code,
      });
      await axiosInstance.post("/submit", {
        applicantId,
        problemKey: question.problemKey,
        language: selectedLanguage,
        userCode: code,
      });
      await handleFinalSubmit();
    } catch (err: any) {
      console.error("❌ Auto submit failed:", err);
      setError(`Auto submit failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!question) return;
    if (!window.confirm("Are you sure you want to submit your solution? This action cannot be undone.")) {
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await axiosInstance.post("/submit", {
        applicantId,
        problemKey: question.problemKey,
        language: selectedLanguage,
        userCode: code,
      });
      await handleFinalSubmit();
      await Promise.allSettled([
        axiosProctorInstance.post("/pause-detection"),
        axiosProctorInstance.post("/cleanup"),
      ]);
    } catch (err: any) {
      console.error("Error submitting code:", err);
      setError(`Submit failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case "easy":
        return "#10a37f";
      case "medium":
        return "#f39c12";
      case "hard":
        return "#e74c3c";
      default:
        return "#6c757d";
    }
  };

  const visibleTestCases = question?.testCases.filter((t) => !t.isHidden) || [];

  if (loading) {
    return (
      <div className="code-platform-loading">
        <div className="code-platform-spinner"></div>
        <p>Loading question...</p>
      </div>
    );
  }

  if (error && !question) {
    return (
      <div className="code-platform-error">
        <div className="code-platform-error-icon">⚠️</div>
        <h3>Error Loading Question</h3>
        <p>{error}</p>
        <button className="code-platform-retry-btn" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="code-platform-container">
      {/* LEFT PANEL */}
      <div className="code-platform-left">
        {question && (
          <>
            <div className="code-platform-header">
              <h1 className="code-platform-title">{question.title}</h1>
              <span
                className="code-platform-difficulty"
                style={{ backgroundColor: getDifficultyColor(question.difficulty) }}
              >
                {question.difficulty}
              </span>
            </div>

            <div className="code-platform-description">
              <p>{question.description}</p>
            </div>

            {visibleTestCases.length > 0 && (
              <div className="code-platform-testcases">
                <h3>Test Cases</h3>
                <div className="code-platform-testcases-grid">
                  {visibleTestCases.map((test, idx) => (
                    <div key={idx} className="code-platform-testcase">
                      <h4>Test Case {idx + 1}</h4>
                      <div className="code-platform-testcase-content">
                        <div className="code-platform-testcase-field">
                          <label>Input:</label>
                          <pre>{formatTestCaseInput(test.input)}</pre>
                        </div>
                        <div className="code-platform-testcase-field">
                          <label>Expected Output:</label>
                          <pre>{formatTestCaseOutput(test.expectedOutput)}</pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="code-platform-notes">
              <h3>📝 Important Notes</h3>
              <ul>
                <li>Write your code inside the provided function signature</li>
                <li>Your function must return the result; avoid print statements</li>
                <li>Ensure your return type matches the expected output type</li>
                <li>For boolean functions, return true/false, not 1/0</li>
                <li>Avoid using built-in methods unless explicitly allowed</li>
                <li>Test your code thoroughly before submitting</li>
              </ul>
            </div>
          </>
        )}
      </div>

      {/* RIGHT PANEL */}
      <div className="code-platform-right">
        <div className="code-platform-toolbar">
          <div className="code-platform-language">
            <label htmlFor="code-language">Programming Language:</label>
            <select
              id="code-language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={running || submitting}
            >
              {CODE_LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="code-platform-editor-wrapper">
          <Editor
            height="400px"
            language={selectedLanguage}
            value={code}
            theme="vs-dark"
            onChange={(val) => setCode(val || "")}
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: "on",
              lineNumbers: "on",
              folding: true,
              tabSize: 2,
              insertSpaces: true,
            }}
          />
        </div>

        <div className="code-platform-actions">
          <button
            className="code-platform-run-btn"
            onClick={handleRun}
            disabled={running || submitting || !code.trim()}
          >
            {running ? (
              <>
                <span className="code-platform-btn-spinner"></span> Running...
              </>
            ) : (
              "Run Code"
            )}
          </button>
          <button
            className="code-platform-submit-btn"
            onClick={handleSubmit}
            disabled={submitting || running}
          >
            {submitting ? (
              <>
                <span className="code-platform-btn-spinner"></span> Submitting...
              </>
            ) : (
              "Submit Solution"
            )}
          </button>
        </div>

        {error && (
          <div className="code-platform-error-banner">
            <div className="code-platform-error-header">
              <span className="code-platform-error-icon">⚠️</span>
              <strong>Error</strong>
            </div>
            <pre className="code-platform-error-msg">{error}</pre>
          </div>
        )}

        {runResult && !running && !error && (
          <div className="code-platform-results">
            <div className="code-platform-results-header">
              <h3>Test Results</h3>
              <div
                className={`code-platform-summary ${runResult.status.toLowerCase()}`}
              >
                <span className="code-platform-summary-text">
                  {runResult.passed}/{runResult.total} Tests Passed
                </span>
                <span className="code-platform-status">{runResult.status}</span>
              </div>
            </div>

            <div className="code-platform-results-list">
              {runResult.testResults
                .map((tr, index) => {
                  const testCase = question?.testCases[index];
                  if (!testCase || testCase.isHidden) return null; // ✅ Hide hidden testcases
                  return (
                    <div
                      key={index}
                      className={`code-platform-result-item ${
                        tr.passed
                          ? "code-platform-passed"
                          : "code-platform-failed"
                      }`}
                    >
                      <div className="code-platform-result-header">
                        <span className="code-platform-result-name">
                          Test Case {index + 1}
                        </span>
                        <span className="code-platform-result-status">
                          {tr.passed ? "✅ Passed" : "❌ Failed"}
                        </span>
                      </div>

                      <div className="code-platform-result-details">
                        <div className="code-platform-detail-field">
                          <label>Input:</label>
                          <code>
                            {formatTestCaseInput(tr.input) || "No input"}
                          </code>
                        </div>
                        <div className="code-platform-detail-field">
                          <label>Expected:</label>
                          <code className="code-platform-expected">
                            {formatTestCaseOutput(tr.expected) ||
                              "No expected output"}
                          </code>
                        </div>
                        <div className="code-platform-detail-field">
                          <label>Actual:</label>
                          <code
                            className={
                              tr.passed
                                ? "code-platform-actual-passed"
                                : "code-platform-actual-failed"
                            }
                          >
                            {formatTestCaseOutput(tr.actual) ||
                              "No output produced"}
                          </code>
                        </div>

                        {tr.stderr && (
                          <div className="code-platform-detail-field code-platform-error-field">
                            <label>Error:</label>
                            <pre className="code-platform-stderr">
                              {tr.stderr}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
                .filter(Boolean)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodePlatform;
