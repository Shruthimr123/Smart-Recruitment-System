import { useQuery } from "@tanstack/react-query";
import { Loader2, XCircle, Calendar } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import "./css/Results.css";
import { useLocation } from "react-router-dom";
const fetchDashboardData = async () => {
  const { data } = await axiosInstance.get("/dashboard");
  return data;
};

// Define candidate interface based on your data structure
interface Candidate {
  id: string;
  name: string;
  email: string;
  created_at?: string;
  primary_skill?: {
    name: string;
  };
  experience_level?: {
    name: string;
  };
  test_attempts: Array<{
    mcq_score?: number;
    attempt_count: number;
    is_submitted: boolean;
    test_status: string;
    created_at?: string;
    mcq_mode?: string;
    test_access_tokens: Array<{
      expires_at: string;
    }>;
  }>;
  submissions: Array<{
    status: string;
    testResults?: Array<{
      passed: boolean;
    }>;
  }>;
}

const Results = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState("name");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const location = useLocation();
  const [filterStatus, setFilterStatus] = useState(
    location.state?.filterStatus || "all"
  );

  const { data, error, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboardData,
    refetchInterval: 30000,
  });

  const filteredAndSortedCandidates = useMemo(() => {
    if (!data?.data) return [];

    const candidates: Candidate[] = data.data;
    const currentTime = new Date();

    const isTestExpired = (candidate: Candidate) => {
      const token = candidate.test_attempts[0]?.test_access_tokens[0];
      const testAttempt = candidate.test_attempts?.[0];
      if (!token || !testAttempt) return false;
      const expiresAt = new Date(token.expires_at);
      return expiresAt < currentTime && testAttempt.is_submitted === false;
    };

    const isAttemptsExceeded = (candidate: Candidate) => {
      const testAttempt = candidate.test_attempts?.[0];
      if (!testAttempt) return false;
      return (
        testAttempt.attempt_count >= 3 && testAttempt.is_submitted === false
      );
    };

    const getTestStatus = (candidate: Candidate) => {
      const testAttempt = candidate.test_attempts?.[0];
      if (!testAttempt) return "pending";

      if (isAttemptsExceeded(candidate)) {
        return "attempts-exceeded";
      } else if (isTestExpired(candidate)) {
        return "expired";
      } else if (
        testAttempt.test_status === "pending" &&
        testAttempt.is_submitted === false
      ) {
        return "pending";
      } else if (testAttempt.test_status === "attending") {
        return "attending";
      } else if (testAttempt.test_status === "completed") {
        return "completed";
      } else {
        return "pending";
      }
    };

    const isSelected = (candidate: Candidate) => {
      const mcqScore = candidate.test_attempts[0]?.mcq_score || 0;
      const hasPassedCoding = candidate.submissions.some(
        (sub: { status: string }) => sub.status === "Passed"
      );
      return mcqScore > 20 && hasPassedCoding;
    };

    let filtered = candidates;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      filtered = candidates.filter((candidate: Candidate) => {
        const candidateDate = candidate.created_at
          ? new Date(candidate.created_at)
          : candidate.test_attempts[0]?.created_at
            ? new Date(candidate.test_attempts[0].created_at)
            : new Date();
        return candidateDate >= start && candidateDate <= end;
      });
    }

    // Filter by search term
    filtered = filtered.filter(
      (candidate: Candidate) =>
        candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Filter by status
    if (filterStatus !== "all") {
      filtered = filtered.filter((candidate: Candidate) => {
        switch (filterStatus) {
          case "selected":
            return isSelected(candidate);
          case "not-selected":
            return !isSelected(candidate);
          case "completed":
            return getTestStatus(candidate) === "completed";
          case "pending":
            return getTestStatus(candidate) === "pending";
          case "expired":
            return getTestStatus(candidate) === "expired";
          case "attempts-exceeded":
            return getTestStatus(candidate) === "attempts-exceeded";
          case "attending":
            return getTestStatus(candidate) === "attending";
          default:
            return true;
        }
      });
    }

    // Sort candidates
    return filtered.sort((a: Candidate, b: Candidate) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name);
        case "email":
          return a.email.localeCompare(b.email);
        case "mcq":
          const aMcq = a.test_attempts[0]?.mcq_score || 0;
          const bMcq = b.test_attempts[0]?.mcq_score || 0;
          return bMcq - aMcq;
        case "coding":
          const aPassedTests =
            a.submissions.length > 0
              ? a.submissions[0].testResults?.filter(
                (tr: { passed: boolean }) => tr.passed
              ).length || 0
              : 0;
          const bPassedTests =
            b.submissions.length > 0
              ? b.submissions[0].testResults?.filter(
                (tr: { passed: boolean }) => tr.passed
              ).length || 0
              : 0;
          return bPassedTests - aPassedTests;
        case "skill":
          const aSkill = a.primary_skill?.name || "";
          const bSkill = b.primary_skill?.name || "";
          return aSkill.localeCompare(bSkill);
        case "experience":
          const aExp = a.experience_level?.name || "";
          const bExp = b.experience_level?.name || "";
          return aExp.localeCompare(bExp);
        default:
          return 0;
      }
    });
  }, [data, searchTerm, sortKey, filterStatus, startDate, endDate]);

  const totalPages = Math.ceil(
    filteredAndSortedCandidates.length / itemsPerPage
  );

  const paginatedCandidates = filteredAndSortedCandidates.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDownloadReport = () => {
    let url = "http://localhost:3000/dashboard/report";

    if (startDate && endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }

    window.open(url);
  };

  const applyDateFilter = () => {
    setShowDatePicker(false);
  };

  const clearDateFilter = () => {
    setStartDate("");
    setEndDate("");
    setShowDatePicker(false);
  };

  const getDateFilterText = () => {
    if (startDate && endDate) {
      return ` (${startDate} to ${endDate})`;
    }
    return "";
  };

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (error instanceof Error) {
    return (
      <div className="dashboard-error">
        <div className="error-content">
          <XCircle className="h-8 w-8 text-red-600" />
        </div>
      </div>
    );
  }

  const changePage = (page: number | ((prev: number) => number)) => {
    setCurrentPage(page as any);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="results-container">
      <div className="results-header">
        <h1>Candidate Assessment Results</h1>
        <p>Detailed view of all candidate assessments</p>
        <p>
          Showing {filteredAndSortedCandidates.length} of{" "}
          {data?.data?.length || 0} candidates{getDateFilterText()}
        </p>
      </div>

      <div className="results-controls">
        <div className="search-control">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-controls">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            className="sort-select"
          >
            <option value="name">Sort by Name</option>
            <option value="email">Sort by Email</option>
            <option value="mcq">Sort by MCQ Score</option>
            <option value="coding">Sort by Coding Tests</option>
            <option value="skill">Sort by Skill</option>
            <option value="experience">Sort by Experience</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Candidates</option>
            <option value="selected">Selected</option>
            <option value="not-selected">Not Selected</option>
            <option value="completed">Completed Tests</option>
            <option value="pending">Pending Tests</option>
            <option value="attending">In Progress</option>
            <option value="expired">Expired Tests</option>
            <option value="attempts-exceeded">Attempts Exceeded</option>
          </select>

          <div className="download-controls">
            <div className="date-picker-container">
              <button
                type="button"
                className={`calendar-button ${startDate && endDate ? "active" : ""
                  }`}
                onClick={() => setShowDatePicker(!showDatePicker)}
                title={
                  startDate && endDate
                    ? `Filter: ${startDate} to ${endDate}`
                    : "Select date range"
                }
              >
                <Calendar className="calendar-icon" size={20} />
                {startDate && endDate && (
                  <span className="date-indicator"></span>
                )}
              </button>

              {showDatePicker && (
                <div className="date-picker-dropdown">
                  <div className="date-inputs">
                    <label>
                      Start Date:
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </label>
                    <label>
                      End Date:
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="date-picker-actions">
                    <button onClick={clearDateFilter} className="clear-dates">
                      Clear
                    </button>
                    <button onClick={applyDateFilter} className="apply-dates">
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleDownloadReport}
              className="download-button"
              title={
                startDate && endDate
                  ? `Download reports from ${startDate} to ${endDate}`
                  : "Download all reports"
              }
            >
              Download Report (Excel)
            </button>
          </div>
        </div>
      </div>

      <div className="results-table-responsive">
        <table className="results-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Skill</th>
              <th>Experience</th>
              <th>MCQ Score</th>
              <th>Test Cases</th>
              <th>Percentage</th>
              <th>Test Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedCandidates.map((candidate: Candidate) => {
              const totalMcqQuestions = 30;

              const codingSubmission = candidate.submissions[0];
              const passedTests =
                codingSubmission?.testResults?.filter(
                  (tr: { passed: boolean }) => tr.passed
                ).length || 0;
              const totalTests = codingSubmission?.testResults?.length || 0;

              const testAttempt = candidate.test_attempts?.[0];
              const mcqMode = testAttempt?.mcq_mode || "manual";

              const mcqScore = testAttempt?.mcq_score || 0;
              let testStatus = "pending";

              if (testAttempt) {
                const token = testAttempt?.test_access_tokens?.[0];
                const isExpired =
                  token &&
                  new Date(token.expires_at) < new Date() &&
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
                } else {
                  testStatus = "pending";
                }
              }

              const Mcq_Percentage = (
                (mcqScore / totalMcqQuestions) *
                100
              ).toFixed(2);

              const coding_Percentage = () => {
                if (passedTests > 0) {
                  return ((passedTests / totalTests) * 100).toFixed(2);
                } else {
                  return Mcq_Percentage;
                }
              };
              return (
                <tr key={candidate.id}>
                  <td>
                    <Link
                      to={`/applicant-info/${candidate.id}`}
                      className="candidate-name-link"
                      state={{ candidate }}
                    >
                      {candidate.name}
                    </Link>
                  </td>
                  <td className="candidate-email">{candidate.email}</td>
                  <td className="skill-name">
                    {candidate.primary_skill?.name || "N/A"}
                  </td>
                  <td className="experience-name">
                    {candidate.experience_level?.name || "N/A"}
                  </td>
                  <td>
                    <span
                      className={`score-badge ${mcqScore > 20 ? "score-pass" : "score-fail"
                        }`}
                    >
                      {mcqScore}/{totalMcqQuestions}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`score-badge ${passedTests > 0
                        ? "score-pass"
                        : totalTests > 0
                          ? "score-fail"
                          : "score-pending"
                        }`}
                    >
                      {passedTests}/{totalTests}
                    </span>
                  </td>
                  <td>
                    {(
                      (Number(Mcq_Percentage) + Number(coding_Percentage())) /
                      2
                    ).toFixed(2)}
                    %{/* {Mcq_Percentage}% */}
                  </td>
                  <td>
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
                  </td>

                  <td className="results-actions">
                    <Link
                      to={`/results/mcq/${mcqMode}/${candidate.id}`}
                      className="action-link"
                    >
                      <abbr title="View MCQ Result">MCQ</abbr>
                    </Link>
                    <Link
                      to={`/results/coding/${candidate.id}`}
                      className="action-link"
                    >
                      <abbr title="View Coding Result">Coding</abbr>
                    </Link>
                    <Link
                      to={`/results/malpractice/${candidate.id}`}
                      className="action-link"
                    >
                      <abbr title="View Malpractice Images or Candidate Images">
                        Images
                      </abbr>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="pagination-controls">
          <button
            disabled={currentPage === 1}
            onClick={() => changePage(1)}
            className="pagination-btn pagination-first"
            title="First Page"
          >
            &laquo;
          </button>

          <button
            disabled={currentPage === 1}
            onClick={() => changePage((prev: number) => prev - 1)}
            className="pagination-btn pagination-prev"
            title="Previous Page"
          >
            &lsaquo;
          </button>

          {[...Array(totalPages)].map((_, index) => {
            const pageNumber = index + 1;
            if (
              pageNumber === 1 ||
              pageNumber === totalPages ||
              (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
            ) {
              return (
                <button
                  key={pageNumber}
                  onClick={() => changePage(pageNumber)}
                  className={`pagination-btn pagination-number ${currentPage === pageNumber ? "pagination-active" : ""
                    }`}
                >
                  {pageNumber}
                </button>
              );
            } else if (
              pageNumber === currentPage - 2 ||
              pageNumber === currentPage + 2
            ) {
              return (
                <span key={pageNumber} className="pagination-ellipsis">
                  ...
                </span>
              );
            }
            return null;
          })}

          <button
            disabled={currentPage === totalPages}
            onClick={() => changePage((prev: number) => prev + 1)}
            className="pagination-btn pagination-next"
            title="Next Page"
          >
            &rsaquo;
          </button>

          <button
            disabled={currentPage === totalPages}
            onClick={() => changePage(totalPages)}
            className="pagination-btn pagination-last"
            title="Last Page"
          >
            &raquo;
          </button>
        </div>
      </div>

      {filteredAndSortedCandidates.length === 0 && (
        <div className="no-results">
          <p>No candidates found matching your criteria.</p>
          {startDate && endDate && (
            <p>
              Date filter: {startDate} to {endDate}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Results;
