import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalLayout from './PortalLayout';
import { portalAPI } from '../../utils/portalAPI';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'under_verification', label: '🟡 Under Review' },
  { value: 'verified', label: '✅ Verified' },
  { value: 'rejected', label: '🔴 Rejected' },
  { value: 'more_info_required', label: '🟠 More Info Required' },
  { value: 'suspended', label: '⚫ Suspended' },
];

const STATUS_LABELS = {
  under_verification: 'Under Review',
  verified: 'Verified',
  rejected: 'Rejected',
  more_info_required: 'More Info Needed',
  suspended: 'Suspended',
};

function StatusBadge({ status }) {
  return (
    <span className={`portal-badge ${status}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export default function PortalStartups() {
  const navigate = useNavigate();
  const [startups, setStartups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [saving, setSaving] = useState({});
  const [saved, setSaved] = useState({});

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (filter) params.verification_status = filter;
    if (search) params.search = search;
    portalAPI.getStartups(params)
      .then(r => setStartups(r.data.results || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (id, newStatus) => {
    setSaving(p => ({ ...p, [id]: true }));
    setSaved(p => ({ ...p, [id]: false }));
    try {
      await portalAPI.verifyStartup(id, newStatus);
      setStartups(prev =>
        prev.map(s => s.id === id ? { ...s, verification_status: newStatus } : s)
      );
      setSaved(p => ({ ...p, [id]: true }));
      setTimeout(() => setSaved(p => ({ ...p, [id]: false })), 2500);
    } catch (e) {
      alert('Failed to update status: ' + (e.response?.data?.error || e.message));
    } finally {
      setSaving(p => ({ ...p, [id]: false }));
    }
  };

  return (
    <PortalLayout>
      <div className="portal-page-title">
        Startups
        <span className="portal-count">{startups.length}</span>
      </div>
      <div className="portal-page-sub">Review and update startup verification status</div>

      <div className="portal-table-card">
        <div className="portal-table-header-bar">
          <div className="portal-table-title">All Startups</div>
          <div className="portal-controls">
            <input
              className="portal-search"
              placeholder="Search by name, founder…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && load()}
            />
            <select
              className="portal-filter-select"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map(o => (
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
            <div className="portal-spinner" /> Loading startups…
          </div>
        ) : startups.length === 0 ? (
          <div className="portal-empty">
            <div className="portal-empty-icon">🚀</div>
            <div className="portal-empty-text">No startups found</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Startup</th>
                  <th>Founder</th>
                  <th>Type</th>
                  <th>Submitted</th>
                  <th>Current Status</th>
                  <th>Update Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {startups.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div className="portal-cell-main">{s.title}</div>
                      <div className="portal-cell-sub">{s.field || s.category}</div>
                    </td>
                    <td>
                      <div className="portal-cell-main">{s.owner_username}</div>
                      <div className="portal-cell-sub">{s.owner_email}</div>
                    </td>
                    <td>
                      <span style={{ textTransform: 'capitalize', fontSize: '0.8rem' }}>
                        {s.type}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <StatusBadge status={s.verification_status} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <select
                          className="portal-status-select"
                          value={s.verification_status}
                          disabled={saving[s.id]}
                          onChange={e => handleStatusChange(s.id, e.target.value)}
                        >
                          {STATUS_OPTIONS.filter(o => o.value).map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                        {saving[s.id] && <span style={{ color: '#64748b', fontSize: '0.78rem' }}>Saving…</span>}
                        {saved[s.id] && <span className="portal-save-ok">✓ Saved</span>}
                      </div>
                    </td>
                    <td>
                      <button
                        className="portal-table-link"
                        onClick={() => navigate(`/portal/startups/${s.id}`)}
                      >
                        Open →
                      </button>
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
