import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import "./css/Jobs.css";

interface Job {
  id: string;
  title: string;
  clientName: string;
  createdAt: string;
  createdBy: string;
}

const Jobs: React.FC = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    title: "",
    clientName: "",
    createdBy: "",
    createdAt: "",
  });

  const [errors, setErrors] = useState({
    title: "",
    clientName: "",
    createdBy: "",
  });

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get("/jobs");
        setJobs(res.data.data);
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const validateField = (name: string, value: string) => {
    let error = "";
    if (["title", "clientName", "createdBy"].includes(name)) {
      if (value && !/^[A-Za-z\s]*$/.test(value)) {
        error = "Only letters and spaces allowed";
      }
    }
    setErrors((prev) => ({ ...prev, [name]: error }));
    return error;
  };

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    key: string
  ) => {
    const { value } = e.target;
    setFilters((prev) => ({ ...prev, [key]: value }));
    if (["title", "clientName", "createdBy"].includes(key)) {
      validateField(key, value);
    }
  };

  const clearFilters = () => {
    setFilters({
      title: "",
      clientName: "",
      createdBy: "",
      createdAt: "",
    });
    setErrors({
      title: "",
      clientName: "",
      createdBy: "",
    });
  };

  const filteredJobs = jobs.filter((job) => {
    const dateFormatted = new Date(job.createdAt).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    return (
      job.title.toLowerCase().includes(filters.title.toLowerCase()) &&
      job.clientName.toLowerCase().includes(filters.clientName.toLowerCase()) &&
      job.createdBy.toLowerCase().includes(filters.createdBy.toLowerCase()) &&
      dateFormatted.toLowerCase().includes(filters.createdAt.toLowerCase())
    );
  });

  return (
    <div className="jobs-container">
      <div className="jobs-header">
        <div className="header-title">
          <h2>List of Jobs</h2>
          <span className="jobs-count">{filteredJobs.length} jobs</span>
        </div>
        <div className="header-actions">
          <button
            className="add-job-button"
            onClick={() => navigate("/add-job")}
          >
            Add Job
          </button>
          <button className="clear-filters-button" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading jobs...</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="jobs-table">
            <thead>
              <tr>
                <th>
                  <div className="header-content">
                    <span className="header-label">Title</span>
                    <input
                      type="text"
                      placeholder="Search title"
                      value={filters.title}
                      onChange={(e) => handleFilterChange(e, "title")}
                      className="filter-input"
                    />
                    {errors.title && (
                      <span className="error-text">{errors.title}</span>
                    )}
                  </div>
                </th>
                <th>
                  <div className="header-content">
                    <span className="header-label">Client Name</span>
                    <input
                      type="text"
                      placeholder="Search client"
                      value={filters.clientName}
                      onChange={(e) => handleFilterChange(e, "clientName")}
                      className="filter-input"
                    />
                    {errors.clientName && (
                      <span className="error-text">{errors.clientName}</span>
                    )}
                  </div>
                </th>
                <th>
                  <div className="header-content">
                    <span className="header-label">Created By</span>
                    <input
                      type="text"
                      placeholder="Search creator"
                      value={filters.createdBy}
                      onChange={(e) => handleFilterChange(e, "createdBy")}
                      className="filter-input"
                    />
                    {errors.createdBy && (
                      <span className="error-text">{errors.createdBy}</span>
                    )}
                  </div>
                </th>
                <th>
                  <div className="header-content">
                    <span className="header-label">Created At</span>
                    <input
                      type="text"
                      placeholder="Search date"
                      value={filters.createdAt}
                      onChange={(e) => handleFilterChange(e, "createdAt")}
                      className="filter-input"
                    />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.length > 0 ? (
                filteredJobs.map((job) => (
                  <tr key={job.id} className="job-row">
                    <td className="job-title">{job.title}</td>
                    <td className="job-client">{job.clientName}</td>
                    <td className="job-creator">{job.createdBy}</td>
                    <td className="job-date">
                      {new Date(job.createdAt).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="empty-state">
                    <h3>No jobs found</h3>
                    <p>Try adjusting your filters or add a new job</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Jobs;
