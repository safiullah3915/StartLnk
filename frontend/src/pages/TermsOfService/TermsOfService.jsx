import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './TermsOfService.module.css';

const sections = [
  {
    number: '1.',
    title: 'Acceptance of Terms',
    content:
      'By accessing StartLnk, you agree to be bound by these terms. If you do not agree to all terms, you may not use the service.',
  },
  {
    number: '2.',
    title: 'Professional Conduct',
    content:
      'Users must provide accurate information and maintain professional conduct when interacting with other members of the community.',
  },
  {
    number: '3.',
    title: 'Startup Agreements',
    content:
      'StartLnk provides a platform for connection. Any legal or financial agreements made between users are independent of the platform.',
  },
  {
    number: '4.',
    title: 'Intellectual Property',
    content:
      'All content you post on StartLnk remains your intellectual property. By posting, you grant StartLnk a non-exclusive licence to display that content within the platform.',
  },
  {
    number: '5.',
    title: 'Account Termination',
    content:
      'StartLnk reserves the right to suspend or terminate accounts that violate these terms, engage in fraudulent activity, or harm other members of the community.',
  },
  {
    number: '6.',
    title: 'Changes to Terms',
    content:
      'We may update these terms from time to time. Continued use of StartLnk after changes are posted constitutes your acceptance of the revised terms.',
  },
];

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.pageContainer}>
      {/* Header — identical structure to all other static pages */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <button onClick={() => navigate(-1)} className={styles.backButton}>
            <span className={styles.arrow}>←</span>{' '}
            <span className={styles.backText}>BACK TO APP</span>
          </button>
          <div className={styles.titleGroup}>
            <div className={styles.infoIcon}>📄</div>
            <h1 className={styles.headerTitle}>Terms of Service</h1>
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

      {/* Footer — identical to all other static pages */}
      <footer className={styles.footer}>
        <p className={styles.copyright}>
          &copy; 2026 STARTLNK GLOBAL ECOSYSTEM · ALL RIGHTS RESERVED
        </p>
      </footer>
    </div>
  );
};

export default TermsOfService;
