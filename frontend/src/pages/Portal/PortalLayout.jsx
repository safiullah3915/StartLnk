import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Portal.css';

const NAV = [
  { to: '/portal', label: 'Overview', icon: '📊', end: true },
  { to: '/portal/startups', label: 'Startups', icon: '🚀' },
  { to: '/portal/users', label: 'Users', icon: '👥' },
];

export default function PortalLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="portal-root">
      <aside className="portal-sidebar">
        <div className="portal-brand">
          <span className="portal-brand-icon">⚡</span>
          <div>
            <div className="portal-brand-name">StartLnk</div>
            <div className="portal-brand-sub">Admin Portal</div>
          </div>
        </div>

        <nav className="portal-nav">
          {NAV.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `portal-nav-item ${isActive ? 'active' : ''}`
              }
            >
              <span className="portal-nav-icon">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="portal-sidebar-footer">
          <div className="portal-user-info">
            <div className="portal-user-avatar">
              {user?.username?.[0]?.toUpperCase() || 'A'}
            </div>
            <div>
              <div className="portal-user-name">{user?.username}</div>
              <div className="portal-user-role">
                {user?.is_superuser ? 'Superuser' : 'Staff'}
              </div>
            </div>
          </div>
          <button className="portal-logout-btn" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </aside>

      <main className="portal-main">
        <div className="portal-main-inner">{children}</div>
      </main>
    </div>
  );
}
