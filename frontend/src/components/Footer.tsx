import { FaArrowUp, FaLinkedin } from "react-icons/fa";
import "./css/Footer.css";

const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="footer">
      <div className="footer__container">
        {/* Main CTA Section */}
        <div className="footer__top">
          <div className="footer__content">
            <h2 className="footer__title">
              Need help?{" "}
              <span className="footer__highlight">We're here to assist you</span>
            </h2>
            <p className="footer__description">
              Contact us today to see how we can help bring your technology ideas to life!
            </p>
            <div className="footer__cta">
              <button className="footer__button">
                Get in touch 
                <span className="footer__button-dot"></span>
              </button>
              <a
                href="https://www.linkedin.com/company/mirafra"
                target="_blank"
                rel="noopener noreferrer"
                className="footer__social-link"
                aria-label="Visit our LinkedIn page"
              >
                <FaLinkedin size={18} />
              </a>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="footer__middle">
          <div className="footer__divider"></div>
          <nav className="footer__nav">
            <ul className="footer__nav-list">
              <li className="footer__nav-item">
                <a href="#services" className="footer__nav-link">Services</a>
              </li>
              <li className="footer__nav-item">
                <a href="#industries" className="footer__nav-link">Industries</a>
              </li>
              <li className="footer__nav-item">
                <a href="#about" className="footer__nav-link">About us</a>
              </li>
              <li className="footer__nav-item">
                <a href="#team" className="footer__nav-link">Our team</a>
              </li>
              <li className="footer__nav-item">
                <a href="#careers" className="footer__nav-link">Careers</a>
              </li>
              <li className="footer__nav-item">
                <a href="#resources" className="footer__nav-link">Resources</a>
              </li>
              <li className="footer__nav-item">
                <a href="#news" className="footer__nav-link">News</a>
              </li>
            </ul>
            <a href="#privacy" className="footer__privacy-link">
              Privacy Policy
            </a>
          </nav>
          <div className="footer__divider"></div>
        </div>

        {/* Bottom Section */}
        <div className="footer__bottom">
          <p className="footer__copyright">
            Copyright © 2025 Mirafra Technologies. All rights reserved.
          </p>
          <button 
            onClick={scrollToTop}
            className="footer__scroll-top"
            aria-label="Scroll to top"
          >
            <FaArrowUp size={14} />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;