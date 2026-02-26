import React from "react";
 
const MalpracticeTerminated = () => {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>⛔</div>
        <h1 style={styles.title}>Test Terminated</h1>
        <p style={styles.message}>
          Your test has been terminated due to multiple policy violations.
        </p>
        <p style={styles.note}>
          Further attempts are not permitted for this assessment.
        </p>
        <div style={styles.footer}>
          <p style={styles.contact}>
            If you believe this is an error, please contact the recruitment team.
          </p>
        </div>
      </div>
    </div>
  );
};
 
const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    padding: "16px",
  } as React.CSSProperties,
 
  card: {
    backgroundColor: "#ffffff",
    padding: "48px 40px",
    borderRadius: "16px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.03)",
    maxWidth: "440px",
    width: "100%",
    textAlign: "center",
    border: "1px solid #edf2f7",
  } as React.CSSProperties,
 
  icon: {
    fontSize: "48px",
    marginBottom: "24px",
    opacity: 0.8,
  } as React.CSSProperties,
 
  title: {
    fontSize: "24px",
    fontWeight: 500,
    marginBottom: "16px",
    color: "#dc2626",
    letterSpacing: "-0.01em",
  } as React.CSSProperties,
 
  message: {
    fontSize: "16px",
    lineHeight: "1.5",
    marginBottom: "12px",
    color: "#374151",
  } as React.CSSProperties,
 
  note: {
    fontSize: "15px",
    color: "#6b7280",
    marginBottom: "32px",
  } as React.CSSProperties,
 
  footer: {
    borderTop: "1px solid #e5e7eb",
    paddingTop: "24px",
  } as React.CSSProperties,
 
  contact: {
    fontSize: "14px",
    color: "#6b7280",
    margin: 0,
    lineHeight: "1.5",
  } as React.CSSProperties,
};
 
export default MalpracticeTerminated;
 