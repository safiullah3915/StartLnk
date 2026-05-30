import React, { useEffect, useState } from 'react';
import PortalLayout from './PortalLayout';
import { portalAPI } from '../../utils/portalAPI';

export default function PortalOverview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalAPI.getStats()
      .then(r => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <PortalLayout>
        <div className="portal-loading">
          <div className="portal-spinner" />
          Loading stats…
        </div>
      </PortalLayout>
    );
  }

  const v = stats?.verification || {};

  return (
    <PortalLayout>
      <div className="portal-page-title">Overview</div>
      <div className="portal-page-sub">Platform health at a glance</div>

      <div className="portal-stat-grid">
        <div className="portal-stat-card accent-purple">
          <div className="portal-stat-label">Total Users</div>
          <div className="portal-stat-value">{stats?.total_users ?? '—'}</div>
        </div>
        <div className="portal-stat-card accent-blue">
          <div className="portal-stat-label">Total Startups</div>
          <div className="portal-stat-value">{stats?.total_startups ?? '—'}</div>
        </div>
        <div className="portal-stat-card accent-orange">
          <div className="portal-stat-label">Applications</div>
          <div className="portal-stat-value">{stats?.total_applications ?? '—'}</div>
        </div>
      </div>

      <div className="portal-page-title" style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
        Verification Queue
      </div>
      <div className="portal-stat-grid">
        <div className="portal-stat-card accent-yellow">
          <div className="portal-stat-label">Under Review</div>
          <div className="portal-stat-value">{v.under_verification ?? '—'}</div>
        </div>
        <div className="portal-stat-card accent-green">
          <div className="portal-stat-label">Verified</div>
          <div className="portal-stat-value">{v.verified ?? '—'}</div>
        </div>
        <div className="portal-stat-card accent-red">
          <div className="portal-stat-label">Rejected</div>
          <div className="portal-stat-value">{v.rejected ?? '—'}</div>
        </div>
        <div className="portal-stat-card accent-orange">
          <div className="portal-stat-label">More Info Needed</div>
          <div className="portal-stat-value">{v.more_info_required ?? '—'}</div>
        </div>
        <div className="portal-stat-card">
          <div className="portal-stat-label">Suspended</div>
          <div className="portal-stat-value">{v.suspended ?? '—'}</div>
        </div>
      </div>
    </PortalLayout>
  );
}
