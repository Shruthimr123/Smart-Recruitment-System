import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import "./css/Login.css";
import { toast } from "sonner";
import PasswordInput from "./PasswordInput";

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // const [touched, setTouched] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error("Invalid reset link");
      setTokenValid(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await axiosInstance.post("/auth/reset-password", {
        token,
        password,
      });

      if (res.data?.message === "Password updated successfully") {
        toast.success("Password reset successfully! Redirecting to login...");
        setTimeout(() => navigate("/login"), 2000);
      }
    } catch (err: any) {
      let msg = "Failed to reset password.";
      if (err.response?.data?.message) {
        msg = Array.isArray(err.response.data.message)
          ? err.response.data.message[0]
          : err.response.data.message;
      }

      toast.error(msg);

      if (msg.includes("no longer valid") || msg.includes("expired")) {
        setTokenValid(false);
      }
    }

  };

  return (
    <div className="login-container">
      <div className="login-form-section">
        <h2>Reset Password</h2>

        <form className="login-form" onSubmit={handleSubmit}>
          <PasswordInput
            name="password"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={!tokenValid}
          />

          <PasswordInput
            name="confirmPassword"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={!tokenValid}
          />
          {(password && confirmPassword && password !== confirmPassword) || error ? (
            <p style={{ color: "red", fontSize: "14px" }}>
              {error || "Passwords do not match!"}
            </p>
          ) : null}

          <button type="submit" disabled={loading || !tokenValid}>
            {loading ? "Resetting..." : "Reset Password"}
          </button>

          {!tokenValid && (
            <p style={{ color: "red", marginBottom: "15px" }}>
              This reset link is no longer valid or has expired.
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
