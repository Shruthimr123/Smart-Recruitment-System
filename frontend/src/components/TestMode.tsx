import React from "react";
import { useNavigate } from "react-router-dom";
import "./css/AddQuestions.css";

const TestMode: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="add-questions-containers">
      <h2>Choose the Test Mode</h2>
      <div className="button-container">
        <button
          className="question-buttons"
          onClick={() => navigate("/send-test")}
        >
          <div className="icon">Manual</div>
          <div>
            <div>Manual</div>
            <div>Mode</div>
          </div>
        </button>

        <button
          className="question-buttons"
          onClick={() => navigate("/ai-mode")}
        >
          <div className="icon">AI</div>
          <div>
            <div>AI</div>
            <div>Mode</div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default TestMode;