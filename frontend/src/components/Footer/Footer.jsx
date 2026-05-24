import React from "react";
import styles from "./Footer.module.css";
import { useAuth } from "../../contexts/AuthContext";
import { useLocation, Link } from "react-router-dom";

const Footer = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const showFullFooter = !isAuthenticated && location.pathname === "/";

  return (
    <footer className={styles.footer}>
      {showFullFooter && (
        <div className={styles.footer_content}>
          <div className={styles.footer_section}>
            <div className={styles.social_icons}>
              <a
                href="https://www.facebook.com/share/1Hc38AfWBX/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.icon}
              >
                <img
                  className={styles.icons}
                  src="/facebook_icon.png"
                  alt="Facebook"
                />
              </a>
              <a
                href="https://www.instagram.com/startlnk"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.icon}
              >
                <img
                  className={styles.icons}
                  src="/Instagram.png"
                  alt="Instagram"
                />
              </a>
            </div>
          </div>

          <div className={styles.links_container}>
            <div className={styles.link_group}>
              <h3>PRODUCT</h3>
              <ul>
                <li>
                  <Link to="/search">Explore Startups</Link>
                </li>
                <li>
                  <Link to="/collaboration">Find Opportunities</Link>
                </li>
                <li>
                  <Link to="/people">Discover Talent</Link>
                </li>
              </ul>
            </div>

            <div className={styles.link_group}>
              <h3>COMPANY</h3>
              <ul>
                <li>
                  <Link to="/about">About</Link>
                </li>
                <li>
                  <Link to="/contact">Contact</Link>
                </li>
              </ul>
            </div>

            <div className={styles.link_group}>
              <h3>SUPPORT</h3>
              <ul>
                <li>
                  <Link to="/faq">FAQ</Link>
                </li>
              </ul>
            </div>

            <div className={styles.link_group}>
              <h3>LEGAL</h3>
              <ul>
                <li>
                  <Link to="/privacy">Privacy Policy</Link>
                </li>
                <li>
                  <Link to="/terms">Terms of Service</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className={styles.footer_bottom}>
        <p>&copy; 2026 StartLnk. All rights reserved. Product by <a href="https://www.linkedin.com/company/spectramind-ai/" target="_blank" rel="noopener noreferrer" style={{color: 'inherit', textDecoration: 'underline', cursor: 'pointer'}}>SpectraMind AI</a></p>
      </div>
    </footer>
  );
};

export { Footer };
