import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './FAQ.module.css';

const faqs = [
  {
    question: 'How do I join a startup?',
    answer:
      'Browse the Startup Grid, find a project that matches your skills, and click "Apply to Join". Fill out your cover letter and experience to get started.',
  },
  {
    question: 'Is it free to use?',
    answer:
      'StartLnk is free for individuals looking to collaborate. We offer premium features for startups seeking mass recruitment and advanced analytics.',
  },
  {
    question: 'How does revenue sharing work?',
    answer:
      'Revenue sharing agreements are handled directly between founders and collaborators through our standardized legal templates.',
  },
  {
    question: 'Can I list my own startup?',
    answer:
      'Yes! Navigate to the Startup Grid and click the "Create Startup" button to start recruiting your dream team.',
  },
];

const FAQ = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.faqContainer}>
      {/* Header — identical structure to About & Contact */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <button onClick={() => navigate(-1)} className={styles.backButton}>
            <span className={styles.arrow}>←</span>{' '}
            <span className={styles.backText}>BACK TO APP</span>
          </button>
          <div className={styles.titleGroup}>
            <div className={styles.infoIcon}>?</div>
            <h1 className={styles.headerTitle}>Frequently Asked Questions</h1>
          </div>
          <div className={styles.headerSpacer}></div>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        <section className={styles.faqList}>
          {faqs.map((faq, index) => (
            <div key={index} className={styles.faqCard}>
              <h2 className={styles.faqQuestion}>{faq.question}</h2>
              <p className={styles.faqAnswer}>{faq.answer}</p>
            </div>
          ))}
        </section>
      </main>

      {/* Footer — identical to About & Contact */}
      <footer className={styles.footer}>
        <p className={styles.copyright}>
          &copy; 2026 STARTLNK GLOBAL ECOSYSTEM · ALL RIGHTS RESERVED
        </p>
      </footer>
    </div>
  );
};

export default FAQ;
