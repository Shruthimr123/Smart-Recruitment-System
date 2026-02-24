import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import type { RootState } from "../redux/store";
import "./css/Home.css";
import Dashboard from "./Dashboard";

function Home() {
  const navigate = useNavigate();
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated
  );

  return (
    <div className="app-container">
      <div className="dashboard-section">
        {isAuthenticated && <Dashboard />}
      </div>

      {!isAuthenticated && (
        <>
          {/* Hero Section */}
          <section className="hero-section">
            <div className="hero-content">
              <div className="hero-text">
                <h1 className="hero-title">
                  Transform Your Hiring Process with
                  <span className="gradient-text">
                    {" "}
                    Intelligent Recruitment
                  </span>
                </h1>
                <p className="hero-description">
                  A smart recruitment system with secure AI proctoring —
                  designed to simplify hiring, ensure fair assessments, and give
                  every candidate a chance to shine.
                </p>
                <div className="hero-actions">
                  <button
                    className="cta-button primary"
                    onClick={() => navigate("/login")}
                  >
                    Get Started
                  </button>
                  {/* <button 
                    className="cta-button secondary"
                    onClick={() => navigate('/about')}
                  >
                    Learn More
                  </button> */}
                </div>
              </div>
              <div className="hero-visual">
                <div className="floating-card card-1">
                  <div className="card-icon">📊</div>
                  <h4>AI-Powered Analytics</h4>
                  <p>Smart candidate matching</p>
                </div>
                <div className="floating-card card-2">
                  <div className="card-icon">🛡️</div>
                  <h4>Secure Proctoring</h4>
                  <p>Fair assessment guarantee</p>
                </div>
                <div className="floating-card card-3">
                  <div className="card-icon">⚡</div>
                  <h4>Fast Screening</h4>
                  <p>Reduce hiring time by 70%</p>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="features-section">
            <div className="features-container">
              <h2 className="section-title">Why Choose Our Platform?</h2>
              <div className="features-grid">
                <div className="feature-card">
                  <div className="feature-icon">🎯</div>
                  <h3>AI-Powered Precision</h3>
                  <p>
                    Advanced algorithms ensure accurate candidate-job matching
                    with intelligent skill assessment and compatibility analysis
                  </p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">🔒</div>
                  <h3>Secure Proctoring</h3>
                  <p>
                    Multi-layered security with real-time monitoring to maintain
                    assessment integrity and prevent malpractice
                  </p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">🚀</div>
                  <h3>Efficient Workflow</h3>
                  <p>
                    Streamlined hiring process that reduces time-to-hire by up
                    to 70% while maintaining quality standards
                  </p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">📊</div>
                  <h3>Data-Driven Insights</h3>
                  <p>
                    Comprehensive analytics and reporting for informed
                    decision-making and continuous process improvement
                  </p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">⚖️</div>
                  <h3>Bias-Free Assessment</h3>
                  <p>
                    Objective evaluation system designed to eliminate
                    unconscious bias and promote diversity in hiring
                  </p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">💼</div>
                  <h3>Enterprise Ready</h3>
                  <p>
                    Scalable solution that adapts to organizations of all sizes
                    with robust security and compliance features
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Team Section */}
          {/* <section className="team-section">
            <MeetOurTeam />
          </section> */}
        </>
      )}
    </div>
  );
}

export default Home;
