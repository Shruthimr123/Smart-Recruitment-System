import { useQuery } from "@tanstack/react-query";
import { Loader2, XCircle } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import "../components/css/ApplicantDetails.css";

const fetchApplicantData = async (id: string) => {
  const { data } = await axiosInstance.get("/dashboard");
  return data.data.find((candidate: any) => candidate.id === id);
};

const ApplicantDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    data: candidate,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["dashboard", id],
    queryFn: () => fetchApplicantData(id as string),
    enabled: !!id,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="applicant-loading">
        <div className="loading-spinner">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="applicant-error">
        <div className="error-content">
          <XCircle className="h-8 w-8 text-red-600" />
          <button onClick={() => navigate("/results")} className="back-button">
            Back to Results
          </button>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="applicant-error">
        <div className="error-content">
          <h3>Applicant not found</h3>
          <p>The requested applicant could not be found.</p>
          <button onClick={() => navigate("/results")} className="back-button">
            Back to Results
          </button>
        </div>
      </div>
    );
  }

  // Calculate metrics using same logic as Dashboard
  const currentTime = new Date();
  const testAttempt = candidate.test_attempts?.[0];
  const mcqScore = testAttempt?.mcq_score || 0;
  const totalMcqQuestions = 30;

  // Test status logic
  let testStatus = "pending";
  if (testAttempt) {
    const token = testAttempt?.test_access_tokens?.[0];
    const isExpired =
      token &&
      new Date(token.expires_at) < currentTime &&
      !testAttempt.is_submitted;
    const isAttemptsExceeded =
      testAttempt.attempt_count >= 3 && !testAttempt.is_submitted;

    if (isAttemptsExceeded) {
      testStatus = "attempts-exceeded";
    } else if (isExpired) {
      testStatus = "expired";
    } else if (testAttempt.test_status === "attending") {
      testStatus = "attending";
    } else if (testAttempt.test_status === "completed") {
      testStatus = "completed";
    }
  }

  // Coding results
  const codingSubmission = candidate.submissions[0];
  const passedTests =
    codingSubmission?.testResults?.filter((tr: any) => tr.passed).length || 0;
  const totalTests = codingSubmission?.testResults?.length || 0;
  const codingStatus =
    candidate.submissions.length > 0
      ? candidate.submissions.some((sub: any) => sub.status === "Passed")
        ? "Passed"
        : "Failed"
      : "Not Attempted";

  // Selection status
  const isSelected =
    mcqScore > 20 &&
    candidate.submissions.some((sub: any) => sub.status === "Passed");

  // Format dates
  const formatDate = (dateString: any) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="applicant-details-container">
      <button onClick={() => navigate("/results")} className="back-button">
        ← Back to Results
      </button>
      {/* Header */}
      <div className="applicant-header">
        <div className="header-content">
          <div className="applicant-title">
            <h1>{candidate.name}</h1>
            <div className="header-actions">
              <button
                onClick={() =>
                  window.open(
                    `http://localhost:3000/dashboard/report/${candidate.id}`
                  )
                }
                className="download-report-button"
              >
                Download Report
              </button>
              <div
                className={`selection-status ${isSelected ? "selected" : "not-selected"
                  }`}
              >
                {isSelected ? "SELECTED" : "NOT SELECTED"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="applicant-content">
        <div className="info-section">
          <h2>Personal Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Full Name:</label>
              <span className="info-value">{candidate.name}</span>
            </div>
            <div className="info-item">
              <label>Email:</label>
              <span className="info-value">{candidate.email}</span>
            </div>
            <div className="info-item">
              <label>Phone:</label>
              <span className="info-value">{candidate.phone}</span>
            </div>
            <div className="info-item">
              <label>Primary Skill:</label>
              <span className="info-value skill-badge">
                {candidate.primary_skill?.name || "N/A"}
              </span>
            </div>
            <div className="info-item">
              <label>Secondary Skill:</label>
              <span className="info-value">
                {candidate.secondary_skill?.name || "N/A"}
              </span>
            </div>
            <div className="info-item">
              <label>Experience Level:</label>
              <span className="info-value experience-badge">
                {candidate.experience_level?.name || "N/A"}
                {candidate.experience_level && (
                  <span className="experience-years">
                    ({candidate.experience_level.min_year}-
                    {candidate.experience_level.max_year} years)
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Test Information */}
        {testAttempt && (
          <div className="info-section">
            <h2>Test Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <label>Job Title:</label>
                <span className="info-value">
                  {testAttempt.job?.title || "N/A"}
                </span>
              </div>
              <div className="info-item">
                <label>Client Name:</label>
                <span className="info-value">
                  {testAttempt.job?.clientName || "N/A"}
                </span>
              </div>
              <div className="info-item">
                <label>Test Status:</label>
                <span
                  className={`status-badge ${testStatus === "completed"
                      ? "status-complete"
                      : testStatus === "attending"
                        ? "status-progress"
                        : testStatus === "attempts-exceeded"
                          ? "status-attempts-exceeded"
                          : testStatus === "expired"
                            ? "status-expired"
                            : "status-pending"
                    }`}
                >
                  {testStatus === "attempts-exceeded"
                    ? "attempts exceeded"
                    : testStatus}
                </span>
              </div>
              <div className="info-item">
                <label>Attempt Count:</label>
                <span className="info-value">
                  {testAttempt.attempt_count}/3
                </span>
              </div>
              <div className="info-item">
                <label>Schedule Start:</label>
                <span className="info-value">
                  {formatDate(testAttempt.schedule_start)}
                </span>
              </div>
              <div className="info-item">
                <label>Schedule End:</label>
                <span className="info-value">
                  {formatDate(testAttempt.schedule_end)}
                </span>
              </div>
              <div className="info-item">
                <label>Started At:</label>
                <span className="info-value">
                  {formatDate(testAttempt.actual_applicant_answered_at)}
                </span>
              </div>
              <div className="info-item">
                <label>Completed At:</label>
                <span className="info-value">
                  {formatDate(testAttempt.applicant_completed_at)}
                </span>
              </div>
              <div className="info-item">
                <label>Total Duration:</label>
                <span className="info-value">
                  {testAttempt.total_duration_minutes} minutes
                </span>
              </div>
              <div className="info-item">
                <label>MCQ Duration:</label>
                <span className="info-value">
                  {testAttempt.mcq_duration_minutes} minutes
                </span>
              </div>
              <div className="info-item">
                <label>Coding Duration:</label>
                <span className="info-value">
                  {testAttempt.coding_duration_minutes} minutes
                </span>
              </div>
              <div className="info-item">
                <label>Is Submitted:</label>
                <span
                  className={`info-value ${testAttempt.is_submitted ? "submitted" : "not-submitted"
                    }`}
                >
                  {testAttempt.is_submitted ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Performance Summary */}
        <div className="info-section">
          <h2>Performance Summary</h2>
          <div className="performance-grid">
            <div className="performance-card">
              <div className="performance-title">MCQ Score</div>
              <div
                className={`performance-value ${mcqScore > 20 ? "score-pass" : "score-fail"
                  }`}
              >
                {mcqScore}/{totalMcqQuestions}
              </div>
              <div className="performance-subtitle">
                {mcqScore > 20 ? "Passed" : "Failed"} (Threshold: &gt; 20)
              </div>
            </div>
            <div className="performance-card">
              <div className="performance-title">Coding Tests</div>
              <div
                className={`performance-value ${passedTests > 0
                    ? "score-pass"
                    : totalTests > 0
                      ? "score-fail"
                      : "score-pending"
                  }`}
              >
                {passedTests}/{totalTests}
              </div>
              <div className="performance-subtitle">Status: {codingStatus}</div>
            </div>
            <div className="performance-card">
              <div className="performance-title">Overall Result</div>
              <div
                className={`performance-value ${isSelected ? "score-pass" : "score-fail"
                  }`}
              >
                {isSelected ? "SELECTED" : "NOT SELECTED"}
              </div>
              <div className="performance-subtitle">
                MCQ &gt; 20 & Coding Passed
              </div>
            </div>
          </div>
        </div>

        {/* Malpractice Information */}
        {candidate.malpractice && candidate.malpractice.length > 0 && (
          <div className="info-section">
            <h2>Proctoring Information</h2>
            <div className="malpractice-summary">
              <div className="malpractice-count">
                <span className="count-number">
                  {candidate.malpractice.length}
                </span>
                <span className="count-label">Images Captured</span>
              </div>
              <Link
                to={`/results/malpractice/${candidate.id}`}
                className="view-images-button"
              >
                View All Images
              </Link>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="action-section">
          <div className="action-buttons">
            {(() => {
              const mcqMode = candidate.test_attempts?.[0]?.mcq_mode || "manual";

              return (
                <Link
                  to={`/results/mcq/${mcqMode}/${candidate.id}`}
                  className="action-button mcq-button"
                >
                  View MCQ Details
                </Link>
              );
            })()}
            <Link
              to={`/results/coding/${candidate.id}`}
              className="action-button coding-button"
            >
              View Coding Details
            </Link>
            {candidate.malpractice && candidate.malpractice.length > 0 && (
              <Link
                to={`/results/malpractice/${candidate.id}`}
                className="action-button images-button"
              >
                View Proctoring Images
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicantDetails;

