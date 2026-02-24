import { useQuery } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import "./css/ViewCoding.css";

interface LanguageConfig {
  language: string;
  signature: string;
  functionName: string;
}

interface TestCase {
  input: string;
  expectedOutput: string;
}

interface Problem {
  key: string;
  title: string;
  description: string;
  difficulty: string;
  languageConfigs: LanguageConfig[];
  testCases: TestCase[];
}

const fetchProblems = async (): Promise<Problem[]> => {
  const res = await axiosInstance.get("/problems");
  return res.data?.data ?? res.data ?? [];
};

const renderValue = (value: any): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value.toString();
  }
  if (value === null || value === undefined) {
    return '';
  }

  try {
    return JSON.stringify(value);
  } catch {
    return '[Unrenderable value]';
  }
};

const ViewCoding: React.FC = () => {
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [searchKey, setSearchKey] = useState("");
  const [expandedProblem, setExpandedProblem] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const problemsPerPage = 10;

  const {
    data: problems = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["problems"],
    queryFn: fetchProblems,
    refetchOnWindowFocus: false,
  });

  const filteredProblems = useMemo(() => {
    return problems.filter((p) => {
      const matchesDifficulty = difficultyFilter
        ? p.difficulty.toLowerCase() === difficultyFilter.toLowerCase()
        : true;

      const matchesSearch = searchKey
        ? p.key.toLowerCase().includes(searchKey.toLowerCase()) ||
        p.title.toLowerCase().includes(searchKey.toLowerCase()) ||
        p.description.toLowerCase().includes(searchKey.toLowerCase())
        : true;

      return matchesDifficulty && matchesSearch;
    });
  }, [problems, difficultyFilter, searchKey]);

  // Pagination logic
  const totalPages = Math.ceil(filteredProblems.length / problemsPerPage);
  const startIndex = (currentPage - 1) * problemsPerPage;
  const currentProblems = filteredProblems.slice(startIndex, startIndex + problemsPerPage);

  const toggleProblem = (problemKey: string) => {
    setExpandedProblem(expandedProblem === problemKey ? null : problemKey);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setExpandedProblem(null);
  };

  if (isLoading) {
    return (
      <div className="coding-questions-loading">
        <div className="loading-spinner"></div>
        <p>Loading coding problems...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="coding-questions-error">
        <div className="error-icon">⚠️</div>
        <h3>Unable to load problems</h3>
        <p>{(error as Error).message}</p>
        <button
          onClick={() => window.location.reload()}
          className="retry-button"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="coding-questions-container">
      <div className="coding-questions-header">
        <h1>Coding Problems</h1>
        <p>Practice and improve your coding skills with these challenges</p>
      </div>

      {/* Filters Section */}
      <div className="coding-filters-section">
        <div className="search-box">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none">
            <path d="M21 21L16.514 16.506L21 21ZM19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search problems by title, key, or description..."
            value={searchKey}
            onChange={(e) => {
              setSearchKey(e.target.value);
              setCurrentPage(1);
            }}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <select
            value={difficultyFilter}
            onChange={(e) => {
              setDifficultyFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="difficulty-filter"
          >
            <option value="">All Difficulty Levels</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Results Info */}
      <div className="results-info">
        <span className="results-count">
          {filteredProblems.length} {filteredProblems.length === 1 ? 'problem' : 'problems'} found
          {difficultyFilter && ` • ${difficultyFilter} difficulty`}
          {filteredProblems.length > problemsPerPage && ` • Page ${currentPage} of ${totalPages}`}
        </span>
      </div>

      {/* Problems List */}
      {filteredProblems.length === 0 ? (
        <div className="no-problems-found">
          <div className="no-problems-icon">🔍</div>
          <h3>No problems found</h3>
          <p>Try adjusting your search or filter criteria</p>
        </div>
      ) : (
        <>
          <div className="problems-grid">
            {currentProblems.map((problem) => (
              <div
                key={problem.key}
                className={`problem-card ${expandedProblem === problem.key ? 'expanded' : ''}`}
              >
                <div className="problem-header">
                  <div className="problem-meta">
                    <span
                      className="difficulty-badge"
                      style={{ backgroundColor: getDifficultyColor(problem.difficulty) }}
                    >
                      {problem.difficulty}
                    </span>
                    <span className="problem-key">#{problem.key}</span>
                  </div>
                  <button
                    className="expand-button"
                    onClick={() => toggleProblem(problem.key)}
                  >
                    {expandedProblem === problem.key ? 'Show Less' : 'View Details'}
                  </button>
                </div>

                <h3 className="problem-title">{problem.title}</h3>
                <p className="problem-description">
                  {problem.description.length > 150 && !expandedProblem
                    ? `${problem.description.substring(0, 150)}...`
                    : problem.description
                  }
                </p>

                {expandedProblem === problem.key && (
                  <div className="problem-details">
                    {/* Language Configurations */}
                    {problem.languageConfigs.length > 0 && (
                      <div className="detail-section">
                        <h4>Language Configurations</h4>
                        <div className="language-configs">
                          {problem.languageConfigs.map((config, idx) => (
                            <div key={idx} className="language-config">
                              <strong>{config.language}:</strong>
                              <code className="code-signature">{config.signature}</code>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Test Cases */}
                    {problem.testCases.length > 0 && (
                      <div className="detail-section">
                        <h4>Test Cases</h4>
                        <div className="test-cases">
                          {problem.testCases.map((test, idx) => (
                            <div key={idx} className="test-case">
                              <div className="test-case-input">
                                <span className="test-case-label">Input:</span>
                                <code>{renderValue(test.input)}</code>
                              </div>
                              <div className="test-case-output">
                                <span className="test-case-label">Expected Output:</span>
                                <code>{renderValue(test.expectedOutput)}</code>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination-container">
              <button
                className="pagination-button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </button>

              <div className="pagination-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                className="pagination-button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ViewCoding;