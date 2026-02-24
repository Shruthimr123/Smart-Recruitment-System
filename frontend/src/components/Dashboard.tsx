import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clock,
  Loader2,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import axiosInstance from "../api/axiosInstance";
import "../components/css/Dashboard.css";
import { Link, useNavigate } from "react-router-dom";

interface Candidate {
  id: string;
  name: string;
  email: string;
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
    updated_at?: string;
    test_access_tokens: Array<{
      expires_at: string;
    }>;
  }>;
  submissions: Array<{
    status: string;
  }>;
  malpractice?: any[];
}

interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<any>;
  color: string;
  description?: string;
  linkTo?: string;
  onClick?: () => void;
}

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  linkTo?: string;
  dropdown?: {
    value: string;
  };
  onFilterChange?: (value: string) => void;
}

interface ChartDataItem {
  name: string;
  value: number;
  percent?: number;
}

const fetchDashboardData = async () => {
  const { data } = await axiosInstance.get("/dashboard");
  return data;
};

const Dashboard = () => {
  const [skillsFilter, setSkillsFilter] = useState("all");
  const [experienceFilter, setExperienceFilter] = useState("all");
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalCandidates, setModalCandidates] = useState<Candidate[]>([]);

  const openModal = (title: string, list: Candidate[]) => {
    setModalTitle(title);
    setModalCandidates(list);
    setIsModalOpen(true);
  };
  const navigate = useNavigate();
  const closeModal = () => setIsModalOpen(false);

  const { data, error, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboardData,
    refetchInterval: 30000, // refetch every 30s
  });

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

  const candidates: Candidate[] = data?.data || [];

  // Calculate metrics based on ALL candidates (no limits)
  const totalCandidates = candidates.length;

  // Selected: MCQ > 20 AND coding submission status is "Passed"
  const selectedCandidates = candidates.filter((candidate: Candidate) => {
    const mcqScore = candidate.test_attempts[0]?.mcq_score || 0;
    const hasPassedCoding = candidate.submissions.some(
      (sub: { status: string }) => sub.status === "Passed"
    );
    return mcqScore > 20 && hasPassedCoding;
  });

  // Not Selected: MCQ <= 20 OR coding submission status is not "Passed" (or no submissions)
  const notSelectedCandidates = candidates.filter((candidate: Candidate) => {
    const mcqScore = candidate.test_attempts[0]?.mcq_score || 0;
    const hasPassedCoding = candidate.submissions.some(
      (sub: { status: string }) => sub.status === "Passed"
    );
    return mcqScore <= 20 || !hasPassedCoding;
  });

  const currentTime = new Date();

  // Helper function to check if test is expired
  const isTestExpired = (candidate: Candidate) => {
    const token = candidate.test_attempts[0]?.test_access_tokens[0];
    const testAttempt = candidate.test_attempts[0];
    if (!token || !testAttempt) return false;

    const expiresAt = new Date(token.expires_at);
    return expiresAt < currentTime && testAttempt.is_submitted === false;
  };

  // Helper function to check if attempts are exceeded
  const isAttemptsExceeded = (candidate: Candidate) => {
    const testAttempt = candidate.test_attempts[0];
    if (!testAttempt) return false;

    return testAttempt.attempt_count >= 3 && testAttempt.is_submitted === false;
  };

  //pending candidate
  const pendingCandidates = candidates.filter((candidate: Candidate) => {
    const testAttempt = candidate.test_attempts[0];
    if (!testAttempt) return true; // no attempt = pending

    return (
      testAttempt.test_status === "pending" &&
      testAttempt.is_submitted === false &&
      !isAttemptsExceeded(candidate) &&
      !isTestExpired(candidate)
    );
  });

  // in progress candidate 
  const inProgressCandidates = candidates.filter((candidate: Candidate) => {
    const testAttempt = candidate.test_attempts[0];
    if (!testAttempt) return false;

    // Test is "attending" and not expired or exceeded
    return (
      testAttempt.test_status === "attending" &&
      !isAttemptsExceeded(candidate) &&
      !isTestExpired(candidate)
    );
  });


  // Categorize candidates based on test status with proper logic
  const testStatusCounts = candidates.reduce((acc: any, candidate: Candidate) => {
    const testAttempt = candidate.test_attempts[0];
    if (!testAttempt) {
      acc.pending = (acc.pending || 0) + 1;
      return acc;
    }

    // Check attempts exceeded first (highest priority)
    if (isAttemptsExceeded(candidate)) {
      acc.attemptsExceeded = (acc.attemptsExceeded || 0) + 1;
    }
    // Then check if test is expired (but not if attempts exceeded)
    else if (isTestExpired(candidate)) {
      acc.expired = (acc.expired || 0) + 1;
    }
    // Then check other statuses
    else if (
      testAttempt.test_status === "pending" &&
      testAttempt.is_submitted === false
    ) {
      acc.pending = (acc.pending || 0) + 1;
    } else if (testAttempt.test_status === "attending") {
      acc.attending = (acc.attending || 0) + 1;
    } else if (testAttempt.test_status === "completed") {
      acc.completed = (acc.completed || 0) + 1;
    } else {
      // Fallback for any other status
      acc.pending = (acc.pending || 0) + 1;
    }

    return acc;
  }, {});

  // Get individual counts
  const attemptsExceededTests = testStatusCounts.attemptsExceeded || 0;
  const expiredTests = testStatusCounts.expired || 0;

  // Skills distribution with filter (for charts)
  const getFilteredCandidates = (filter: string) => {
    switch (filter) {
      case "selected":
        return selectedCandidates;
      case "not-selected":
        return notSelectedCandidates;
      default:
        return candidates;
    }
  };

  const skillsDistribution = getFilteredCandidates(skillsFilter).reduce(
    (acc: any, candidate: Candidate) => {
      const skill = candidate.primary_skill?.name || "Unknown";
      acc[skill] = (acc[skill] || 0) + 1;
      return acc;
    },
    {}
  );

  // Experience level distribution with filter (for charts)
  const experienceDistribution = getFilteredCandidates(experienceFilter).reduce(
    (acc: any, candidate: Candidate) => {
      const level = candidate.experience_level?.name || "Unknown";
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    },
    {}
  );

  // Recent 5 candidates based on test_attempts.updated_at (ONLY for Recent Test Results table)
  const recentCandidates = candidates
    .filter((c: Candidate) => c.test_attempts[0]?.updated_at) // Filter candidates with test attempts
    .sort(
      (a: Candidate, b: Candidate) => {
        const aDate = a.test_attempts[0]?.updated_at ? new Date(a.test_attempts[0].updated_at).getTime() : 0;
        const bDate = b.test_attempts[0]?.updated_at ? new Date(b.test_attempts[0].updated_at).getTime() : 0;
        return bDate - aDate;
      }
    )
    .slice(0, 5); // Only limit the Recent Test Results to 5

  // Chart data preparation
  const skillsChartData: ChartDataItem[] = Object.entries(skillsDistribution).map(
    ([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(),
      value: value as number,
    })
  );

  const experienceChartData: ChartDataItem[] = Object.entries(experienceDistribution).map(
    ([name, value]) => ({ name, value: value as number })
  );

  const COLORS = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#06B6D4",
    "#F97316",
  ];

  const MetricCard = ({
    title,
    value,
    icon: Icon,
    color,
    description,
    linkTo,
    onClick
  }: MetricCardProps) => (
    <div className="metric-card" onClick={onClick}>
      {linkTo ? (
        <div className="metric-link" style={{ cursor: "pointer" }}>
          <div className="metric-content">
            <div className="metric-info">
              <p className="metric-title">{title}</p>
              <p className="metric-value" style={{ color }}>
                {value}
              </p>
              {description && (
                <p className="metric-description">{description}</p>
              )}
            </div>
            <Icon className="metric-icon" style={{ color }} />
          </div>
        </div>
      ) : (
        <div className="metric-content">
          <div className="metric-info">
            <p className="metric-title">{title}</p>
            <p className="metric-value" style={{ color }}>
              {value}
            </p>
            {description && <p className="metric-description">{description}</p>}
          </div>
          <Icon className="metric-icon" style={{ color }} />
        </div>
      )}
    </div>
  );

  const ChartCard = ({ title, children, linkTo, dropdown, onFilterChange }: ChartCardProps) => (
    <div className="chart-card">
      <div className="chart-header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <h3 className="chart-title">{title}</h3>
          {dropdown && (
            <select
              value={dropdown.value}
              onChange={(e) => onFilterChange?.(e.target.value)}
              style={{
                padding: "0.25rem 0.5rem",
                borderRadius: "0.25rem",
                border: "1px solid #ccc",
                fontSize: "0.875rem",
                backgroundColor: "#fff",
                color: "#333",
              }}
            >
              <option value="all">All Candidates</option>
              <option value="selected">Selected Only</option>
              <option value="not-selected">Not Selected Only</option>
            </select>
          )}
        </div>
        {linkTo && (
          <div
            className="view-details-link"
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "#3B82F6",
            }}
          >
            <BarChart3 size={16} />
            View Details
          </div>
        )}
      </div>
      <div className="chart-content">{children}</div>
    </div>
  );
  
  const handleViewAll = () => {
    const ids = modalCandidates.map((c: Candidate) => c.id);
    navigate("/results", { state: { candidateIds: ids, title: modalTitle } });
  };
  
  return (
    <div className="dashboard">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <h1>Candidate Assessment Dashboard</h1>
          <p>Overview of candidate performance and statistics</p>
        </div>

        {/* Overview Metrics*/}
        <div className="metrics-grid">
          <MetricCard
            title="Total Candidates"
            value={totalCandidates}
            icon={Users}
            color="#3B82F6"
            description="All registered candidates"
            linkTo="/results"
            onClick={() => openModal("Total Candidates", candidates)}
          />
          <MetricCard
            title="Selected"
            value={selectedCandidates.length}
            icon={CheckCircle}
            color="#10B981"
            description="MCQ > 20 & Coding Passed"
            linkTo="/results"
            onClick={() => openModal("Selected Candidates", selectedCandidates)}
          />
          <MetricCard
            title="Not Selected"
            value={notSelectedCandidates.length}
            icon={XCircle}
            color="#EF4444"
            description="MCQ <= 20 OR Coding Failed/Not Attempted"
            linkTo="/results"
            onClick={() => openModal("Not Selected Candidates", notSelectedCandidates)}
          />
          <MetricCard
            title="Completed Tests"
            value={testStatusCounts.completed || 0}
            icon={CheckCircle}
            color="#10B981"
            description="Assessment finished"
            linkTo="/results"
            onClick={() =>
              openModal(
                "Completed Tests",
                candidates.filter(
                  (c: Candidate) => c.test_attempts[0]?.test_status === "completed"
                )
              )
            }
          />
        </div>

        {/* Test Status Overview*/}
        <div className="status-grid">
          <MetricCard
            title="Pending Tests"
            value={testStatusCounts.pending || 0}
            icon={Clock}
            color="#F59E0B"
            description="Not started yet"
            linkTo="/results"
            onClick={() => openModal("Pending Tests", pendingCandidates)}
          />

          <MetricCard
            title="In Progress"
            value={testStatusCounts.attending || 0}
            icon={TrendingUp}
            color="#8B5CF6"
            description="Currently taking test"
            linkTo="/results"
            onClick={() => openModal("In Progress", inProgressCandidates)}
          />

          <MetricCard
            title="Attempts Exceeded"
            value={attemptsExceededTests}
            icon={AlertTriangle}
            color="#F97316"
            description="Maximum attempts reached (3)"
            linkTo="/results"
            onClick={() =>
              openModal(
                "Attempts Exceeded",
                candidates.filter((c: Candidate) => isAttemptsExceeded(c))
              )
            }
          />
          <MetricCard
            title="Expired Tests"
            value={expiredTests}
            icon={XCircle}
            color="#EF4444"
            description="Test access expired"
            linkTo="/results"
            onClick={() =>
              openModal(
                "Expired Tests",
                candidates.filter((c: Candidate) => isTestExpired(c))
              )
            }
          />
        </div>

        {/* Distributions with Charts */}
        <div className="charts-grid">
          <ChartCard
            title="Primary Skills Distribution"
            linkTo="/results"
            dropdown={{ value: skillsFilter }}
            onFilterChange={setSkillsFilter}
          >
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={skillsChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }: { name: string; percent?: number }) =>
                    `${name} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                >
                  {skillsChartData.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Experience Level Distribution"
            linkTo="/results"
            dropdown={{ value: experienceFilter }}
            onFilterChange={setExperienceFilter}
          >
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={experienceChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Recent 5 Candidates*/}
        <div className="recent-candidates">
          <div className="section-header">
            <h3>Recent Test Results (Last 5)</h3>
            <div
              className="view-all-link"
              style={{ cursor: "pointer", color: "#3B82F6" }}
            >
              <Link to="/results">View All</Link>
            </div>
          </div>
          <div className="candidates-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Skill</th>
                  <th>MCQ Score</th>
                  <th>Coding Status</th>
                  <th>Test Status</th>
                  <th>Experience</th>
                </tr>
              </thead>
              <tbody>
                {recentCandidates.map((candidate: Candidate) => {
                  const mcqScore = candidate.test_attempts[0]?.mcq_score || 0;
                  const codingStatus =
                    candidate.submissions.length > 0
                      ? candidate.submissions.find(
                        (sub: { status: string }) => sub.status === "Passed"
                      )
                        ? "Passed"
                        : "Failed"
                      : "Not Attempted";

                  // Determine actual test status
                  let testStatus =
                    candidate.test_attempts[0]?.test_status || "pending";

                  // Check attempts exceeded first 
                  if (isAttemptsExceeded(candidate)) {
                    testStatus = "attempts-exceeded";
                  }
                  // Then check expired
                  else if (isTestExpired(candidate)) {
                    testStatus = "expired";
                  }

                  return (
                    <tr key={candidate.id}>
                      <td className="candidate-name">{candidate.name}</td>
                      <td className="skill-name">
                        {candidate.primary_skill?.name || "N/A"}
                      </td>
                      <td>
                        <span
                          className={`score-badge ${mcqScore > 20 ? "score-pass" : "score-fail"
                            }`}
                        >
                          {mcqScore}/30
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status-badge ${codingStatus === "Passed"
                            ? "status-pass"
                            : codingStatus === "Failed"
                              ? "status-fail"
                              : "status-pending"
                            }`}
                        >
                          {codingStatus}
                        </span>
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
                      <td>{candidate.experience_level?.name || "N/A"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: "22px" }}>{modalTitle}</h2>
              <div>
                <button className="view-all-btn" onClick={handleViewAll}>
                  View Details
                </button>
                <button className="close-btn" onClick={closeModal}>
                  Close
                </button>
              </div>
            </div>
            <div className="modal-candidate-list">
              {modalCandidates.length > 0 ? (
                modalCandidates.map((c: Candidate) => (
                  <div key={c.id} className="modal-candidate-item">
                    <Link
                      to={`/applicant-info/${c.id}`}
                      className="candidate-name-link"
                      state={{ c }}
                    >
                      {c.name}
                    </Link>
                    <span className="candidate-skill">
                      {c.primary_skill?.name || "N/A"}
                    </span>
                  </div>
                ))
              ) : (
                <p>No candidates available</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;