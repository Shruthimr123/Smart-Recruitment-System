import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { registerUser } from "../redux/slices/authSlice";
import { fetchRoles } from "../redux/slices/rolesSlice";
import type { RootState } from "../redux/store";
import "./css/AddUsers.css";

const AddUser: React.FC = () => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const { roles } = useSelector((state: RootState) => state.roles);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    roleId: "",
    password: "",
    status: "active", // Set default value
  });

  const [errors, setErrors] = useState({
    name: "",
    email: "",
    phone: "",
    roleId: "",
    password: "",
    status: "",
  });

  useEffect(() => {
    dispatch(fetchRoles());
  }, [dispatch]);

  const validateField = (name: string, value: string) => {
    let error = "";

    switch (name) {
      case "name":
        if (!value.trim()) error = "Name is required";
        else if (!/^[A-Za-z\s]{3,}$/.test(value))
          error = "Name must be at least 3 letters and contain only alphabets";
        break;

      case "email":
        if (!value.trim()) error = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
          error = "Invalid email format";
        break;

      case "phone":
        if (!value.trim()) error = "Phone number is required";
        else if (!/^\d{10}$/.test(value))
          error = "Phone number must be 10 digits";
        break;

      case "roleId":
        if (!value) error = "Please select a role";
        break;

      case "status":
        if (!value) error = "Please select a status";
        break;

      case "password":
        if (!value.trim()) error = "Password is required";
        else if (value.length < 8)
          error = "Password must be at least 8 characters";
        else if (value.length > 16)
          error = "Password must be less than 16 characters";
        else if (!/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_]).+$/.test(value))
          error =
            "Password must include uppercase, lowercase, number, and special character";
        break;

      default:
        break;
    }

    setErrors((prev) => ({ ...prev, [name]: error }));
    return error;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields before submit
    let isValid = true;
    Object.entries(formData).forEach(([key, value]) => {
      const err = validateField(key, value);
      if (err) isValid = false;
    });

    if (!isValid) {
      toast.error("Please fix the validation errors before submitting");
      return;
    }

    try {
      console.log("Submitting form data:", formData);

      const result = await dispatch(registerUser(formData));

      if (registerUser.fulfilled.match(result)) {
        toast.success("User registered successfully!");
        navigate("/all-users"); // Navigate to users list or appropriate page
      } else {
        console.log("Registration failed with payload:", result.payload);
        toast.error(
          "Registration failed: " + (result.payload || "Unknown error")
        );
      }
    } catch (error) {
      console.log("Unexpected error:", error);
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <div className="user-registration-container">
      <div className="user-registration-form-section">
        <h2>Add Users</h2>
        <div className="user-registration-content">
          <form
            className="user-registration-form"
            onSubmit={handleSubmit}
            noValidate
          >
            <div className="user-registration-field-group">
              <input
                type="text"
                name="name"
                placeholder="Full Name:"
                value={formData.name}
                onChange={handleChange}
                className={errors.name ? "user-registration-input-error" : ""}
              />
              {errors.name && (
                <p className="user-registration-error-message">{errors.name}</p>
              )}
            </div>

            <div className="user-registration-field-group">
              <input
                type="email"
                name="email"
                placeholder="Email Id:"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? "user-registration-input-error" : ""}
              />
              {errors.email && (
                <p className="user-registration-error-message">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="user-registration-field-group">
              <input
                type="tel"
                name="phone"
                placeholder="Phone No.:"
                value={formData.phone}
                onChange={handleChange}
                className={errors.phone ? "user-registration-input-error" : ""}
              />
              {errors.phone && (
                <p className="user-registration-error-message">
                  {errors.phone}
                </p>
              )}
            </div>

            <div className="user-registration-field-group">
              <select
                name="roleId"
                value={formData.roleId}
                onChange={handleChange}
                className={errors.roleId ? "user-registration-input-error" : ""}
              >
                <option value="">Select Role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              {errors.roleId && (
                <p className="user-registration-error-message">
                  {errors.roleId}
                </p>
              )}
            </div>

            <div className="user-registration-field-group">
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className={errors.status ? "user-registration-input-error" : ""}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              {errors.status && (
                <p className="user-registration-error-message">
                  {errors.status}
                </p>
              )}
            </div>

            <div className="user-registration-field-group">
              <input
                type="password"
                name="password"
                placeholder="Password:"
                value={formData.password}
                onChange={handleChange}
                className={
                  errors.password ? "user-registration-input-error" : ""
                }
              />
              {errors.password && (
                <p className="user-registration-error-message">
                  {errors.password}
                </p>
              )}
            </div>

            <button type="submit" className="user-registration-submit-btn">
              Register
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddUser;
