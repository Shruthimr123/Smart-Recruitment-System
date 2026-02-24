import { useQuery } from "@tanstack/react-query";

import axiosInstance from "../api/axiosInstance";
import "./css/McqResults.css";

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface MCQ {
  questionId: string;
  questionTitle: string;
  difficulty: string;
  options: Option[];
  selectedOption?: Option;
  status: string;
}

// fetcher
const fetchMcqResults = async (applicantId: string) => {
  const res = await axiosInstance.get(
    `/applicants/results/mcqs/${applicantId}`
  );
  return res.data.data;
};

const ManualMcqResult = ({ applicantId }: { applicantId: string }) => {

     

  const {
    data: mcqs,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["mcqResults", applicantId],
    queryFn: () => fetchMcqResults(applicantId!),
    enabled: !!applicantId,
    retry: 2,
  });

  const calculateScore = () => {
    if (!mcqs) return { correct: 0, total: 0, percentage: 0 };
    const correct = mcqs.filter((q: MCQ) => {
      const correctOption = q.options.find((o: Option) => o.isCorrect);
      return correctOption && q.selectedOption?.id === correctOption.id;
    }).length;
    const percentage = (correct / mcqs.length) * 100;
    return { correct, total: mcqs.length, percentage };
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

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return "#10b981";
    if (percentage >= 60) return "#f59e0b";
    return "#ef4444";
  };

  if (isLoading) {
    return (
      <div className="mcq-result-container">
        <div className="mcq-loading-state">
          <div className="loading-spinner"></div>
          <p>Loading MCQ results...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mcq-result-container">
        <div className="mcq-error-state">
          <div className="error-icon">⚠️</div>
          <h3>Unable to load results</h3>
          <p>{(error as Error).message}</p>
          <button 
            onClick={() => window.location.reload()}
            className="retry-button"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!mcqs || mcqs.length === 0) {
    return (
      <div className="mcq-result-container">
        <div className="mcq-empty-state">
          <div className="empty-icon">📝</div>
          <h3>No MCQ Results Found</h3>
          <p>The applicant hasn't attempted any MCQ questions yet.</p>
        </div>
      </div>
    );
  }

  const score = calculateScore();

  return (
    <div className="mcq-result-container">
      {/* Header Section */}
      <div className="mcq-result-header">
        <h1>MCQ Assessment Results</h1>
        <p>Detailed analysis of applicant's multiple choice questions performance</p>
      </div>

      {/* Score Summary */}
      <div className="score-summary-card">
        <div className="score-main">
          <div className="score-circle">
            <svg className="score-progress" viewBox="0 0 36 36">
              <path
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={getScoreColor(score.percentage)}
                strokeWidth="3"
                strokeDasharray={`${score.percentage}, 100`}
              />
            </svg>
            <div className="score-percentage">
              {Math.round(score.percentage)}%
            </div>
          </div>
          <div className="score-details">
            <h3>Overall Score</h3>
            <div className="score-breakdown">
              <div className="score-item">
                <span className="score-label">Correct Answers:</span>
                <span className="score-value correct">{score.correct}</span>
              </div>
              <div className="score-item">
                <span className="score-label">Incorrect Answers:</span>
                <span className="score-value incorrect">{score.total - score.correct}</span>
              </div>
              <div className="score-item">
                <span className="score-label">Total Questions:</span>
                <span className="score-value total">{score.total}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="questions-section">
        <h3>Question Details</h3>
        <div className="questions-grid">
          {mcqs.map((mcq: MCQ, idx: number) => {
            const correctOption = mcq.options.find((o: Option) => o.isCorrect);
            const selectedOptionId = mcq.selectedOption?.id;
            const isCorrect = selectedOptionId === correctOption?.id;

            return (
              <div className="mcq-question-card" key={mcq.questionId}>
                {/* Question Header */}
                <div className="question-header">
                  <div className="question-meta">
                    <span 
                      className="difficulty-badge"
                      style={{ backgroundColor: getDifficultyColor(mcq.difficulty) }}
                    >
                      {mcq.difficulty}
                    </span>
                    <span className="question-number">Q{idx + 1}</span>
                  </div>
                  <div className={`status-indicator ${isCorrect ? 'correct' : 'incorrect'}`}>
                    {isCorrect ? '✅ Correct' : '❌ Incorrect'}
                  </div>
                </div>

                {/* Question Title */}
                <h4 className="question-title">{mcq.questionTitle}</h4>

                {/* Options Grid */}
                <div className="options-grid">
                  {mcq.options.map((option: Option) => {
                    const isSelected = option.id === selectedOptionId;
                    const isCorrectOption = option.isCorrect;

                    return (
                      <div
                        key={option.id}
                        className={`option-card 
                          ${isCorrectOption ? 'correct-option' : ''} 
                          ${isSelected && !isCorrectOption ? 'incorrect-selected' : ''}
                          ${isSelected ? 'selected' : ''}`}
                      >
                        <div className="option-content">
                          <span className="option-text">{option.text}</span>
                          <div className="option-markers">
                            {isSelected && (
                              <span className="selected-marker">Your answer</span>
                            )}
                            {isCorrectOption && (
                              <span className="correct-marker">Correct answer</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ManualMcqResult;