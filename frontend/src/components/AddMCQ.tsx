import React, { useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import axiosInstance from "../api/axiosInstance";
import "./css/AddMCQ.css";

const AddMCQ = () => {
  const [formData, setFormData] = useState({
    skill: "",
    difficulty: "",
    question: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    answerKey: "",
  });

  const [submitting, setSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    const {
      skill,
      difficulty,
      question,
      optionA,
      optionB,
      optionC,
      optionD,
      answerKey,
    } = formData;
    if (
      !skill.trim() ||
      !difficulty.trim() ||
      !question.trim() ||
      !optionA.trim() ||
      !optionB.trim() ||
      !optionC.trim() ||
      !optionD.trim()
    ) {
      toast.error("Please fill in all fields.");
      return false;
    }
    if (!["a", "b", "c", "d"].includes(answerKey.toLowerCase())) {
      toast.error("Answer key must be one of a, b, c, or d.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const createdBy = user?.id || "";

    const payload = {
      skill: formData.skill,
      difficulty: formData.difficulty,
      questionTitle: formData.question,
      createdBy: createdBy,
      options: [
        {
          optionText: formData.optionA,
          isCorrect: formData.answerKey.toLowerCase() === "a",
        },
        {
          optionText: formData.optionB,
          isCorrect: formData.answerKey.toLowerCase() === "b",
        },
        {
          optionText: formData.optionC,
          isCorrect: formData.answerKey.toLowerCase() === "c",
        },
        {
          optionText: formData.optionD,
          isCorrect: formData.answerKey.toLowerCase() === "d",
        },
      ],
    };

    try {
      const res = await axiosInstance.post("/mcq-questions", payload);
      if (res.data.statuscode === "201") {
        toast.success("MCQ Created! ID: " + res.data.data.questionId);
        setFormData({
          skill: "",
          difficulty: "",
          question: "",
          optionA: "",
          optionB: "",
          optionC: "",
          optionD: "",
          answerKey: "",
        });
      }
    } catch (err) {
      toast.error("Error adding question!");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadClick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const createdBy = user?.id || "";

      const mcqPayloads = (jsonData as any[]).map((row) => {
        const answerKeys = String(row.answerKey || "")
          .split(",")
          .map((key) => key.trim().toLowerCase());

        const clean = (val: any) =>
          val !== undefined && val !== null ? String(val).trim() : "";

        return {
          skill: clean(row.skill),
          difficulty: clean(row.difficulty).toLowerCase(),
          questionTitle: clean(row.questionTitle),
          createdBy,
          options: [
            {
              optionText: clean(row.optionA),
              isCorrect: answerKeys.includes("a"),
            },
            {
              optionText: clean(row.optionB),
              isCorrect: answerKeys.includes("b"),
            },
            {
              optionText: clean(row.optionC),
              isCorrect: answerKeys.includes("c"),
            },
            {
              optionText: clean(row.optionD),
              isCorrect: answerKeys.includes("d"),
            },
          ],
        };
      });

      let successCount = 0;
      let failCount = 0;

      for (const [, payload] of mcqPayloads.entries()) {
        if (
          !payload.questionTitle ||
          payload.options.every((opt) => !opt.optionText)
        ) {
          failCount++;
          continue;
        }

        try {
          await axiosInstance.post("/mcq-questions", payload);
          successCount++;
        } catch (err: any) {
          failCount++;
        }
      }

      toast.success(`${successCount} questions uploaded successfully!`);
      if (failCount > 0) {
        toast.error(`${failCount} questions failed to upload.`);
      }
    };

    reader.readAsBinaryString(file);
  };

  return (
    <div className="add-mcq-container">
      <div className="add-mcq-header">
        <div className="header-content">
          <h1>Add MCQ Question</h1>
          <p>
            Create individual questions or upload multiple questions via Excel
          </p>
        </div>
        <div className="header-actions">
          <div className="file-actions">
            <label htmlFor="xlsxUpload" className="upload-btn">
              Upload XLSX
            </label>
            <input
              id="xlsxUpload"
              type="file"
              accept=".xlsx, .xls"
              onChange={handleUploadClick}
              hidden
            />
            <a
              href="src/assets/template.xlsx"
              download
              className="download-btn"
            >
              Download Template
            </a>
          </div>
        </div>
      </div>

      <div className="add-mcq-content">
        <div className="form-card">
          <h2>Create New Question</h2>
          <form onSubmit={handleSubmit} className="mcq-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="skill">Skill *</label>
                <input
                  id="skill"
                  type="text"
                  name="skill"
                  placeholder="Enter skill (e.g., JavaScript, Python)"
                  value={formData.skill}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="difficulty">Difficulty *</label>
                <select
                  id="difficulty"
                  name="difficulty"
                  value={formData.difficulty}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Difficulty</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="question">Question *</label>
              <input
                id="question"
                type="text"
                name="question"
                placeholder="Enter your question here"
                value={formData.question}
                onChange={handleChange}
                required
              />
            </div>

            <div className="options-grid">
              <div className="form-group">
                <label htmlFor="optionA">Option A *</label>
                <input
                  id="optionA"
                  type="text"
                  name="optionA"
                  placeholder="Enter option A"
                  value={formData.optionA}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="optionB">Option B *</label>
                <input
                  id="optionB"
                  type="text"
                  name="optionB"
                  placeholder="Enter option B"
                  value={formData.optionB}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="optionC">Option C *</label>
                <input
                  id="optionC"
                  type="text"
                  name="optionC"
                  placeholder="Enter option C"
                  value={formData.optionC}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="optionD">Option D *</label>
                <input
                  id="optionD"
                  type="text"
                  name="optionD"
                  placeholder="Enter option D"
                  value={formData.optionD}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="answerKey">Correct Answer *</label>
              <select
                id="answerKey"
                name="answerKey"
                value={formData.answerKey}
                onChange={handleChange}
                required
              >
                <option value="">Select Correct Option</option>
                <option value="a">Option A</option>
                <option value="b">Option B</option>
                <option value="c">Option C</option>
                <option value="d">Option D</option>
              </select>
            </div>

            <button
              type="submit"
              className="full-width-submit-btn"
              disabled={submitting}
            >
              {submitting ? "🔄 Adding Question..." : "Add Question"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddMCQ;
