import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PortalLayout from './PortalLayout';
import { portalAPI } from '../../utils/portalAPI';

/* ─── Static options (same as CreateStartupProject) ─────────────────────── */
const CATEGORIES = [
  { value: 'saas', label: 'SaaS' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'ecommerce', label: 'Ecommerce' },
  { value: 'agency', label: 'Agency' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'social_platform', label: 'Social Platform' },
  { value: 'other', label: 'Other' },
];

const STAGES = [
  'Idea Stage', 'Pre-MVP', 'MVP Built',
  'Early Traction', 'Product-Market Fit', 'Growth Stage', 'Fundraising Stage',
];

const INDUSTRIES = [
  'Fintech', 'HealthTech', 'EdTech', 'LegalTech', 'Real Estate',
  'AI / ML', 'Web3 / Crypto', 'Media', 'Gaming',
  'Robotics / Hardware', 'Logistics', 'Other',
];

const VERIFICATION_STATUSES = [
  { value: 'under_verification', label: '⏳ Under Review' },
  { value: 'verified',           label: '✅ Verified' },
  { value: 'rejected',           label: '🔴 Rejected' },
  { value: 'more_info_required', label: '🟠 More Info Required' },
  { value: 'suspended',          label: '⚫ Suspended' },
];

const STARTUP_STATUSES = [
  { value: 'active',   label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'sold',     label: 'Sold' },
  { value: 'paused',   label: 'Paused' },
];

/* ─── Small helpers ──────────────────────────────────────────────────────── */
function Section({ title, children }) {
  return (
    <div className="psd-section">
      <div className="psd-section-title">{title}</div>
      {children}
    </div>
  );
}

function Row({ children }) {
  return <div className="psd-row">{children}</div>;
}

function Field({ label, children }) {
  return (
    <div className="psd-field">
      <label className="psd-label">{label}</label>
      {children}
    </div>
  );
}

