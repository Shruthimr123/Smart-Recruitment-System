import React from "react";
import { useNavigate } from "react-router-dom";
import "../components/css/NotFound.css";

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate("/");
  };

  return (
    <div className="not-found-container">
      <div className="not-found-card">
        <h1>404 - Page Not Found</h1>
        <p>The page you're looking for doesn't exist or has been moved.</p>

        <div className="not-found-actions">
          <button className="not-found-btn primary" onClick={handleGoHome}>
            Go Home
          </button>
          <button className="not-found-btn secondary" onClick={handleGoBack}>
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
