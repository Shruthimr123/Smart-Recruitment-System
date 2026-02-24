import React, { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import "./css/ViewMCQ.css";

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Skill {
  id: string;
  name: string;
}

interface MCQ {
  id: string;
  questionTitle: string;
  difficulty: string;
  createdAt: string;
  modifiedAt: string;
  createdBy: string;
  skill: Skill;
  options: Option[];
}

const ViewMCQ: React.FC = () => {
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [filteredMcqs, setFilteredMcqs] = useState<MCQ[]>([]);
  const [search, setSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchMCQs = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axiosInstance.get("/mcq-questions");
        setMcqs(res.data.data);
        setFilteredMcqs(res.data.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load MCQ questions. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchMCQs();
  }, []);

  useEffect(() => {
    let filtered = mcqs.filter((mcq) =>
      mcq.questionTitle.toLowerCase().includes(search.toLowerCase())
    );
    if (skillFilter) {
      filtered = filtered.filter(
        (mcq) => mcq.skill.name.toLowerCase() === skillFilter.toLowerCase()
      );
    }
    if (difficultyFilter) {
      filtered = filtered.filter(
        (mcq) => mcq.difficulty.toLowerCase() === difficultyFilter.toLowerCase()
      );
    }
    setFilteredMcqs(filtered);
    setCurrentPage(1);
  }, [search, skillFilter, difficultyFilter, mcqs]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredMcqs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredMcqs.length / itemsPerPage);

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

  const getUniqueSkills = () => {
    const skills = mcqs.map(mcq => mcq.skill.name);
    return [...new Set(skills)].sort();
  };

  if (loading) {
    return (
      <div className="mcq-loading-container">
        <div className="mcq-loading-spinner"></div>
        <p>Loading MCQ questions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mcq-error-container">
        <div className="mcq-error-icon">⚠️</div>
        <h3>Unable to load questions</h3>
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mcq-retry-button"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="mcq-dashboard-container">
      <div className="mcq-header-section">
        <h1>MCQ Questions Library</h1>
        <p>Browse and manage multiple choice questions</p>
      </div>

      {/* Filters Section */}
      <div className="mcq-filters-container">
        <div className="mcq-search-box">
          <svg className="mcq-search-icon" viewBox="0 0 24 24" fill="none">
            <path d="M21 21L16.514 16.506L21 21ZM19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search questions by title, key, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mcq-search-input"
          />
        </div>

        <div className="mcq-filter-group">
          <select
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="mcq-skill-filter"
          >
            <option value="">All Skills</option>
            {getUniqueSkills().map((skill) => (
              <option key={skill} value={skill}>
                {skill}
              </option>
            ))}
          </select>

          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="mcq-difficulty-filter"
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Results Info */}
      <div className="mcq-results-info">
        <span className="mcq-results-count">
          {filteredMcqs.length} {filteredMcqs.length === 1 ? 'question' : 'questions'} found
          {skillFilter && ` • ${skillFilter}`}
          {difficultyFilter && ` • ${difficultyFilter} difficulty`}
          {filteredMcqs.length > itemsPerPage && ` • Page ${currentPage} of ${totalPages}`}
        </span>
      </div>

      {/* MCQ Cards */}
      <div className="mcq-questions-grid">
        {currentItems.length === 0 ? (
          <div className="mcq-no-results">
            <div className="mcq-no-results-icon">🔍</div>
            <h3>No questions found</h3>
            <p>Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          currentItems.map((mcq, index) => (
            <div key={mcq.id} className="mcq-question-card">
              <div className="mcq-question-header">
                <div className="mcq-question-meta">
                  <span 
                    className="mcq-difficulty-badge"
                    style={{ backgroundColor: getDifficultyColor(mcq.difficulty) }}
                  >
                    {mcq.difficulty}
                  </span>
                  <span className="mcq-question-number">
                    #{indexOfFirstItem + index + 1}
                  </span>
                </div>
                <div className="mcq-skill-tag">
                  <svg className="mcq-skill-icon" viewBox="0 0 24 24" fill="none" width="14" height="14">
                    <path d="M12 14l9-5-9-5-9 5 9 5z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  {mcq.skill.name}
                </div>
              </div>

              <h3 className="mcq-question-title">
                {mcq.questionTitle}
              </h3>

              {/* Options Section */}
              <div className="mcq-options-section">
                <div className="mcq-options-grid">
                  {mcq.options.map((option) => (
                    <div
                      key={option.id}
                      className={`mcq-option-item ${option.isCorrect ? "mcq-correct-option" : ""}`}
                    >
                      <div className="mcq-option-content">
                        <span className="mcq-option-text">{option.text}</span>
                        {option.isCorrect && (
                          <span className="mcq-correct-indicator">
                            <svg className="mcq-correct-icon" viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Correct
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mcq-question-footer">
                <span className="mcq-author-info">
                  By {mcq.createdBy}
                </span>
                <span className="mcq-date">
                  {new Date(mcq.createdAt).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mcq-pagination-container">
          <div className="mcq-pagination-controls">
            <button
              onClick={() => {
                setCurrentPage((prev) => Math.max(prev - 1, 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              disabled={currentPage === 1}
              className="mcq-pagination-btn mcq-pagination-prev"
            >
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Previous
            </button>

            <div className="mcq-pagination-numbers">
              {(() => {
                const pageNumbers: number[] = [];
                let start = Math.max(1, currentPage - 2);
                let end = Math.min(totalPages, start + 4);

                if (end - start < 4) {
                  start = Math.max(1, end - 4);
                }

                for (let i = start; i <= end; i++) {
                  pageNumbers.push(i);
                }

                return pageNumbers.map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => {
                      setCurrentPage(pageNum);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`mcq-pagination-btn ${pageNum === currentPage ? "mcq-pagination-active" : ""}`}
                  >
                    {pageNum}
                  </button>
                ));
              })()}
            </div>

            <button
              onClick={() => {
                setCurrentPage((prev) => Math.min(prev + 1, totalPages));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              disabled={currentPage === totalPages}
              className="mcq-pagination-btn mcq-pagination-next"
            >
              Next
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewMCQ;