import React, { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

interface PasswordInputProps {
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
}

const PasswordInput: React.FC<PasswordInputProps> = ({
    name,
    value,
    onChange,
    placeholder = "Password",
    required = false,
    disabled = false,
}) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="password-container">
            <input
                type={showPassword ? "text" : "password"}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                className="password-input"
            />

            <span
                className="password-eye"
                onClick={() => setShowPassword((prev) => !prev)}
            >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
        </div>
    );
};

export default PasswordInput;