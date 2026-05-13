import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './PrivacyPolicy.module.css';

const sections = [
  {
    number: '1.',
    title: 'Data Collection',
    content:
      'We collect information that you provide directly to us, including your name, email address, professional experience, and any other information you choose to provide in your profile or applications.',
  },
  {
    number: '2.',
    title: 'Professional Visibility',
    content:
      'By using StartLnk, you acknowledge that your profile information (excluding private contact details) is visible to other users on the platform to facilitate professional networking and collaboration.',
  },
  {
    number: '3.',
    title: 'Security',
    content:
      'We implement industry-standard security measures to protect your personal information. However, no method of transmission over the internet is 100% secure.',
  },
  {
    number: '4.',
    title: 'Data Usage',
    content:
      'Your data is used solely to operate and improve the StartLnk platform. We do not sell your personal information to third parties. Aggregated, anonymised data may be used for analytics purposes.',
  },
  {
    number: '5.',
    title: 'Cookies',
    content:
      'StartLnk uses cookies to maintain your session and improve your experience. You may disable cookies in your browser settings, but some features of the platform may not function correctly as a result.',
  },
  {
    number: '6.',
    title: 'Your Rights',
    content:
      'You have the right to access, correct, or delete the personal data we hold about you at any time. To exercise these rights, please contact us at startlnk3915@gmail.com.',
  },
];

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.pageContainer}>
      {/* Header — identical structure to About, Contact & FAQ */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <button onClick={() => navigate(-1)} className={styles.backButton}>
            <span className={styles.arrow}>←</span>{' '}
            <span className={styles.backText}>BACK TO APP</span>
          </button>
          <div className={styles.titleGroup}>
            <div className={styles.infoIcon}>🛡</div>
            <h1 className={styles.headerTitle}>Privacy Policy</h1>
          </div>
          <div className={styles.headerSpacer}></div>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        <section className={styles.sectionList}>
          {sections.map((sec, i) => (
            <div key={i} className={styles.section}>
              <h2 className={styles.sectionTitle}>
                {sec.number} {sec.title}
              </h2>
              <p className={styles.sectionContent}>{sec.content}</p>
            </div>
          ))}
        </section>
      </main>

      {/* Footer — identical to About, Contact & FAQ */}
      <footer className={styles.footer}>
        <p className={styles.copyright}>
          &copy; 2026 STARTLNK GLOBAL ECOSYSTEM · ALL RIGHTS RESERVED
        </p>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
