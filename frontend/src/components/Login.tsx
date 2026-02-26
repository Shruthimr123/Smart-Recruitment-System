import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { loginUser } from "../redux/slices/authSlice";
import type { RootState } from "../redux/store";
import placeholder from "../assets/add-user-placeholder.png";
import "./css/Login.css";
import PasswordInput from "../components/PasswordInput";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<any>();
  const authState = useSelector((state: RootState) => state.auth);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const resultAction = await dispatch(loginUser(formData));

    if (loginUser.fulfilled.match(resultAction)) {
      // alert('Login successful!');
      toast.success("Login successful!");
      navigate("/");
    } else {
      console.error("Login failed:", resultAction.payload);
      toast.error("Login failed!");
    }
  };

  return (
    <div className="login-container">
      <div className="login-form-section">
        <h2>
          Log in to <span className="highlight">mirafra</span>
        </h2>
        <form className="login-form" onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Email Id"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <PasswordInput
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <div className="forgot-password">
            <Link to="/forgot-password">Forgot Password?</Link>
          </div>
          <button type="submit" disabled={authState.loading}>
            {authState.loading ? "Logging in..." : "Log in"}
          </button>
          {authState.error && <p className="error">{authState.error}</p>}
        </form>
      </div>
      <div className="login-image-section">
        <img
          src={placeholder}
          alt="login-placeholder"
          className="login-graphic"
        />
      </div>
    </div>
  );
};

export default Login;
