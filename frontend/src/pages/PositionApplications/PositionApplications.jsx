import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/Navbar/Navbar';
import { Footer } from '../../components/Footer/Footer';
import styles from './PositionApplications.module.css';
import { positionAPI, applicationAPI } from '../../utils/apiServices';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

const PositionApplications = () => {
  const { positionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [position, setPosition] = useState(null);
  const [startup, setStartup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applicationConfirm, setApplicationConfirm] = useState(null);

  useEffect(() => {
    loadApplications();
  }, [positionId]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const response = await positionAPI.getPositionApplications(positionId);
      console.log('Position applications response:', response.data);
      
      setApplications(response.data.applications || []);
      setPosition(response.data.position);
      setStartup(response.data.startup);
    } catch (error) {
      console.error('Failed to load applications:', error);
      toast.error('Failed to load applications');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveApplication = async (applicationId) => {
    setApplicationConfirm({ applicationId, action: 'approve' });
  };

  const confirmApplicationAction = async () => {
    if (!applicationConfirm) return;

    const { applicationId, action } = applicationConfirm;
    try {
      if (action === 'approve') {
        const response = await applicationAPI.approveApplication(applicationId);
        toast.success('Application approved successfully! Opening chat...');

        const conversationId = response.data?.conversation_id;
        if (conversationId) {
          setTimeout(() => {
            navigate(`/message?conversation=${conversationId}`);
          }, 1000);
        } else {
          setTimeout(() => {
            navigate('/message');
          }, 1000);
        }
      } else {
        await applicationAPI.declineApplication(applicationId);
        toast.success('Application declined');
      }
      setApplicationConfirm(null);
      loadApplications();
    } catch (error) {
      console.error(`Failed to ${action} application:`, error);
      console.error('Error response:', error.response);
      toast.error(error.response?.data?.detail || `Failed to ${action} application`);
    }
  };

  const handleDeclineApplication = async (applicationId) => {
    setApplicationConfirm({ applicationId, action: 'decline' });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'approved':
        return styles.statusApproved;
      case 'rejected':
        return styles.statusRejected;
      case 'pending':
        return styles.statusPending;
      default:
        return styles.statusPending;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className={styles.container}>
          <div className={styles.loading}>Loading applications...</div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      {applicationConfirm && (
        <div
          className={styles.confirmOverlay}
          role="dialog"
          aria-modal="true"
          onClick={() => setApplicationConfirm(null)}
        >
          <div className={styles.confirmCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmHeader}>
              <h4 className={styles.confirmTitle}>
                {applicationConfirm.action === 'approve' ? 'Confirm Approval' : 'Confirm Decline'}
              </h4>
              <button
                type="button"
                className={styles.confirmClose}
                onClick={() => setApplicationConfirm(null)}
              >
                &times;
              </button>
            </div>
            <div
              className={`${styles.confirmWarning} ${
                applicationConfirm.action === 'approve' ? styles.confirmWarningApprove : ''
              }`}
            >
              <span className={styles.confirmWarningIcon}>!</span>
              <p>
                {applicationConfirm.action === 'approve'
                  ? 'Are you sure you want to approve this application?'
                  : 'Are you sure you want to decline this application?'}
              </p>
            </div>
            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.confirmCancel}
                onClick={() => setApplicationConfirm(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.confirmDelete} ${
                  applicationConfirm.action === 'approve' ? styles.confirmApprove : ''
                }`}
                onClick={confirmApplicationAction}
              >
                {applicationConfirm.action === 'approve' ? 'Approve Application' : 'Decline Application'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div>
              <Link to={`/startups/${startup?.id}/positions`} className={styles.backLink}>
                ← Back to Positions
              </Link>
              <h1>Applications for Position</h1>
              {position && (
                <div className={styles.positionInfo}>
                  <h2>{position.title}</h2>
                  {startup && (
                    <p className={styles.startupName}>at {startup.title}</p>
                  )}
                  {position.description && (
                    <p className={styles.positionDescription}>{position.description}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.applicationsSection}>
          <div className={styles.sectionHeader}>
            <h3>Applications ({applications.length})</h3>
            <p>Review and manage applications for this position</p>
          </div>

          {applications.length === 0 ? (
            <div className={styles.emptyState}>
              <h4>No applications yet</h4>
              <p>No one has applied for this position yet. Check back later or share the position to attract candidates.</p>
            </div>
          ) : (
            <div className={styles.applicationsList}>
              {applications.map((application) => (
                <div key={application.id} className={styles.applicationCard}>
                  <div className={styles.applicationHeader}>
                    <div className={styles.applicantInfo}>
                      <h4>{application.applicant?.username || 'Unknown Applicant'}</h4>
                      <p className={styles.applicantEmail}>{application.applicant?.email || ''}</p>
                      <p className={styles.applicationDate}>
                        Applied on {formatDate(application.created_at)}
                      </p>
                    </div>
                    <span className={`${styles.statusBadge} ${getStatusBadgeClass(application.status)}`}>
                      {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                    </span>
                  </div>

                  <div className={styles.applicationContent}>
                    {application.cover_letter && (
                      <div className={styles.contentSection}>
                        <h5>Cover Letter</h5>
                        <p>{application.cover_letter}</p>
                      </div>
                    )}

                    {application.experience && (
                      <div className={styles.contentSection}>
                        <h5>Experience</h5>
                        <p>{application.experience}</p>
                      </div>
                    )}

                    {application.portfolio_url && (
                      <div className={styles.contentSection}>
                        <h5>Portfolio</h5>
                        <a 
                          href={application.portfolio_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={styles.portfolioLink}
                        >
                          {application.portfolio_url}
                        </a>
                      </div>
                    )}

                    {application.resume_url && (
                      <div className={styles.contentSection}>
                        <h5>Resume/CV</h5>
                        <a 
                          href={application.resume_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          download
                          className={styles.resumeLink}
                        >
                          📄 Download CV
                        </a>
                      </div>
                    )}
                  </div>

                  {application.status === 'pending' && (
                    <div className={styles.applicationActions}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleApproveApplication(application.id);
                        }}
                        className={styles.approveButton}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeclineApplication(application.id);
                        }}
                        className={styles.declineButton}
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default PositionApplications;

