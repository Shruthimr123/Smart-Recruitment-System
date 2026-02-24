import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import "./css/CodingResult.css";

interface TestResult {
  input: any;
  actual: any;
  expected: any;
  passed: boolean;
  stderr?: string;
}

interface Applicant {
  id: string;
  name: string;
  email: string;
}

interface Problem {
  key: string;
  title: string;
  description: string;
  difficulty: string;
  functionSignature?: string;
  functionName?: string;
  testCases?: any[];
}

interface CodingResult {
  submissionId: string;
  status: string;
  code: string;
  output: string;
  testResults: TestResult[];
  applicant: Applicant;
  problem: Problem;
}

const CodingResultPage = () => {
  const { applicantId } = useParams<{ applicantId: string }>();

  const [codingResults, setCodingResults] = useState<CodingResult[] | null>(null);
  const [assignedProblem, setAssignedProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
  };

  useEffect(() => {
    if (!applicantId) {
      setLoading(false);
      setError("Invalid applicant ID.");
      return;
    }

    const fetchCodingData = async () => {
      try {
        setLoading(true);
        setError(null);

        try {
          const res = await axiosInstance.get(
            `/applicants/results/coding/${applicantId}`
          );

          if (res.data?.data?.length > 0) {
            setCodingResults(res.data.data);
            return;
          }
        } catch (submissionError) {
          console.log("No submissions found. Trying assigned problem...");
        }

        // Fetch assigned problem if no submissions
        try {
          const problemRes = await axiosInstance.get(
            `/applicant-questions/assigned-problem/${applicantId}`
          );

          if (problemRes.data?.data) {
            setAssignedProblem(problemRes.data.data);
          } else {
            setError(
              "No coding problem assigned. Candidate did not attend coding round."
            );
          }
        } catch {
          setError(
            "No coding results found. Candidate did not attend coding round."
          );
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load coding data.");
      } finally {
        setLoading(false);
      }
    };

    fetchCodingData();
  }, [applicantId]);


  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case "easy":
        return "#10b981";
      case "medium":
        return "#f59e0b";
      case "hard":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  if (loading) {
    return (
      <div className="coding-result-container">
        <div className="coding-result-loading">
          <div className="loading-spinner"></div>
          <p>Loading coding results...</p>
        </div>
      </div>
    );
  }

  if (error && !assignedProblem && !codingResults) {
    return (
      <div className="coding-result-container">
        <div className="coding-result-error">
          <h3>No coding results to display</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (assignedProblem) {
    return (
      <div className="coding-result-container">
        <div className="coding-result-header">
          <h1>Coding Assessment - Not Submitted</h1>
        </div>

        <div className="coding-result-card">
          <div className="coding-card-header">
            <div>
              <h2>{assignedProblem.title}</h2>
              <span
                className="difficulty-badge"
                style={{
                  backgroundColor: getDifficultyColor(
                    assignedProblem.difficulty
                  ),
                }}
              >
                {assignedProblem.difficulty}
              </span>
            </div>
            <div className="status-badge" style={{ background: "#f59e0b" }}>
              Not Submitted
            </div>
          </div>

          <div className="problem-description">
            {assignedProblem.description}
          </div>

          {assignedProblem.functionSignature && (
            <pre className="code-block">
              <code>{assignedProblem.functionSignature}</code>
            </pre>
          )}

          {assignedProblem.testCases?.filter((t) => !t.isHidden).map(
            (tc, index) => (
              <div key={index} className="test-case-card test-pending">
                <h4>Sample Test Case {index + 1}</h4>
                <p>
                  <strong>Input:</strong>{" "}
                  <code>{formatValue(tc.input)}</code>
                </p>
                <p>
                  <strong>Expected:</strong>{" "}
                  <code>{formatValue(tc.expectedOutput)}</code>
                </p>
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  if (!codingResults || codingResults.length === 0) {
    return (
      <div className="coding-result-container">
        <h3>No Coding Submissions Found</h3>
      </div>
    );
  }

  return (
  <div className="coding-result-container">
    {codingResults.map((result) => (
      <div key={result.submissionId} className="info-section">
        <h2>Coding Submission Details</h2>

        <div className="coding-details">
          {/* Header */}
          <div className="coding-header">
            <div className="coding-info">
              <span className="coding-problem">
                Problem: {result.problem?.title}
              </span>

              <span
                className={`coding-status ${
                  result.status === "Passed" ||
                  result.status === "Accepted"
                    ? "status-pass"
                    : "status-fail"
                }`}
              >
                {result.status}
              </span>
            </div>

            <div className="coding-date">
              Submitted:{" "}
              {result ? new Date().toLocaleString() : "N/A"}
            </div>
          </div>

          {/* Code */}
          <div className="code-section">
            <h4>Code Submitted:</h4>
            <pre className="code-block">{result.code}</pre>
          </div>

          {/* Output */}
          {result.output && (
            <div className="output-section">
              <h4>Output:</h4>
              <pre className="output-block">{result.output}</pre>
            </div>
          )}

          {/* Test Results */}
          {result.testResults &&
            result.testResults.length > 0 && (
              <div className="test-results-section">
                <h4>Test Results:</h4>
                <div className="test-results-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Test Case</th>
                        <th>Input</th>
                        <th>Expected</th>
                        <th>Actual</th>
                        <th>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.testResults.map((test, index) => (
                        <tr key={index}>
                          <td>Test {index + 1}</td>

                          <td className="test-input">
                            {test.input &&
                              Object.entries(test.input).map(
                                ([key, value]) => (
                                  <div key={key}>
                                    <strong>{key}</strong>:{" "}
                                    {Array.isArray(value)
                                      ? value.join(", ")
                                      : value == null
                                      ? "N/A"
                                      : String(value)}
                                  </div>
                                )
                              )}
                          </td>

                          <td className="test-expected-">
                            {formatValue(test.expected)}
                          </td>

                          <td className="test-actual-">
                            {formatValue(test.actual)}
                          </td>

                          <td>
                            <span
                              className={`test-result ${
                                test.passed
                                  ? "test-pass"
                                  : "test-fail"
                              }`}
                            >
                              {test.passed ? "PASS" : "FAIL"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
        </div>
      </div>
    ))}
  </div>
);
};

export default CodingResultPage;