import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import axiosInstance from "../../api/axiosInstance";
import { useLocation, useNavigate } from "react-router-dom";
import "../css/SelectMCQs.css";

interface MCQ {
  id: string;
  questionTitle: string;
  difficulty: string;
  skill: { id: string; name: string };
}

const SelectMCQs: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedFromRoute: string[] = location.state?.manualMcqs || [];
  const selectedSkillFromRoute: string = location.state?.selectedSkill || "";

  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [selectedMcqs, setSelectedMcqs] = useState<string[]>(selectedFromRoute);
  const [difficultyFilter, setDifficultyFilter] = useState("");

  useEffect(() => {
    if (!selectedSkillFromRoute) {
      toast.error("No skill selected.");
      return;
    }

    const fetchMCQs = async () => {
      try {
        const res = await axiosInstance.get(
          `/mcq-questions/by-skill/${selectedSkillFromRoute}`
        );
        const data: MCQ[] = Array.isArray(res.data.data) ? res.data.data : [];
        setMcqs(data);
        if (data.length === 0) toast.info("No questions returned for this skill.");
      } catch (error) {
        console.error(error);
        toast.error("Failed to load questions.");
      }
    };

    fetchMCQs();
  }, [selectedSkillFromRoute]);

  const toggleSelect = (id: string) => {
    setSelectedMcqs((prev) =>
      prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    navigate("/send-test", {
      state: { selectedMcqs, selectedSkill: selectedSkillFromRoute},
    });
  };

  const difficultyCounts = mcqs.reduce((acc, q) => {
    const key = q.difficulty.toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const displayedMcqs = difficultyFilter
    ? mcqs.filter(
        (q) => q.difficulty.toLowerCase() === difficultyFilter.toLowerCase()
      )
    : mcqs;

  return (
    <div className="select-mcqs-container">
      <h2>
        Select Questions for Skill:{" "}
        <span className="skill-name">
          {mcqs[0]?.skill.name || "(Unknown Skill)"}
        </span>
      </h2>

      <div className="filters">
        <label>Filter by Difficulty:</label>
        <select
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
        >
          <option value="">All</option>
          <option value="easy">Easy ({difficultyCounts["easy"] || 0})</option>
          <option value="medium">Medium ({difficultyCounts["medium"] || 0})</option>
          <option value="hard">Hard ({difficultyCounts["hard"] || 0})</option>
        </select>
      </div>

      <div className="mcq-list">
        {displayedMcqs.length === 0 ? (
          <p>No questions found for this skill.</p>
        ) : (
          displayedMcqs.map((q) => (
            <label
              key={q.id}
              className={`mcq-item ${selectedMcqs.includes(q.id) ? "selected" : ""}`}
            >
              <input
                type="checkbox"
                checked={selectedMcqs.includes(q.id)}
                onChange={() => toggleSelect(q.id)}
              />
              <span className="question-text">{q.questionTitle}</span>
              <span className={`difficulty ${q.difficulty.toLowerCase()}`}>
                {q.difficulty}
              </span>
            </label>
          ))
        )}
      </div>

      <div className="mcq-actions">
        <p>Selected: {selectedMcqs.length} / 30</p>
        <button className="save-btn" onClick={handleSave}>
          Save & Go Back
        </button>
      </div>
    </div>
  );
};

export default SelectMCQs;
