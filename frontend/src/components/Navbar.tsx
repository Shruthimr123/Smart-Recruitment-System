import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NavLink, useNavigate } from "react-router-dom";
import { logout } from "../redux/slices/authSlice";
import type { RootState } from "../redux/store";
import logo from "../assets/mirafraLogo.svg";
import "./css/Navbar.css";

const Navbar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated
  );
  const role = useSelector((state: RootState) => state.auth.user?.role);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const formatRoleName = (role: string) => {
    return role
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  return (
    <nav className="nav">
      <div className="nav__container">
        {/* Logo*/}
        <div className="nav__logo-section">
          <NavLink to="/" onClick={closeMobileMenu}>
            <img src={logo} className="nav__logo" />
          </NavLink>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className={`nav__toggle ${
            isMobileMenuOpen ? "nav__toggle--active" : ""
          }`}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          <span className="nav__toggle-line"></span>
          <span className="nav__toggle-line"></span>
          <span className="nav__toggle-line"></span>
        </button>

        {/* Navigation Links*/}
        <div
          className={`nav__menu ${isMobileMenuOpen ? "nav__menu--open" : ""}`}
        >
          <ul className="nav__links">
            {isAuthenticated && role === "super admin" && (
              <li className="nav__item">
                <NavLink
                  to="/all-users"
                  className={({ isActive }) =>
                    `nav__link ${isActive ? "nav__link--active" : ""}`
                  }
                  onClick={closeMobileMenu}
                >
                  All Users
                </NavLink>
              </li>
            )}
            {isAuthenticated && role === "super admin" && (
              <li className="nav__item">
                <NavLink
                  to="/add-users"
                  className={({ isActive }) =>
                    `nav__link ${isActive ? "nav__link--active" : ""}`
                  }
                  onClick={closeMobileMenu}
                >
                  Add Users
                </NavLink>
              </li>
            )}
            {isAuthenticated &&
              (role === "super admin" || role === "talent acquisition") && (
                <li className="nav__item">
                  <NavLink
                    to="/test-mode"
                    className={({ isActive }) =>
                      `nav__link ${isActive ? "nav__link--active" : ""}`
                    }
                    onClick={closeMobileMenu}
                  >
                    Send Test
                  </NavLink>
                </li>
              )}
            {isAuthenticated &&
              (role === "super admin" || role === "talent acquisition") && (
                <li className="nav__item">
                  <NavLink
                    to="/jobs"
                    className={({ isActive }) =>
                      `nav__link ${isActive ? "nav__link--active" : ""}`
                    }
                    onClick={closeMobileMenu}
                  >
                    Jobs
                  </NavLink>
                </li>
              )}
            {isAuthenticated &&
              (role === "manager" || role === "super admin") && (
                <li className="nav__item">
                  <NavLink
                    to="/add-questions"
                    className={({ isActive }) =>
                      `nav__link ${isActive ? "nav__link--active" : ""}`
                    }
                    onClick={closeMobileMenu}
                  >
                    Add Questions
                  </NavLink>
                </li>
              )}
            {isAuthenticated &&
              (role === "super admin" ||
                role === "talent acquisition" ||
                role === "manager") && (
                <li className="nav__item">
                  <NavLink
                    to="/view-questions"
                    className={({ isActive }) =>
                      `nav__link ${isActive ? "nav__link--active" : ""}`
                    }
                    onClick={closeMobileMenu}
                  >
                    View Questions
                  </NavLink>
                </li>
              )}
            {isAuthenticated &&
              (role === "super admin" ||
                role === "talent acquisition" ||
                role === "manager") && (
                <li className="nav__item">
                  <NavLink
                    to="/results"
                    className={({ isActive }) =>
                      `nav__link ${isActive ? "nav__link--active" : ""}`
                    }
                    onClick={closeMobileMenu}
                  >
                    Results
                  </NavLink>
                </li>
              )}
          </ul>
        </div>

        <div className="nav__user-section">
          {isAuthenticated ? (
            <div className="nav__user-info">
              <div className="nav__user-badge">
                {formatRoleName(role || "")}
              </div>
              <button
                className="nav__logout-btn"
                onClick={handleLogout}
                aria-label="Logout"
              >
                <svg
                  className="nav__logout-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="m16 17 5-5-5-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M21 12H9"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                Logout
              </button>
            </div>
          ) : (
            <NavLink
              to="/login"
              className="nav__login-btn"
              onClick={closeMobileMenu}
            >
              Login
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
