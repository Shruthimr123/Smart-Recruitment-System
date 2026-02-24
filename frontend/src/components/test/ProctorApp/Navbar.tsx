import { useEffect } from "react";
import { useSelector } from "react-redux";
import { type RootState } from "../../../redux/store";
import logo from "../../../assets/mirafraLogo.svg";
import "./Navbar.css";

interface NavbarProps {
  timeLeft?: number;
  formatTime?: (s: number) => string;
  onTimeUp?: () => void;
  sectionHeader: {
    title: string;
    description?: string;
  } | null;
}

const Navbar = ({
  timeLeft,
  formatTime,
  sectionHeader,
  onTimeUp,
}: NavbarProps) => {
  const capturedImage = useSelector(
    (state: RootState) => state.proctor.capturedImage
  );
  const { started } = useSelector((state: RootState) => state.test);

  // Trigger auto-submit when timer hits 0
  useEffect(() => {
    if (timeLeft === 0 && onTimeUp) {
      onTimeUp();
    }
  }, [timeLeft, onTimeUp]);

  return (
    <nav className="test-navbar">
      <div className="test-navbar__content">
        <img src={logo} alt="Logo" className="test-navbar__logo" />

        {sectionHeader && (
          <div className="navbar-section-info">
            <h4>{sectionHeader.title}</h4>
            {/* {sectionHeader.description && (
              <span className="section-sub">{sectionHeader.description}</span>
            )} */}
          </div>
        )}

        <div className="test-navbar__center">
          {timeLeft !== undefined && formatTime && capturedImage && started && (
            <div className="test-navbar__timer">
              <span className="test-navbar__timer-label">Time Left:</span>
              <span className="test-navbar__timer-value">
                {formatTime(timeLeft)}
              </span>
            </div>
          )}
        </div>

        <div className="test-navbar__right">
          {capturedImage && (
            <div className="test-navbar__user">
              <div className="test-navbar__user-info">
                <span className="test-navbar__user-status">Proctored</span>
              </div>
              <img
                src={capturedImage}
                alt="Captured Face"
                className="test-navbar__captured-image"
                width={40}
                height={40}
              />
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
