import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/Navbar/Navbar';
import { Footer } from '../../components/Footer/Footer';
import styles from './PositionApplications.module.css';
import { positionAPI, applicationAPI } from '../../utils/apiServices';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

// Icons
const CalendarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
);

const FileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
);

const SuitcaseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
);

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
);

const CrossIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

const ChevronLeftIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
);

const ChevronRightIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
);

const ExpandableText = ({ text, title, icon }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  if (!text) return null;
  
  const words = text.split(/\s+/);
  const shouldShowToggle = words.length > 35;
  const displayText = isExpanded ? text : words.slice(0, 35).join(' ') + (shouldShowToggle ? '...' : '');

  return (
    <div className={styles.expandableSection}>
      <div className={styles.sectionHeading}>
        <div className={styles.iconCircle}>{icon}</div>
        <h6>{title}</h6>
      </div>
      <p className={styles.expandableTextContent}>{displayText}</p>
      {shouldShowToggle && (
        <button onClick={() => setIsExpanded(!isExpanded)} className={styles.expandToggle}>
          {isExpanded ? 'SHOW LESS' : `READ FULL ${title}`}
          <span className={`${styles.chevron} ${isExpanded ? styles.chevronUp : styles.chevronDown}`}>
            {isExpanded ? '▲' : '▼'}
          </span>
        </button>
      )}
    </div>
  );
};

const PositionApplications = () => {
  const { positionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [position, setPosition] = useState(null);
  const [startup, setStartup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applicationConfirm, setApplicationConfirm] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 2;

  useEffect(() => {
    loadApplications();
  }, [positionId]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const response = await positionAPI.getPositionApplications(positionId);
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
          setTimeout(() => navigate(`/message?conversation=${conversationId}`), 1000);
        } else {
          setTimeout(() => navigate('/message'), 1000);
        }
      } else {
        await applicationAPI.declineApplication(applicationId);
        toast.success('Application declined');
      }
      setApplicationConfirm(null);
      loadApplications();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${action} application`);
    }
  };

  const handleDeclineApplication = async (applicationId) => {
    setApplicationConfirm({ applicationId, action: 'decline' });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isPositionFilled = () => applications.some(app => app.status === 'approved');

  if (loading) {
    return (
      <>
        <Navbar />
        <div className={styles.container}><div className={styles.loading}>Loading applications...</div></div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      {applicationConfirm && (
        <div className={styles.confirmOverlay} onClick={() => setApplicationConfirm(null)}>
          <div className={styles.confirmCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmHeader}>
              <h4 className={styles.confirmTitle}>
                {applicationConfirm.action === 'approve' ? 'Confirm Approval' : 'Confirm Decline'}
              </h4>
              <button 
                className={styles.confirmClose} 
                onClick={() => setApplicationConfirm(null)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <div className={`${styles.confirmWarning} ${applicationConfirm.action === 'approve' ? styles.confirmWarningApprove : ''}`}>
              <span className={styles.confirmWarningIcon}>!</span>
              <p>
                {applicationConfirm.action === 'approve' 
                  ? 'Are you sure you want to approve this application?' 
                  : 'Are you sure you want to decline this application?'}
              </p>
            </div>
            <div className={styles.confirmActions}>
              <button className={styles.confirmCancel} onClick={() => setApplicationConfirm(null)}>Cancel</button>
              <button 
                className={`${styles.confirmDelete} ${applicationConfirm.action === 'approve' ? styles.confirmApprove : ''}`} 
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
          <Link to={`/startups/${startup?.id}/applications`} className={styles.backLink}>← Back to Startup View</Link>
          <div className={styles.titleRow}>
            <h1>Applications for {position?.title}</h1>
            {isPositionFilled() && <span className={styles.filledBadge}>Position Filled</span>}
          </div>
        </div>

        <div className={styles.applicationsList}>
          {(() => {
            const totalApps = applications.length;
            const totalPages = Math.ceil(totalApps / ITEMS_PER_PAGE);
            const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
            const paginatedApps = applications.slice(startIndex, startIndex + ITEMS_PER_PAGE);
            const filled = isPositionFilled();

            if (totalApps === 0) return <div className={styles.emptyState}>No applications found for this position.</div>;

            return (
              <>
                {paginatedApps.map((application) => (
                  <div key={application.id} className={styles.applicationCard}>
                    <div className={styles.applicationHeader}>
                      <div className={styles.applicantInfo}>
                        <div className={styles.avatarContainer}>
                          <div className={styles.profileAvatarRing}>
                            <div className={styles.profileAvatar}>
                              {application.applicant?.profile_picture ? (
                                <img src={application.applicant.profile_picture} alt={application.applicant.username} className={styles.profileAvatarImg} />
                              ) : (application.applicant?.username?.charAt(0).toUpperCase() || 'U')}
                            </div>
                          </div>
                        </div>
                        <div className={styles.nameSection}>
                          <h4>{application.applicant?.full_name || 'Unknown'}</h4>
                          <span className={styles.usernameHandle}>@{application.applicant?.username}</span>
                        </div>
                      </div>
                      <div className={styles.metaSection}>
                        <div className={styles.appliedOnCapsule}>
                          <CalendarIcon />
                          <span>APPLIED ON {formatDate(application.created_at).toUpperCase()}</span>
                        </div>
                        <div className={styles.statusLabel}>
                          STATUS: <span className={styles.statusText}>{application.status.toUpperCase()}</span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.applicationBodyGrid}>
                      <div className={styles.participationBox}>
                        <h6>STARTUP PARTICIPATION</h6>
                        <div className={styles.participationContent}>
                          <div className={styles.miniInitial}>{application.applicant?.username?.substring(0, 2) || 'U'}</div>
                          <p>part of <strong>{application.active_commitments || 0} active startups</strong></p>
                        </div>
                      </div>
                      <div className={styles.resumeBox}>
                        <h6>RESUME / CV</h6>
                        <div className={styles.resumeContent}>
                          <div className={styles.resumeIconWrapper}><FileIcon /></div>
                          <div className={styles.resumeDetails}>
                            <div className={styles.resumeName}>Resume_{application.applicant?.username}.pdf</div>
                          </div>
                          <a href={application.resume_url} target="_blank" rel="noopener noreferrer" download className={styles.downloadButton}>DOWNLOAD CV</a>
                        </div>
                      </div>
                    </div>

                    <div className={styles.textSections}>
                      <ExpandableText text={application.cover_letter} title="COVER LETTER" icon={<FileIcon />} />
                    </div>

                    {application.status === 'pending' && (
                      <div className={styles.applicationActions}>
                        <button onClick={() => handleApproveApplication(application.id)} className={styles.approveButton} disabled={filled}>
                          <CheckIcon /> APPROVE CANDIDATE
                        </button>
                        <button onClick={() => handleDeclineApplication(application.id)} className={styles.declineButton}>
                          <CrossIcon /> DECLINE APPLICATION
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {totalPages > 1 && (
                  <div className={styles.paginationContainer}>
                    <button className={styles.pageButton} onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
                      <ChevronLeftIcon />
                    </button>
                    <span className={styles.pageInfo}>Page {currentPage} of {totalPages}</span>
                    <button className={styles.pageButton} onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
                      <ChevronRightIcon />
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default PositionApplications;
