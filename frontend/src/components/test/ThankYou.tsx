import React, { useEffect } from "react";
import logo from "../../assets/mirafraLogo.svg";

import { useNavigate } from "react-router-dom";
import "../css/ThankYou.css";

const ThankYou: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Push the current page into history stack
    window.history.pushState(null, "", window.location.href);

    const handleBack = () => {
      // Whenever user presses back, push this page again
      window.history.pushState(null, "", window.location.href);
      navigate("/attempts-exceeded", { replace: true });
    };

    window.addEventListener("popstate", handleBack);
    return () => {
      window.removeEventListener("popstate", handleBack);
    };
  }, [navigate]);

  return (
    <div className="thank-you-container">
      <div className="thank-you-card">
        <div className="success-icon">
          <img src={logo} alt="logo" />
        </div>
        <h1>Test Completed Successfully!</h1>
        <p>Your test has been submitted and saved securely.</p>
        <p className="instruction">
          You can now safely close this browser window.
        </p>
      </div>
    </div>
  );
};

export default ThankYou;
