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
  currentQuestion: ApiQuestion;
  currentIndex: number;
  answers: { [questionId: string]: string };
  handleOptionSelect: (questionId: string, optionId: string) => void;
  handleNext: () => void;
  handleSkip: () => void;
}

const QuestionBlock = ({
  currentQuestion,
  currentIndex,
  answers,
  handleOptionSelect,
  handleNext,
  handleSkip,
}: Props) => {
  const q = currentQuestion;

  return (
    <div className="test-question-block">
      <h2 className="test-title">MCQ Test</h2>
      <p className="test-question-title">
        {currentIndex + 1}. {q.mcq_question.questionTitle}
      </p>

      {!q.editable && (
        <div className="test-edit-warning">
          ⚠️ You've already submitted this answer. You cannot edit it.
        </div>
      )}

      <div className="test-options-list">
        {q.mcq_question.options.map((opt) => (
          <label key={opt.id} className="test-option-item">
            <input
              type="radio"
              name={q.mcq_question.id}
              value={opt.id}
              checked={String(answers[q.mcq_question.id]) === String(opt.id)}
              onChange={() => handleOptionSelect(q.mcq_question.id, opt.id)}
              disabled={!q.editable}
            />
            {opt.optionText}
          </label>
        ))}
      </div>

      <div className="test-action-buttons">
        <button
          className="test-skip-button"
          onClick={handleSkip}
          disabled={q.status === "answered"}
        >
          Skip
        </button>
        <button className="test-next-button" onClick={handleNext}>
          Next
        </button>
      </div>
    </div>
  );
};

export default QuestionBlock;