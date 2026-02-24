import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import axiosInstance from "../api/axiosInstance";
import "./css/AiMcqResults.css";

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

const AiMcqResult = ({ applicantId }: { applicantId: string }) => {


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

  // =========================
  // OVERALL SCORE
  // =========================
  

const overallScore = useMemo(() => {
  if (!mcqs)
    return { correct: 0, total: 0, percentage: 0 };

  let correct = 0;
  const total = mcqs.length;

  mcqs.forEach((q: MCQ) => {
    const correctOption = q.options.find((o) => o.isCorrect);
    const isCorrect =
      correctOption && q.selectedOption?.id === correctOption.id;

    if (isCorrect) correct++;
  });

  return {
    correct,
    total,
    percentage:
      total > 0
        ? Math.round((correct / total) * 100)
        : 0,
  };
}, [mcqs]);


  // =========================
  // LEVEL WISE STATS
  // =========================
  const levelStats = useMemo(() => {
    if (!mcqs) return null;

    const levels = {
      easy: { total: 0, correct: 0, attempted: 0 },
      medium: { total: 0, correct: 0, attempted: 0 },
      hard: { total: 0, correct: 0, attempted: 0 },
    };

    mcqs.forEach((q: MCQ) => {
      const level = q.difficulty.toLowerCase() as
        | "easy"
        | "medium"
        | "hard";

      levels[level].total++;

      const correctOption = q.options.find((o) => o.isCorrect);
      const isAttempted = !!q.selectedOption;
      const isCorrect =
        correctOption && q.selectedOption?.id === correctOption.id;

      if (isAttempted) levels[level].attempted++;
      if (isCorrect) levels[level].correct++;
    });

    return levels;
  }, [mcqs]);

  const getPercentage = (correct: number, total: number) =>
    total ? Math.round((correct / total) * 100) : 0;

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
    return <div className="ai-mcq-result-container">Loading...</div>;
  }

  if (isError) {
    return (
      <div className="ai-mcq-result-container">
        <p>{(error as Error).message}</p>
      </div>
    );
  }

  if (!mcqs || mcqs.length === 0) {
    return (
      <div className="ai-mcq-result-container">
        No MCQ Results Found
      </div>
    );
  }

  return (
    <div className="ai-mcq-result-container">
      {/* HEADER */}
      <div className="ai-mcq-result-header">
        <h2>Performance Overview</h2>
      </div>

   
     {/* ================= PERFORMANCE OVERVIEW ================= */}
<div className="ai-performance-card">    
<div className="ai-performance-overview">
  {/* <h2>Performance Overview</h2> */}

  {/* Overall Score */}
  <div className="ai-overall-score-section">
    <div className="ai-overall-circle-wrapper">
      <svg viewBox="0 0 36 36" className="ai-circle-chart large">
        <path
          className="ai-circle-bg"
          d="M18 2.0845
            a 15.9155 15.9155 0 0 1 0 31.831
            a 15.9155 15.9155 0 0 1 0 -31.831"
        />
        <path
          className="ai-circle"
          stroke="#467cf0"

          strokeDasharray={`${Math.round(overallScore.percentage)}, 100`}
          d="M18 2.0845
            a 15.9155 15.9155 0 0 1 0 31.831
            a 15.9155 15.9155 0 0 1 0 -31.831"
        />
      </svg>

      <div className="ai-circle-text large-text">
        {Math.round(overallScore.percentage)}%
      </div>
    </div>

    <div className="ai-overall-details">
      <h3>Overall Score</h3>
      <p>
        {overallScore.correct} / {overallScore.total}  
      </p>
    </div>
  </div>

  {/* Difficulty Breakdown */}
  <div className="ai-difficulty-breakdown">
    {["easy", "medium", "hard"].map((level) => {
      const stats =
        levelStats?.[level as keyof typeof levelStats];

      if (!stats) return null;

      const accuracy = getPercentage(
        stats.correct,
        stats.total
      );

      return (
        <div key={level} className="ai-difficulty-metric">
          <div
            className="ai-difficulty-label"
            style={{ color: getDifficultyColor(level) }}
          >
            {level.toUpperCase()}
          </div>

          <div className="ai-mini-circle-wrapper">
            <svg viewBox="0 0 36 36" className="ai-circle-chart small">
              <path
                className="ai-circle-bg"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="ai-circle"
                stroke={getScoreColor(accuracy)}
                strokeDasharray={`${accuracy}, 100`}
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="ai-circle-text small-text">
              {accuracy}%
            </div>
          </div>

          <div className="ai-difficulty-stats-clean">
            <span>{stats.correct}/{stats.total} Correct</span>
            
          </div>
        </div>
      );
    })}
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

              <span className="question-number">
                Q{idx + 1}
              </span>
            </div>

            <div className={`status-indicator ${isCorrect ? 'correct' : 'incorrect'}`}>
              {isCorrect ? '✅ Correct' : '❌ Incorrect'}
            </div>
          </div>

          {/* Question Title */}
          <h4 className="question-title">
            {mcq.questionTitle}
          </h4>

          {/* Options */}
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
                    <span className="option-text">
                      {option.text}
                    </span>

                    <div className="option-markers">
                      {isSelected && (
                        <span className="selected-marker">
                          Your answer
                        </span>
                      )}

                      {isCorrectOption && (
                        <span className="correct-marker">
                          Correct answer
                        </span>
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

export default  AiMcqResult;