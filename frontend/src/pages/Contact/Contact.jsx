import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Contact.module.css';

const Contact = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.contactContainer}>
      {/* Header — same structure as About page */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <button onClick={() => navigate(-1)} className={styles.backButton}>
            <span className={styles.arrow}>←</span> <span className={styles.backText}>BACK TO APP</span>
          </button>
          <div className={styles.titleGroup}>
            <div className={styles.infoIcon}>✉</div>
            <h1 className={styles.headerTitle}>Get in Touch</h1>
          </div>
          <div className={styles.headerSpacer}></div>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        <section className={styles.heroSection}>
          <h2 className={styles.heroTitle}>We're here to help.</h2>
          <p className={styles.heroDescription}>
            Have questions about joining a startup or recruiting talent? Reach out to our team.
          </p>
        </section>

        {/* Contact Cards — only email */}
        <section className={styles.cardsSection}>
          <div className={styles.card}>
            <div className={styles.cardIconWrapper}>
              <svg className={styles.cardIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            </div>
            <div className={styles.cardBody}>
              <span className={styles.cardLabel}>SUPPORT EMAIL</span>
              <a href="mailto:startlnk3915@gmail.com" className={styles.cardValue}>startlnk3915@gmail.com</a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer — same as About page */}
      <footer className={styles.footer}>
        <p className={styles.copyright}>&copy; 2026 STARTLNK GLOBAL ECOSYSTEM · ALL RIGHTS RESERVED</p>
      </footer>
    </div>
  );
};

export default Contact;
