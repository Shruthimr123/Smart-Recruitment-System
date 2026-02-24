import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import "./css/AddJob.css";

const AddJob: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    job: "",
    client: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const createdBy = user?.id || "";

    if (!createdBy) {
      toast.error("User ID not found. Please login again.");
      return;
    }

    try {
      toast.success("Job added successfully!");

      setFormData({ job: "", client: "" });
      navigate("/jobs");
    } catch (error) {
      toast.error("Failed to add job.");
    }
  };

  return (
    <div className="add-job-wrapper">
      <h2 className="add-job-title">Add Job</h2>
      <div className="add-job-container">
        <form className="job-form" onSubmit={handleSubmit}>
          <input
            type="text"
            name="job"
            placeholder="Job Title"
            value={formData.job}
            onChange={handleChange}
            required
            className="job-input"
          />

          <input
            type="text"
            name="client"
            placeholder="Client Name"
            value={formData.client}
            onChange={handleChange}
            required
            className="job-input"
          />

          <button type="submit" className="full-width-submit-btn">
            Add Job
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddJob;
