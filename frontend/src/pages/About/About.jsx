import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './About.module.css';
import SEOHead from '../../components/SEOHead/SEOHead';

const About = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEOHead
        title="About StartLnk — the Startup Collaboration Ecosystem"
        description="StartLnk is Pakistan's leading startup ecosystem connecting founders, investors, developers, and students. Learn about our mission to empower startup collaboration and innovation across Pakistan."
        canonical="https://startlnk.xyz/about"
        og={{ title: "About StartLnk", description: "Pakistan's #1 startup collaboration ecosystem.", url: "https://startlnk.xyz/about" }}
        twitter={{ title: "About StartLnk", description: "Learn about StartLnk's mission to power the startup ecosystem." }}
        schema={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          "name": "About StartLnk",
          "url": "https://startlnk.xyz/about",
          "description": "Pakistan's leading startup collaboration ecosystem."
        }}
      />
      <div className={styles.aboutContainer}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <button onClick={() => navigate(-1)} className={styles.backButton}>
            <span className={styles.arrow}>←</span> <span className={styles.backText}>BACK TO APP</span>
          </button>
          <div className={styles.titleGroup}>
            <div className={styles.infoIcon}>ⓘ</div>
            <h1 className={styles.headerTitle}>About StartLnk</h1>
          </div>
          <div className={styles.headerSpacer}></div>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        <section className={styles.heroSection}>
          <h2 className={styles.heroTitle}>Empowering the next generation of founders.</h2>
          <p className={styles.heroDescription}>
            StartLnk was founded with a single mission: to bridge the gap between visionary entrepreneurs and world-class talent.
            In an era where building a startup is harder than ever, we provide the ecosystem necessary for collaboration to thrive.
          </p>
        </section>

        {/* Feature Cards */}
        <section className={styles.cardsGrid}>
          {/* Card 1: Collaboration */}
          <div className={styles.card}>
            <div className={styles.cardIconWrapper}>
              <svg className={styles.cardIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <h3 className={styles.cardTitle}>Collaboration</h3>
            <p className={styles.cardText}>Find partners who share your passion and complement your skills.</p>
          </div>

          {/* Card 2: Speed */}
          <div className={styles.card}>
            <div className={styles.cardIconWrapper}>
              <svg className={styles.cardIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
              </svg>
            </div>
            <h3 className={styles.cardTitle}>Speed</h3>
            <p className={styles.cardText}>Go from idea to MVP faster by connecting with pre-vetted talent.</p>
          </div>

          {/* Card 3: Vision */}
          <div className={styles.card}>
            <div className={styles.cardIconWrapper}>
              <svg className={styles.cardIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="6"></circle>
                <circle cx="12" cy="12" r="2"></circle>
              </svg>
            </div>
            <h3 className={styles.cardTitle}>Vision</h3>
            <p className={styles.cardText}>Build companies that solve real problems on a global scale.</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <p className={styles.copyright}>&copy; 2026 STARTLNK GLOBAL ECOSYSTEM . ALL RIGHTS RESERVED</p>
      </footer>
    </div>
    </>
  );
};

export default About;
