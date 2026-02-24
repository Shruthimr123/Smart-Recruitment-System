interface Option {
  id: string;
  optionText: string;
  isCorrect: boolean;
}

interface MCQ {
  id: string;
  questionTitle: string;
  difficulty: string;
  options: Option[];
}

interface ApiQuestion {
  id: string;
  status: "not_visited" | "skipped" | "answered";
  selectedOptionId: string | null;
  editable: boolean;
  mcq_question: MCQ;
}

interface Props {
  questions: ApiQuestion[];
  currentIndex: number;
  setCurrentIndex: (i: number) => void;
  answeredCount: number;
  onStartNextSection: () => void;
  buttonText: string;
}

const Sidebar = ({
  questions,
  currentIndex,
  setCurrentIndex,
  answeredCount,
  onStartNextSection,
  buttonText,
}: Props) => {
  return (
    <div className="test-sidebar">
      <div className="test-sidebar-header">
        <div className="test-progress">
          Answered: {answeredCount} / {questions.length}
        </div>
      </div>

      <div className="test-question-nav">
        {questions.map((q, idx) => {
          const isCurrent = idx === currentIndex;
          const firstUnansweredIndex = questions.findIndex(
            (q) => q.status === "not_visited"
          );
          const allAttempted = questions.every(
            (q) => q.status === "answered" || q.status === "skipped"
          );

          const allow =
            allAttempted ||
            isCurrent ||
            idx <= firstUnansweredIndex ||
            (idx < currentIndex &&
              (questions[idx].status === "answered" ||
                questions[idx].status === "skipped"));

          return (
            <div
              key={q.id}
              className={`test-question-number ${q.status} ${
                isCurrent ? "active" : ""
              } ${!allow ? "no-pointer disabled" : ""}`}
              onClick={() => allow && setCurrentIndex(idx)}
            >
              {idx + 1}
            </div>
          );
        })}
      </div>

      {questions.length > 0 &&
        questions.every(
          (q) => q.status === "answered" || q.status === "skipped"
        ) && (
          <div className="test-coding-section-button">
            <button
              className="test-submit-section-button"
              onClick={onStartNextSection}
            >
              {buttonText}
            </button>
          </div>
        )}
    </div>
  );
};

export default Sidebar;