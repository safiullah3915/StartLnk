import React, { useEffect, useState, useCallback } from 'react';
import PortalLayout from './PortalLayout';
import { portalAPI } from '../../utils/portalAPI';

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'entrepreneur', label: 'Entrepreneur' },
  { value: 'student', label: 'Student' },
  { value: 'investor', label: 'Investor' },
];

export default function PortalUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (role) params.role = role;
    portalAPI.getUsers(params)
      .then(r => setUsers(r.data.results || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, role]);

  useEffect(() => { load(); }, [load]);

  return (
    <PortalLayout>
      <div className="portal-page-title">
        Users
        <span className="portal-count">{users.length}</span>
      </div>
      <div className="portal-page-sub">All registered users on the platform</div>

      <div className="portal-table-card">
        <div className="portal-table-header-bar">
          <div className="portal-table-title">User Directory</div>
          <div className="portal-controls">
            <input
              className="portal-search"
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && load()}
            />
            <select
              className="portal-filter-select"
              value={role}
              onChange={e => setRole(e.target.value)}
            >
              {ROLE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button className="portal-btn portal-btn-primary" onClick={load}>
              Search
            </button>
          </div>
        </div>

        {loading ? (
          <div className="portal-loading">
            <div className="portal-spinner" /> Loading users…
          </div>
        ) : users.length === 0 ? (
          <div className="portal-empty">
            <div className="portal-empty-icon">👥</div>
            <div className="portal-empty-text">No users found</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="portal-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Startups</th>
                  <th>Applications</th>
                  <th>Joined</th>
                  <th>Flags</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="portal-cell-main">{u.username}</div>
                      <div className="portal-cell-sub">{u.email}</div>
                    </td>
                    <td>
                      <span
                        className="portal-badge"
                        style={{
                          background: u.role === 'entrepreneur'
                            ? 'rgba(99,102,241,0.12)'
                            : u.role === 'investor'
                            ? 'rgba(52,211,153,0.12)'
                            : 'rgba(251,191,36,0.12)',
                          color: u.role === 'entrepreneur'
                            ? '#818cf8'
                            : u.role === 'investor'
                            ? '#34d399'
                            : '#fbbf24',
                        }}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>{u.startups_count}</td>
                    <td style={{ textAlign: 'center' }}>{u.applications_count}</td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {u.is_staff && (
                          <span className="portal-badge" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                            Staff
                          </span>
                        )}
                        {u.is_superuser && (
                          <span className="portal-badge" style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc' }}>
                            Superuser
                          </span>
                        )}
                        {!u.is_active && (
                          <span className="portal-badge" style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>
                            Inactive
                          </span>
                        )}
                        {!u.email_verified && (
                          <span className="portal-badge" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>
                            Unverified
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
