import React from "react";

import "../../src/components/css/LinkExpired.css";

const LinkExpired: React.FC = () => {
  return (
    <div className="link-expired-container">
      <div className="link-expired-card">
        <h1>Test Link Expired</h1>
        <p>This test link has expired and is no longer valid.</p>
        <p className="instruction">
          Please contact your administrator for a new test link or check if you
          have the correct URL.
        </p>
      </div>
    </div>
  );
};

export default LinkExpired;
