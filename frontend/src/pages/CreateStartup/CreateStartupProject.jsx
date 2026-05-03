import React, { useState } from 'react';
import { Navbar } from '../../components/Navbar/Navbar';
import { Footer } from '../../components/Footer/Footer';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../utils/axiosConfig';
import { debugAuthStatus } from '../../utils/authDebug';
import './CreateStartup.css';

/* ─── Static data ─────────────────────────────────────────────────────────── */
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
  'Early Traction', 'Product-Market Fit', 'Growth Stage', 'Fundraising Stage'
];

const INDUSTRIES = [
  'Fintech', 'HealthTech', 'EdTech', 'LegalTech', 'Real Estate',
  'AI / ML', 'Web3 / Crypto', 'Media', 'Gaming',
  'Robotics / Hardware', 'Logistics', 'Other'
];



/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const Field = ({ label, required, error, children }) => (
  <div className="cs-section" style={{ marginBottom: '1rem' }}>
    <label className="cs-label">
      {label}{required && <span>*</span>}
    </label>
    {children}
    {error && <span className="cs-error">{error}</span>}
  </div>
);

/* ─── Main component ──────────────────────────────────────────────────────── */
const CreateStartupProject = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState('forward');

  const TOTAL_STEPS = 3;

  /* unchanged formData structure — same fields, same API payload */
  const [formData, setFormData] = useState({
    title: '',
    role_title: '',
    description: '',
    field: '',
    website_url: '',
    stage: '',
    revenue: '',
    profit: '',
    asking_price: '',
    ttm_revenue: '',
    ttm_profit: '',
    last_month_revenue: '',
    last_month_profit: '',
    type: 'collaboration',
    phase: '',
    team_size: 'Just Me',
    category: 'saas',
  });

  const [errors, setErrors] = useState({});

  /* ── Input handlers (same as original) ── */
  const set = (name, value) =>
    setFormData(prev => ({ ...prev, [name]: value }));

  const handleInputChange = (e) =>
    set(e.target.name, e.target.value);

  /* ── Per-step validation ── */
  const validateStep = (s) => {
    const e = {};
    if (s === 1) {
      if (!formData.title || formData.title.trim().length < 5)
        e.title = 'Startup name must be at least 5 characters.';
      if (!formData.description || formData.description.trim().length < 20)
        e.description = 'Description must be at least 20 characters.';
      if (!formData.field.trim())
        e.field = 'Field / Industry is required.';
    }
    if (s === 2) {
      if (!formData.stage)
        e.stage = 'Please select a startup stage.';
      if (!formData.phase.trim())
        e.phase = 'Current phase is required.';
      if (!formData.team_size.trim())
        e.team_size = 'Team size is required.';
      if (formData.website_url.trim()) {
        try {
          new URL(formData.website_url.trim().startsWith('http') ? formData.website_url : `https://${formData.website_url}`);
          // Django requires proper URL scheme
          if (!/^https?:\/\//i.test(formData.website_url.trim())) {
             e.website_url = 'URL must start with http:// or https://';
          }
        } catch (_) {
          e.website_url = 'Please enter a valid website URL.';
        }
      }
    }
    /*
    if (s === 3 && formData.type === 'marketplace') {
      if (!formData.revenue.trim()) e.revenue = 'Current revenue is required.';
      if (!formData.profit.trim()) e.profit = 'Current profit is required.';
      if (!formData.asking_price.trim()) e.asking_price = 'Asking price is required.';
      if (!formData.ttm_revenue.trim()) e.ttm_revenue = 'TTM revenue is required.';
      if (!formData.ttm_profit.trim()) e.ttm_profit = 'TTM profit is required.';
      if (!formData.last_month_revenue.trim()) e.last_month_revenue = 'Last month revenue is required.';
      if (!formData.last_month_profit.trim()) e.last_month_profit = 'Last month profit is required.';
    }
    */
    return e;
  };

  /* ── Navigation ── */
  const goNext = () => {
    const e = validateStep(step);
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setDir('forward');
    setStep(s => s + 1);
  };

  const goBack = () => {
    setErrors({});
    setDir('back');
    setStep(s => s - 1);
  };

  /* ── Submit (same logic as original) ── */
  const handleSubmit = async () => {
    const e = validateStep(3);
    if (Object.keys(e).length) { setErrors(e); return; }

    if (!user || !user.id) {
      toast.error('Please login first to create a startup');
      navigate('/login');
      return;
    }

    debugAuthStatus();
    setLoading(true);

    try {
      const cleanedFormData = {
        title: formData.title,
        role_title: formData.role_title,
        description: formData.description,
        field: formData.field,
        website_url: formData.website_url || '',
        stages: formData.stage ? [formData.stage] : [],
        revenue: formData.revenue || '',
        profit: formData.profit || '',
        asking_price: formData.asking_price || '',
        ttm_revenue: formData.ttm_revenue || '',
        ttm_profit: formData.ttm_profit || '',
        last_month_revenue: formData.last_month_revenue || '',
        last_month_profit: formData.last_month_profit || '',
        type: formData.type,
        phase: formData.phase || '',
        team_size: formData.team_size || '',
        time_commitment: formData.time_commitment || '',
        category: formData.category || 'other',
      };

      await apiClient.post('/api/startups', cleanedFormData);
      toast.success('Startup created successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Startup creation error:', error);
      let msg = 'Failed to create startup. Please try again.';
      if (error.response?.data) {
        const d = error.response.data;
        if (typeof d === 'string' && d.includes('AnonymousUser')) {
          msg = 'Authentication failed. Please log in and try again.';
        } else if (d.message) {
          msg = d.message;
        } else if (d.error) {
          msg = d.error;
        } else if (d.detail) {
          msg = d.detail;
        } else if (typeof d === 'object') {
          // Extract first field error if DRF serializer errors are returned
          const firstKey = Object.keys(d)[0];
          if (firstKey && Array.isArray(d[firstKey])) {
            msg = `${firstKey}: ${d[firstKey][0]}`;
          } else if (firstKey && typeof d[firstKey] === 'string') {
            msg = `${firstKey}: ${d[firstKey]}`;
          }
        }
      } else if (error.message) {
        msg = error.message;
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  /* ── Derived ── */
  const progressPct = Math.round((step / TOTAL_STEPS) * 100);
  const animClass = dir === 'back' ? 'cs-step-back' : 'cs-step';
  const isMarketplace = formData.type === 'marketplace';

  /* ──────────────────────────────────────────────────────────────────────── */
  return (
    <>
      <Navbar />
      <div className="cs-page">
        {/* Fixed progress bar */}
        <div className="cs-topbar">
          <div className="cs-topbar-fill" style={{ width: `${progressPct}%` }} />
        </div>

        <div className="cs-wrapper">
          <p className="cs-step-label">Step {step} of {TOTAL_STEPS}</p>

          {/* ══ STEP 1: Basics ══════════════════════════════════════════════ */}
          {step === 1 && (
            <div key="s1" className={`cs-card ${animClass}`}>
              <h1 className="cs-title">Tell Us About Your Startup</h1>
              <p className="cs-subtitle">
                Give us the core details so we can position your startup correctly.
              </p>

              {/* Startup name */}
              <div className="cs-section">
                <div className="cs-section-heading">
                  <span>✨</span> Startup Name*
                </div>
                <input
                  className="cs-input"
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g. TechFlow, BuildBridge"
                />
                {errors.title && <span className="cs-error">{errors.title}</span>}
              </div>

              {/* Category */}
              <div className="cs-section">
                <div className="cs-section-heading">
                  <span>🏷️</span> Business Model
                </div>
                <div className="cs-chips">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      type="button"
                      className={`cs-chip${formData.category === cat.value ? ' selected' : ''}`}
                      onClick={() => set('category', cat.value)}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="cs-divider" />

              {/* Description */}
              <div className="cs-section">
                <div className="cs-section-heading">
                  <span>📝</span> Startup Description*
                </div>
                <textarea
                  className="cs-textarea"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe what your startup does, who it's for, and what problem it solves."
                  rows={4}
                />
                {errors.description && <span className="cs-error">{errors.description}</span>}
              </div>

              {/* Field / Industry */}
              <div className="cs-section">
                <div className="cs-section-heading">
                  <span>🏢</span> Field / Industry
                </div>
                <div className="cs-chips">
                  {INDUSTRIES.map(ind => (
                    <button
                      key={ind}
                      type="button"
                      className={`cs-chip${formData.field === ind ? ' selected' : ''}`}
                      onClick={() => { set('field', ind); setErrors(p => ({ ...p, field: undefined })); }}
                    >
                      {ind}
                    </button>
                  ))}
                </div>
                {errors.field && <span className="cs-error">{errors.field}</span>}
              </div>

              <div className="cs-nav">
                <button
                  type="button"
                  className="cs-back-btn"
                  onClick={() => navigate('/dashboard')}
                >
                  ✕ Cancel
                </button>
                <button type="button" className="cs-next-btn" onClick={goNext}>
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ══ STEP 2: Stage & Type ════════════════════════════════════════ */}
          {step === 2 && (
            <div key="s2" className={`cs-card ${animClass}`}>
              <h1 className="cs-title">Stage &amp; Setup</h1>
              <p className="cs-subtitle">
                Where is your startup now, and what are you looking for?
              </p>

              {/* Startup stage */}
              <div className="cs-section">
                <div className="cs-section-heading">
                  <span>🚀</span> Stage of Your Startup
                </div>
                <div className="cs-chips">
                  {STAGES.map(s => (
                    <button
                      key={s}
                      type="button"
                      className={`cs-chip${formData.stage === s ? ' selected' : ''}`}
                      onClick={() => { set('stage', s); setErrors(p => ({ ...p, stage: undefined })); }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {errors.stage && <span className="cs-error">{errors.stage}</span>}
              </div>

              <div className="cs-divider" />

              {/* Startup type — big cards */}
              <div className="cs-section">
                <div className="cs-section-heading">
                  <span>📋</span> Startup Type
                </div>
                <div className="cs-type-grid" style={{ gridTemplateColumns: '1fr' }}>
                  {/* Coming Soon: For Sale Marketplace
                  <div
                    className={`cs-type-card cs-type-card--disabled`}
                    style={{ cursor: 'not-allowed', opacity: 0.5, position: 'relative' }}
                    title="Coming Soon — For Sale feature is not available yet"
                  >
                    <span style={{
                      position: 'absolute', top: '0.5rem', right: '0.5rem',
                      background: '#ef4444', color: '#fff',
                      fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.05em',
                      padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase'
                    }}>Coming Soon</span>
                    <div className="cs-type-icon">🏪</div>
                    <div className="cs-type-name" style={{ color: '#ef4444' }}>For Sale</div>
                    <div className="cs-type-desc">
                      List your startup on the marketplace to find buyers or investors.
                    </div>
                  </div>
                  */}
                  <div
                    className="cs-type-card selected"
                    style={{ textAlign: 'center', cursor: 'default' }}
                  >
                    <div className="cs-type-icon">🤝</div>
                    <div className="cs-type-name">Collaboration</div>
                    <div className="cs-type-desc">
                      Looking for co-founders, developers, or team members to join.
                    </div>
                  </div>
                </div>
              </div>

              <div className="cs-divider" />

              {/* Website + Phase */}
              <div className="cs-row">
                <Field label="Website URL" error={errors.website_url}>
                  <input
                    className="cs-input"
                    type="url"
                    name="website_url"
                    value={formData.website_url}
                    onChange={handleInputChange}
                    placeholder="https://yourstartup.com"
                  />
                </Field>
                <Field label="Current Phase" required error={errors.phase}>
                  <input
                    className="cs-input"
                    type="text"
                    name="phase"
                    value={formData.phase}
                    onChange={handleInputChange}
                    placeholder="e.g., Seed Stage, Series A"
                  />
                </Field>
              </div>

              {/* Team size */}
              <Field
                label={formData.type === 'collaboration' ? 'Current Team Size' : 'Team Size'}
                required
                error={errors.team_size}
              >
                <input
                  className="cs-input"
                  type="text"
                  name="team_size"
                  value={formData.team_size}
                  onChange={handleInputChange}
                  placeholder="Just Me"
                  disabled
                  title="Disabled: Team size will update automatically as you add members."
                  style={{ cursor: 'not-allowed', opacity: 0.7 }}
                />
              </Field>
              


              <div className="cs-nav">
                <button type="button" className="cs-back-btn" onClick={goBack}>
                  ← Back
                </button>
                <button type="button" className="cs-next-btn" onClick={goNext}>
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ══ STEP 3: Financials (marketplace) OR Confirm (collaboration) ═ */}
          {step === 3 && (
            <div key="s3" className={`cs-card ${animClass}`}>
              {/* Preserved Code for Marketplace Phase 2 */}
              {false && (
                <>
                  <h1 className="cs-title">Financial Details</h1>
                  <p className="cs-subtitle">
                    Accurate numbers build trust with buyers. All values are private until published.
                  </p>

                  <div className="cs-row">
                    <Field label="Current Revenue" required error={errors.revenue}>
                      <input className="cs-input" type="text" name="revenue"
                        value={formData.revenue} onChange={handleInputChange}
                        placeholder="e.g., $10,000/month" />
                    </Field>
                    <Field label="Current Profit" required error={errors.profit}>
                      <input className="cs-input" type="text" name="profit"
                        value={formData.profit} onChange={handleInputChange}
                        placeholder="e.g., $5,000/month" />
                    </Field>
                  </div>

                  <div className="cs-row">
                    <Field label="Asking Price" required error={errors.asking_price}>
                      <input className="cs-input" type="text" name="asking_price"
                        value={formData.asking_price} onChange={handleInputChange}
                        placeholder="e.g., $100,000" />
                    </Field>
                    <Field label="TTM Revenue" required error={errors.ttm_revenue}>
                      <input className="cs-input" type="text" name="ttm_revenue"
                        value={formData.ttm_revenue} onChange={handleInputChange}
                        placeholder="e.g., $120,000" />
                    </Field>
                  </div>

                  <div className="cs-row">
                    <Field label="TTM Profit" required error={errors.ttm_profit}>
                      <input className="cs-input" type="text" name="ttm_profit"
                        value={formData.ttm_profit} onChange={handleInputChange}
                        placeholder="e.g., $60,000" />
                    </Field>
                    <Field label="Last Month Revenue" required error={errors.last_month_revenue}>
                      <input className="cs-input" type="text" name="last_month_revenue"
                        value={formData.last_month_revenue} onChange={handleInputChange}
                        placeholder="e.g., $12,000" />
                    </Field>
                  </div>

                  <Field label="Last Month Profit" required error={errors.last_month_profit}>
                    <input className="cs-input" type="text" name="last_month_profit"
                      value={formData.last_month_profit} onChange={handleInputChange}
                      placeholder="e.g., $6,000" />
                  </Field>
                </>
              )}

              {/* Collaboration — no financials, just confirm */}
              <>
                <h1 className="cs-title">Ready to Publish?</h1>
                <p className="cs-subtitle">
                  Review your startup details and create your collaboration listing.
                </p>
                <div style={{
                  background: '#f5f3ff', borderRadius: '12px',
                  padding: '1.25rem 1.5rem', marginBottom: '1rem',
                }}>
                  {[
                    ['Startup', formData.title],
                    ['Business Model', formData.category?.toUpperCase()],
                    ['Industry', formData.field],
                    ['Stage', formData.stage],
                    ['Phase', formData.phase],
                    ['Team size', formData.team_size],
                    ['Website', formData.website_url || '—'],
                  ].map(([k, v]) => (
                    <div key={k} style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '0.4rem 0', borderBottom: '1px solid #e0e7ff',
                      fontSize: '0.85rem',
                    }}>
                      <span style={{ color: '#6b7280', fontWeight: 600 }}>{k}</span>
                      <span style={{ color: '#1f2937', fontWeight: 500 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </>

              <div className="cs-nav">
                <button type="button" className="cs-back-btn" onClick={goBack}>
                  ← Back
                </button>
                <button
                  type="button"
                  className="cs-next-btn cs-submit-btn"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading
                    ? <><div className="cs-spinner" /> Creating...</>
                    : '🚀 Create Startup'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CreateStartupProject;
