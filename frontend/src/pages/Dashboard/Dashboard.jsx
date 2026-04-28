import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navbar } from '../../components/Navbar/Navbar';
import { Footer } from '../../components/Footer/Footer';
import { Link } from 'react-router-dom';
import styles from './Dashboard.module.css';
import { userAPI, positionAPI } from '../../utils/apiServices';
import apiClient from '../../utils/axiosConfig';
import { getStartupDetailPath } from '../../utils/idUtils';
import { toast } from 'react-toastify';

const Dashboard = () => {
  const { user, isEntrepreneur, isStudent, isInvestor, loading: authLoading, isAuthenticated } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myStartups, setMyStartups] = useState([]);
  const [startupIdToPositions, setStartupIdToPositions] = useState({});
  const [startupDeleteConfirm, setStartupDeleteConfirm] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const applicationsPerPage = 3;
  const recentApplicationsRef = useRef(null);

  const formatDate = (value) => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '-';
    }
    return parsed.toLocaleDateString();
  };

  const getStatusBadgeClass = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'approved':
        return `${styles.statusBadge} ${styles.statusApproved}`;
      case 'rejected':
        return `${styles.statusBadge} ${styles.statusRejected}`;
      case 'withdrawn':
        return `${styles.statusBadge} ${styles.statusWithdrawn}`;
      default:
        return `${styles.statusBadge} ${styles.statusPending}`;
    }
  };

  const formatStatusLabel = (status) => {
    if (!status) {
      return 'Pending';
    }
    return status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const scrollToRecentApplications = () => {
    setCurrentPage(1);
    setTimeout(() => {
      if (recentApplicationsRef.current) {
        recentApplicationsRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 100);
  };

  const totalPages = Math.ceil(recentActivity.length / applicationsPerPage);
  const displayedApplications = recentActivity.slice(
    (currentPage - 1) * applicationsPerPage,
    currentPage * applicationsPerPage
  );

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      if (user) {
        loadDashboardData();
      } else {
        const timeout = setTimeout(() => {
          if (!user) {
            setLoading(false);
          }
        }, 5000);
        return () => clearTimeout(timeout);
      }
    } else if (!authLoading && !isAuthenticated) {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, user]);

  const loadDashboardData = async () => {
    try {
      const response = await userAPI.getProfileData();
      setStats(response.data.stats);
      
      const allApplications = (response.data.applications || []).sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });
      setRecentActivity(allApplications);

      const startups = response.data.startups || [];
      setMyStartups(startups);

      if (startups.length > 0) {
        const positionPromises = startups.map(async (s) => {
          try {
            const res = await positionAPI.getStartupPositions(s.id);
            const positions = res.data?.positions || (Array.isArray(res.data) ? res.data : []);
            return [s.id, positions];
          } catch (e) {
            return [s.id, []];
          }
        });
        const results = await Promise.all(positionPromises);
        const map = results.reduce((acc, [id, positions]) => {
          acc[id] = positions;
          return acc;
        }, {});
        setStartupIdToPositions(map);
      } else {
        setStartupIdToPositions({});
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStartup = (startupId, startupTitle) => {
    setStartupDeleteConfirm({ startupId, startupTitle });
  };

  const confirmDeleteStartup = async () => {
    if (!startupDeleteConfirm) return;
    const { startupId } = startupDeleteConfirm;
    try {
      await apiClient.delete(`/api/startups/${startupId}`);
      setMyStartups(prev => prev.filter(s => s.id !== startupId));
      setStartupIdToPositions(prev => {
        const updated = { ...prev };
        delete updated[startupId];
        return updated;
      });
      setStartupDeleteConfirm(null);
      toast.success('Startup deleted successfully!');
    } catch (error) {
      console.error('Error deleting startup:', error);
      toast.error('Failed to delete startup');
    }
  };

  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: '4rem' }}>
          <div style={{
            width: '3.5rem', height: '3.5rem', 
            border: '4px solid rgba(139, 92, 246, 0.2)', 
            borderLeftColor: '#8B5CF6', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            marginBottom: '1.5rem'
          }}></div>
          <div style={{ color: '#9CA3AF', fontSize: '1.1rem', fontWeight: '600', letterSpacing: '0.05em' }}>
            {authLoading ? 'AUTHENTICATING...' : 'LOADING DASHBOARD...'}
          </div>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          `}} />
        </div>
        <Footer />
      </>
    );
  }

  const renderEntrepreneurDashboard = () => (
    <div className={styles.dashboard}>
      {startupDeleteConfirm && (
        <div className={styles.confirmOverlay} onClick={() => setStartupDeleteConfirm(null)}>
          <div className={styles.confirmCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmHeader}>
              <h4 className={styles.confirmTitle}>Confirm Deletion</h4>
              <button className={styles.confirmClose} onClick={() => setStartupDeleteConfirm(null)}>&times;</button>
            </div>
            <div className={styles.confirmWarning}>
              <span className={styles.confirmWarningIcon}>!</span>
              <p>Are you sure you want to delete "{startupDeleteConfirm.startupTitle}"? This action cannot be undone.</p>
            </div>
            <div className={styles.confirmActions}>
              <button className={styles.confirmCancel} onClick={() => setStartupDeleteConfirm(null)}>Cancel</button>
              <button className={styles.confirmDelete} onClick={confirmDeleteStartup}>Delete Startup</button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.welcome}>
        <h1>Welcome, {user?.username}!</h1>
        <p>Manage your startups and find team members</p>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h3>My Startups</h3>
          <div className={styles.statNumber}>{stats?.startups_created || 0}</div>
          <Link to="/createstartup" className={styles.statAction}>Create New Startup</Link>
        </div>

        <div className={styles.statCard}>
          <h3>Applications Received</h3>
          <div className={styles.statNumber}>{stats?.applications_received || 0}</div>
          <Link to="/startups-with-applications" className={styles.statAction}>View Applications</Link>
        </div>

        <div className={styles.statCard}>
          <h3>Profile Views</h3>
          <div className={styles.statNumber}>{stats?.profile_views || 0}</div>
          <Link to="/account" className={styles.statAction}>View Profile</Link>
        </div>
      </div>

      <div className={styles.quickActions}>
        <h2>Quick Actions</h2>
        <div className={styles.actionGrid}>
          <Link to="/favorites" className={styles.actionCard}>
            <h3>Favorites</h3>
            <p>View your saved startups and opportunities</p>
          </Link>
          
          <Link to="/search" className={styles.actionCard}>
            <h3>Search Startups</h3>
            <p>Find startups to collaborate with or invest in</p>
          </Link>
          
          <Link to="/message" className={styles.actionCard}>
            <h3>Messages</h3>
            <p>Connect with potential team members</p>
          </Link>
        </div>
      </div>

      <div className={styles.section}>
        <h2>My Startups</h2>
        {myStartups.length === 0 ? (
          <div className={styles.emptyState}>
            <p>You have no startups yet. Create one to get started.</p>
            <Link to="/createstartup" className={styles.statAction}>Create Startup</Link>
          </div>
        ) : (
          <div className={styles.cardsGrid}>
            {myStartups.map((startup) => (
              <div key={startup.id} className={styles.startupCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardIcon}><h3>{startup.title}</h3></div>
                  <span className={styles.cardTag}>{startup.category ? startup.category.charAt(0).toUpperCase() + startup.category.slice(1) : 'Other'}</span>
                </div>
                <p className={styles.cardDescription}>{startup.description?.substring(0, 100)}{startup.description && startup.description.length > 100 ? '...' : ''}</p>
                <div className={styles.cardStats}>
                  {startup.type === 'marketplace' ? (
                    <>
                      <div><span className={styles.statsLabel}>Revenue</span><p className={styles.statsValue}>{startup.revenue || '$0'}</p></div>
                      <div><span className={styles.statsLabel}>Profit</span><p className={styles.statsValue}>{startup.profit || '$0'}</p></div>
                      <div><span className={styles.statsLabel}>Price</span><p className={styles.statsValue}>{startup.asking_price || '$0'}</p></div>
                    </>
                  ) : (
                    <>
                      <div><span className={styles.statsLabel}>Earn Through</span><p className={styles.statsValue}>{startup.earn_through || 'N/A'}</p></div>
                      <div><span className={styles.statsLabel}>Category</span><p className={styles.statsValue}>{startup.category || 'N/A'}</p></div>
                      <div><span className={styles.statsLabel}>Team Size</span><p className={styles.statsValue}>{startup.team_size || 'N/A'}</p></div>
                    </>
                  )}
                </div>
                <div className={styles.cardActions}>
                  <Link to={getStartupDetailPath(startup.id)} className={styles.viewButton}>View Details</Link>
                  <button onClick={() => handleDeleteStartup(startup.id, startup.title)} className={styles.deleteButton}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.section}>
        <h2>My Positions</h2>
        {myStartups.filter(s => s.type === 'collaboration').length === 0 ? (
          <div className={styles.emptyState}><p>No collaboration startups yet.</p></div>
        ) : (
          <div className={styles.listGroup}>
            {myStartups.filter(s => s.type === 'collaboration').map(s => {
              const positions = startupIdToPositions[s.id] || [];
              return (
                <div key={s.id} className={styles.itemCard}>
                  <div className={styles.itemHeader}>
                    <h3>{s.title}</h3>
                    <Link to={`/startups/${s.id}/positions`} className={styles.statAction}>Manage Positions</Link>
                  </div>
                  {positions.length === 0 ? (
                    <div className={styles.emptyRow}><span>No positions yet.</span></div>
                  ) : (
                    <div className={styles.table}>
                      <div className={styles.tableHeader}>
                        <div>Title</div><div>Status</div><div>Applications</div><div>Posted</div><div></div>
                      </div>
                      {positions.map(p => (
                        <div key={p.id} className={styles.tableRow}>
                          <div>{p.title}</div>
                          <div><span className={p.is_active ? styles.statusActive : styles.statusClosed}>{p.is_active ? 'Active' : 'Closed'}</span></div>
                          <div>{p.applications_count || 0}</div>
                          <div>{new Date(p.created_at).toLocaleDateString()}</div>
                          <div><Link to={`/positions/${p.id}/applications`} className={styles.statAction}>View Applications</Link></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const renderStudentDashboard = () => (
    <div className={styles.dashboard}>
      <div className={styles.welcome}>
        <h1>Welcome, {user?.username}!</h1>
        <p>Find opportunities and join exciting startups</p>
      </div>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h3>Applications Sent</h3>
          <div className={styles.statNumber}>{stats?.applications_submitted || 0}</div>
          <button onClick={scrollToRecentApplications} className={styles.statAction}>View Applications</button>
        </div>
        <div className={styles.statCard}>
          <h3>Favorites</h3>
          <div className={styles.statNumber}>{stats?.favorites_count || 0}</div>
          <Link to="/favorites" className={styles.statAction}>View Favorites</Link>
        </div>
        <div className={styles.statCard}>
          <h3>Profile Views</h3>
          <div className={styles.statNumber}>{stats?.profile_views || 0}</div>
          <Link to="/account" className={styles.statAction}>View Profile</Link>
        </div>
      </div>
      <div className={styles.quickActions}>
        <h2>Quick Actions</h2>
        <div className={styles.actionGrid}>
          <Link to="/search" className={styles.actionCard}><h3>Search Opportunities</h3><p>Find startups that match your skills</p></Link>
          <Link to="/collaboration" className={styles.actionCard}><h3>Browse Collaborations</h3><p>Discover startups looking for team members</p></Link>
          <Link to="/message" className={styles.actionCard}><h3>Messages</h3><p>Connect with founders</p></Link>
        </div>
      </div>
      <div className={styles.section} ref={recentApplicationsRef}>
        <h2>Recent Applications</h2>
        {recentActivity.length === 0 ? (
          <div className={styles.emptyState}><p>No applications yet.</p></div>
        ) : (
          <div className={styles.tableWrapper}>
            <div className={styles.tableHeader}>
              <div>Startup</div><div>Position</div><div>Status</div><div>Submitted</div><div></div>
            </div>
            {recentActivity.slice(0, 5).map(app => (
              <div key={app.id} className={styles.tableRow}>
                <div>{app.startup?.title}</div>
                <div>{app.position?.title || 'General'}</div>
                <div><span className={getStatusBadgeClass(app.status)}>{formatStatusLabel(app.status)}</span></div>
                <div>{formatDate(app.created_at)}</div>
                <div><Link to={getStartupDetailPath(app.startup?.id)} className={styles.statAction}>View</Link></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderInvestorDashboard = () => (
    <div className={styles.dashboard}>
      <div className={styles.welcome}><h1>Welcome, {user?.username}!</h1><p>Discover and invest in startups</p></div>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}><h3>Favorites</h3><div className={styles.statNumber}>{stats?.favorites_count || 0}</div><Link to="/favorites" className={styles.statAction}>View Favorites</Link></div>
        <div className={styles.statCard}><h3>Interests</h3><div className={styles.statNumber}>{stats?.interests_count || 0}</div><Link to="/investor-dashboard" className={styles.statAction}>View Interests</Link></div>
      </div>
    </div>
  );

  const renderFallbackDashboard = () => (
    <div className={styles.dashboard}>
      <div className={styles.welcome}><h1>Welcome to StartLnk!</h1><p>Loading your profile...</p></div>
    </div>
  );

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        {user ? (
          <>
            {isEntrepreneur() && renderEntrepreneurDashboard()}
            {isStudent() && renderStudentDashboard()}
            {isInvestor() && renderInvestorDashboard()}
          </>
        ) : (
          renderFallbackDashboard()
        )}
      </div>
      <Footer />
    </>
  );
};

export default Dashboard;