function Chips({ options, value, onChange }) {
  return (
    <div className="psd-chips">
      {options.map(opt => {
        const val = typeof opt === 'string' ? opt : opt.value;
        const lbl = typeof opt === 'string' ? opt : opt.label;
        return (
          <button
            key={val}
            type="button"
            className={`psd-chip${value === val ? ' selected' : ''}`}
            onClick={() => onChange(val)}
          >
            {lbl}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function PortalStartupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading]     = useState(true);
  const [saving,  setSaving]      = useState(false);
  const [saved,   setSaved]       = useState(false);
  const [error,   setError]       = useState('');
  const [startup, setStartup]     = useState(null);
  const [form,    setForm]        = useState(null);
  const [deleting, setDeleting]   = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    portalAPI.getStartup(id)
      .then(r => {
        const s = r.data;
        setStartup(s);
        setForm({
          title:               s.title || '',
          description:         s.description || '',
          field:               s.field || '',
          category:            s.category || 'other',
          type:                s.type || 'collaboration',
          status:              s.status || 'active',
          verification_status: s.verification_status || 'under_verification',
          phase:               s.phase || '',
          team_size:           s.team_size || '',
          website_url:         s.website_url || '',
          revenue:             s.revenue || '',
          profit:              s.profit || '',
          asking_price:        s.asking_price || '',
          ttm_revenue:         s.ttm_revenue || '',
          ttm_profit:          s.ttm_profit || '',
          last_month_revenue:  s.last_month_revenue || '',
          last_month_profit:   s.last_month_profit || '',
          earn_through:        s.earn_through || '',
        });
      })
      .catch(() => setError('Failed to load startup.'))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const handle = e => set(e.target.name, e.target.value);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await portalAPI.updateStartup(id, form);
      setStartup(res.data.startup);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e.response?.data?.error || 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (startup) {
      setForm({
        title:               startup.title || '',
        description:         startup.description || '',
        field:               startup.field || '',
        category:            startup.category || 'other',
        type:                startup.type || 'collaboration',
        status:              startup.status || 'active',
        verification_status: startup.verification_status || 'under_verification',
        phase:               startup.phase || '',
        team_size:           startup.team_size || '',
        website_url:         startup.website_url || '',
        revenue:             startup.revenue || '',
        profit:              startup.profit || '',
        asking_price:        startup.asking_price || '',
        ttm_revenue:         startup.ttm_revenue || '',
        ttm_profit:          startup.ttm_profit || '',
        last_month_revenue:  startup.last_month_revenue || '',
        last_month_profit:   startup.last_month_profit || '',
        earn_through:        startup.earn_through || '',
      });
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      await portalAPI.deleteStartup(id);
      navigate('/portal/startups');
    } catch (e) {
      setError(e.response?.data?.error || 'Delete failed. Please try again.');
      setConfirmDel(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <PortalLayout>
        <div className="portal-loading"><div className="portal-spinner" /> Loading startup…</div>
      </PortalLayout>
    );
  }

  if (!startup || !form) {
    return (
      <PortalLayout>
        <div className="portal-empty">
          <div className="portal-empty-icon">🚫</div>
          <div className="portal-empty-text">Startup not found</div>
          <button className="portal-btn portal-btn-primary" style={{ marginTop: '1rem' }} onClick={() => navigate('/portal/startups')}>
            ← Back to Startups
          </button>
        </div>
      </PortalLayout>
    );
  }

  const isMarketplace = form.type === 'marketplace';

  return (
    <PortalLayout>
      {/* Header */}
      <div className="psd-header">
        <button className="psd-back-btn" onClick={() => navigate('/portal/startups')}>
          ← Back
        </button>
        <div>
          <div className="portal-page-title" style={{ marginBottom: 0 }}>{startup.title}</div>
          <div className="portal-page-sub" style={{ marginBottom: 0 }}>
            by <strong>{startup.owner_username}</strong> ({startup.owner_email}) · {startup.owner_role}
          </div>
        </div>
      </div>

      {/* Verification banner — always visible at top */}
      <div className="psd-verify-bar">
        <div className="psd-verify-bar-label">
          🛡️ Verification Status
        </div>
        <select
          className="portal-status-select"
          style={{ minWidth: 200 }}
          value={form.verification_status}
          onChange={e => set('verification_status', e.target.value)}
        >
          {VERIFICATION_STATUSES.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          className="portal-filter-select"
          value={form.status}
          onChange={e => set('status', e.target.value)}
        >
          {STARTUP_STATUSES.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {error && <div className="portal-login-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="psd-body">

        {/* ── Section 1: Basics ── */}
        <Section title="Startup Basics">
          <Field label="Startup Name">
            <input
              className="psd-input"
              type="text"
              name="title"
              value={form.title}
              onChange={handle}
            />
          </Field>
          <Field label="Description">
            <textarea
              className="psd-textarea"
              name="description"
              value={form.description}
              onChange={handle}
              rows={5}
            />
          </Field>
          <Field label="Website URL">
            <input
              className="psd-input"
              type="url"
              name="website_url"
              value={form.website_url}
              onChange={handle}
              placeholder="https://example.com"
            />
          </Field>
        </Section>

        {/* ── Section 2: Classification ── */}
        <Section title="Classification">
          <Field label="Business Model (Category)">
            <Chips options={CATEGORIES} value={form.category} onChange={v => set('category', v)} />
          </Field>
          <Field label="Field / Industry">
            <Chips options={INDUSTRIES} value={form.field} onChange={v => set('field', v)} />
          </Field>
          <Field label="Startup Stage">
            <Chips options={STAGES} value={form.phase} onChange={v => set('phase', v)} />
          </Field>
        </Section>

        {/* ── Section 3: Details ── */}
        <Section title="Details">
          <Row>
            <Field label="Type">
              <select className="psd-select" value={form.type} onChange={e => set('type', e.target.value)}>
                <option value="collaboration">Collaboration</option>
                <option value="marketplace">Marketplace (For Sale)</option>
              </select>
            </Field>
            <Field label="Phase / Round">
              <input
                className="psd-input"
                type="text"
                name="phase"
                value={form.phase}
                onChange={handle}
                placeholder="e.g., Seed Stage, Series A"
              />
            </Field>
            <Field label="Team Size">
              <input
                className="psd-input"
                type="text"
                name="team_size"
                value={form.team_size}
                onChange={handle}
                placeholder="e.g., Just Me, 2-5"
              />
            </Field>
          </Row>
          {form.type === 'collaboration' && (
            <Field label="Earn Through">
              <input
                className="psd-input"
                type="text"
                name="earn_through"
                value={form.earn_through}
                onChange={handle}
                placeholder="e.g., Equity, Revenue Share"
              />
            </Field>
          )}
        </Section>

        {/* ── Section 4: Financials (marketplace only) ── */}
        {isMarketplace && (
          <Section title="Financial Details">
            <Row>
              <Field label="Current Revenue">
                <input className="psd-input" type="text" name="revenue" value={form.revenue} onChange={handle} placeholder="e.g. $10,000/month" />
              </Field>
              <Field label="Current Profit">
                <input className="psd-input" type="text" name="profit" value={form.profit} onChange={handle} placeholder="e.g. $5,000/month" />
              </Field>
              <Field label="Asking Price">
                <input className="psd-input" type="text" name="asking_price" value={form.asking_price} onChange={handle} placeholder="e.g. $100,000" />
              </Field>
            </Row>
            <Row>
              <Field label="TTM Revenue">
                <input className="psd-input" type="text" name="ttm_revenue" value={form.ttm_revenue} onChange={handle} placeholder="e.g. $120,000" />
              </Field>
              <Field label="TTM Profit">
                <input className="psd-input" type="text" name="ttm_profit" value={form.ttm_profit} onChange={handle} placeholder="e.g. $60,000" />
              </Field>
            </Row>
            <Row>
              <Field label="Last Month Revenue">
                <input className="psd-input" type="text" name="last_month_revenue" value={form.last_month_revenue} onChange={handle} placeholder="e.g. $12,000" />
              </Field>
              <Field label="Last Month Profit">
                <input className="psd-input" type="text" name="last_month_profit" value={form.last_month_profit} onChange={handle} placeholder="e.g. $6,000" />
              </Field>
            </Row>
          </Section>
        )}

        {/* ── Meta info (read-only) ── */}
        <Section title="Metadata">
          <div className="psd-meta-grid">
            {[
              ['Startup ID', startup.id],
              ['Views', startup.views],
              ['Applications', startup.applications_count],
              ['Created', new Date(startup.created_at).toLocaleString()],
              ['Last Updated', new Date(startup.updated_at).toLocaleString()],
              ['Tags', (startup.tags || []).join(', ') || '—'],
            ].map(([k, v]) => (
              <div key={k} className="psd-meta-item">
                <div className="psd-meta-label">{k}</div>
                <div className="psd-meta-value">{v ?? '—'}</div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Sticky save bar */}
      <div className="psd-save-bar">
        {/* Left side: delete */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {confirmDel ? (
            <>
              <span style={{ fontSize: '0.82rem', color: '#f87171', fontWeight: 600 }}>Delete this startup permanently?</span>
              <button
                className="portal-btn portal-btn-danger"
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? '…' : 'Yes, Delete'}
              </button>
              <button
                className="portal-btn"
                style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}
                onClick={() => setConfirmDel(false)}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              className="portal-btn portal-btn-danger"
              onClick={() => setConfirmDel(true)}
            >
              🗑 Delete Startup
            </button>
          )}
        </div>
        {/* Right side: save/discard */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {saved && <span className="portal-save-ok">✓ Changes saved successfully</span>}
          <button
            className="portal-btn portal-btn-danger"
            onClick={handleCancel}
            disabled={saving}
            style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Discard Changes
          </button>
          <button
            className="portal-btn portal-btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="portal-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                Saving…
              </span>
            ) : '💾 Save Changes'}
          </button>
        </div>
      </div>
    </PortalLayout>
  );
}
