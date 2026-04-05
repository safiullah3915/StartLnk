import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { recommendationAPI } from '../../utils/apiServices';
import { useAuth } from '../../contexts/AuthContext';
import {
  INVESTOR_DEFAULTS,
  INVESTOR_SECTIONS,
} from './investorQuestions';
import './OnboardingPreferences.css';

/* ─── Data constants (unchanged from original) ──────────────────────────── */
const CATEGORIES = [
  'saas', 'ecommerce', 'agency', 'legal', 'marketplace',
  'media', 'platform', 'real_estate', 'robotics',
  'software', 'web3', 'crypto', 'other',
];
const ENGAGEMENT_TYPES = ['full-time', 'part-time', 'equity', 'paid'];
const INDUSTRIES = [
  'fintech', 'healthcare', 'edtech', 'climate', 'ai',
  'gaming', 'mobility', 'enterprise', 'consumer', 'creator-economy',
  'security', 'biotech', 'supply-chain', 'ar-vr', 'social-impact',
];
const TAG_SUGGESTIONS = [
  'ai', 'blockchain', 'mobile', 'web3', 'devtools', 'marketplace',
  'automation', 'e-commerce', 'subscription', 'market-network',
  'b2b', 'b2c', 'api-first', 'open-source', 'community-led',
];
const STARTUP_STAGES = [
  'idea', 'pre-seed', 'seed', 'post-seed', 'series-a',
  'series-b', 'growth', 'profitability', 'mature',
];
const SKILL_SUGGESTIONS = [
  'python', 'javascript', 'react', 'node.js', 'go',
  'java', 'swift', 'kotlin', 'ui/ux', 'product-management',
  'data-science', 'mlops', 'cloud-architecture', 'marketing', 'sales',
];

const inputPattern = /^[a-zA-Z0-9\s&+,\-()./]+$/;
const formatLabel = (value) =>
  value.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const createInvestorDefaults = () => JSON.parse(JSON.stringify(INVESTOR_DEFAULTS));

/* ─── Sub-components ─────────────────────────────────────────────────────── */

/** Styled checkbox item */
function CheckItem({ label, checked, onChange }) {
  return (
    <div
      className={`ob-check-item${checked ? ' checked' : ''}`}
      onClick={onChange}
    >
      <div className="ob-checkbox">
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <span className="ob-check-label">{label}</span>
    </div>
  );
}

/** Pill/chip toggle */
function Chip({ label, selected, onClick }) {
  return (
    <button
      type="button"
      className={`ob-chip${selected ? ' selected' : ''}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

/** Add-item input row */
function AddRow({ value, onChange, onAdd, placeholder }) {
  return (
    <div className="ob-add-row">
      <input
        type="text"
        className="ob-add-input"
        value={value}
        onChange={onChange}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAdd(); } }}
        placeholder={placeholder}
      />
      <button type="button" className="ob-add-btn" onClick={onAdd}>
        + Add
      </button>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
const OnboardingPreferences = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isInvestor = user?.role === 'investor';

  const [step, setStep]       = useState(1);
  const [direction, setDir]   = useState('forward'); // 'forward' | 'back'
  const [loading, setLoading] = useState(false);
  const TOTAL_STEPS = isInvestor ? 1 : 3;

  const [preferences, setPreferences] = useState({
    selected_categories:        [],
    selected_fields:            [],
    selected_tags:              [],
    preferred_startup_stages:   [],
    preferred_engagement_types: [],
    preferred_skills:           [],
  });
  const [investorPreferences, setInvestorPreferences] = useState(createInvestorDefaults);

  // Custom-add inputs
  const [newField, setNewField] = useState('');
  const [newTag,   setNewTag]   = useState('');
  const [newStage, setNewStage] = useState('');
  const [newSkill, setNewSkill] = useState('');

  // Errors per step
  const [errors, setErrors]         = useState({});
  const [inputErrors, setInputErrors] = useState({});
  const [investorErrors, setInvestorErrors] = useState({});

  /* ── Load existing preferences ── */
  useEffect(() => {
    recommendationAPI.getOnboardingPreferences()
      .then(res => {
        if (res.data) {
          setPreferences({
            selected_categories:        res.data.selected_categories        || [],
            selected_fields:            res.data.selected_fields            || [],
            selected_tags:              res.data.selected_tags              || [],
            preferred_startup_stages:   res.data.preferred_startup_stages  || [],
            preferred_engagement_types: res.data.preferred_engagement_types|| [],
            preferred_skills:           res.data.preferred_skills          || [],
          });
          if (res.data.investor_profile) {
            setInvestorPreferences(prev => {
              const base = createInvestorDefaults();
              const inc  = res.data.investor_profile;
              return {
                ...base, ...inc,
                check_size:       { ...base.check_size,       ...(inc.check_size       || {}) },
                target_ownership: { ...base.target_ownership, ...(inc.target_ownership || {}) },
                valuation_caps:   { ...base.valuation_caps,   ...(inc.valuation_caps   || {}) },
                traction:         { ...base.traction,         ...(inc.traction         || {}) },
              };
            });
          }
        }
      })
      .catch(() => console.log('No existing preferences found'));
  }, []);

  /* ── Helpers ── */
  const toggle = (field, value) => {
    setPreferences(prev => {
      const cur = prev[field] || [];
      return {
        ...prev,
        [field]: cur.includes(value) ? cur.filter(x => x !== value) : [...cur, value],
      };
    });
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const validateInput = (field, value) => {
    if (!value.trim()) {
      setInputErrors(p => ({ ...p, [field]: 'Cannot be empty.' }));
      return false;
    }
    if (!inputPattern.test(value.trim())) {
      setInputErrors(p => ({ ...p, [field]: 'Only letters, numbers and basic symbols are allowed.' }));
      return false;
    }
    setInputErrors(p => ({ ...p, [field]: undefined }));
    return true;
  };

  const addItem = (field, value, setter) => {
    if (!validateInput(field, value)) return;
    const v = value.trim();
    if (!preferences[field].includes(v)) {
      setPreferences(prev => ({ ...prev, [field]: [...prev[field], v] }));
      setErrors(prev => ({ ...prev, [field]: undefined }));
      setter('');
    }
  };

  /* ── Per-step validation ── */
  const validateStep = (s) => {
    const e = {};
    if (s === 1) {
      if (!preferences.selected_categories.length)
        e.selected_categories = 'Select at least one category.';
      if (!preferences.selected_fields.length)
        e.selected_fields = 'Add at least one industry or field.';
    }
    if (s === 2) {
      if (!preferences.preferred_startup_stages.length)
        e.preferred_startup_stages = 'Add at least one startup stage.';
      if (!preferences.selected_tags.length)
        e.selected_tags = 'Add at least one market tag.';
    }
    if (s === 3) {
      if (!preferences.preferred_engagement_types.length)
        e.preferred_engagement_types = 'Select at least one engagement type.';
      if (!preferences.preferred_skills.length)
        e.preferred_skills = 'Add at least one skill.';
    }
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

  /* ── Submit (Step 3 / final) ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    let validationErrors = {};
    if (isInvestor) {
      // Investor: use original investor validation (kept intact)
      const KEY_VALUE_FIELD_MAP = {
        valuation_caps: ['post_money_max', 'revenue_multiple_cap', 'ebitda_multiple_cap'],
        traction: ['arr_min', 'revenue_min', 'users_min', 'growth_min_pct'],
      };
      const hasValue = (v) => v !== null && v !== undefined && String(v).trim().length > 0;
      INVESTOR_SECTIONS.forEach((section) => {
        if (!section.required) return;
        const value = investorPreferences[section.id];
        if (section.type === 'textarea' && !hasValue(value)) validationErrors[section.id] = 'Required.';
        else if (section.type === 'chips' && (!Array.isArray(value) || !value.length)) validationErrors[section.id] = 'Select at least one.';
        else if (section.type === 'range' && (!hasValue(value?.min) || !hasValue(value?.max) || !hasValue(value?.currency))) validationErrors[section.id] = 'Provide min, max, and currency.';
        else if (section.type === 'range-percentage' && (!hasValue(value?.min_pct) || !hasValue(value?.max_pct))) validationErrors[section.id] = 'Provide both percentages.';
        else if (section.type === 'key-value') {
          const rk = KEY_VALUE_FIELD_MAP[section.id] || [];
          if (rk.find(k => !hasValue(value?.[k]))) validationErrors[section.id] = 'Fill all fields.';
        } else if (section.type === 'select' && !hasValue(value)) validationErrors[section.id] = 'Choose an option.';
        else if (!['textarea','chips','range','range-percentage','key-value','select'].includes(section.type) && !hasValue(value)) validationErrors[section.id] = 'Required.';
      });
      setInvestorErrors(validationErrors);
    } else {
      validationErrors = validateStep(3);
      setErrors(validationErrors);
    }
    if (Object.keys(validationErrors).length) return;

    setLoading(true);
    try {
      const payload = {
        onboarding_completed: true,
        ...(isInvestor ? {} : preferences),
        ...(isInvestor ? { investor_preferences: investorPreferences } : {}),
      };
      await recommendationAPI.saveOnboardingPreferences(payload);
      navigate('/dashboard');
    } catch (err) {
      console.error('Error saving preferences:', err);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ─── Progress bar width ── */
  const progressPct = isInvestor ? 100 : Math.round((step / TOTAL_STEPS) * 100);
  const animClass = direction === 'back' ? 'ob-step-back' : 'ob-step';

  /* ─── Investor flow – single step (unchanged logic, new theme) ── */
  if (isInvestor) {
    return (
      <div className="ob-page">
        <div className="ob-topbar">
          <div className="ob-topbar-fill" style={{ width: '100%' }} />
        </div>
        <div className="ob-wrapper">
          <form onSubmit={handleSubmit}>
            <div className="ob-card ob-step">
              <p className="ob-step-label">Investor Profile</p>
              <h1 className="ob-title">Dial In Your Investor Thesis</h1>
              <p className="ob-subtitle">
                Founders only see the right investors when we understand your thesis,
                check size, and how you help companies win.
              </p>
              {/* Investor sections rendered inline — unchanged data model */}
              {INVESTOR_SECTIONS.map(section => (
                <InvestorSectionRender
                  key={section.id}
                  section={section}
                  investorPreferences={investorPreferences}
                  setInvestorPreferences={setInvestorPreferences}
                  investorErrors={investorErrors}
                  setInvestorErrors={setInvestorErrors}
                />
              ))}
              <div className="ob-nav">
                <span />
                <button type="submit" className={`ob-next-btn ob-save-btn`} disabled={loading}>
                  {loading ? <><div className="ob-spinner" /> Saving...</> : <>Save Preferences ✓</>}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  /* ─── Non-investor 3-step wizard ── */
  return (
    <div className="ob-page">
      {/* Fixed top progress bar */}
      <div className="ob-topbar">
        <div className="ob-topbar-fill" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="ob-wrapper">
        <p className="ob-step-label">Step {step} of {TOTAL_STEPS}</p>

        {/* ══ STEP 1: Interests ══ */}
        {step === 1 && (
          <div key="step1" className={`ob-card ${animClass}`}>
            <h1 className="ob-title">Tell Us About Your Interests</h1>
            <p className="ob-subtitle">
              Help us personalize your experience by selecting your preferences.{' '}
              Fill every section so your <a href="#">matches</a> stay accurate.
            </p>

            {/* Categories */}
            <div className="ob-section">
              <div className="ob-section-heading">
                <span className="ob-icon">🌐</span>
                Categories of Interest
              </div>
              <div className="ob-check-grid">
                {CATEGORIES.map(cat => (
                  <CheckItem
                    key={cat}
                    label={formatLabel(cat)}
                    checked={preferences.selected_categories.includes(cat)}
                    onChange={() => toggle('selected_categories', cat)}
                  />
                ))}
              </div>
              {errors.selected_categories && (
                <span className="ob-error">{errors.selected_categories}</span>
              )}
            </div>

            <div className="ob-divider" />

            {/* Industries */}
            <div className="ob-section">
              <div className="ob-section-heading">
                <span className="ob-icon">⚡</span>
                Industries &amp; Fields
              </div>
              <div className="ob-chips">
                {INDUSTRIES.map(ind => (
                  <Chip
                    key={ind}
                    label={formatLabel(ind)}
                    selected={preferences.selected_fields.includes(ind)}
                    onClick={() => toggle('selected_fields', ind)}
                  />
                ))}
              </div>
              <AddRow
                value={newField}
                onChange={e => setNewField(e.target.value)}
                onAdd={() => addItem('selected_fields', newField, setNewField)}
                placeholder="Add an industry (e.g., Fintech, Healthcare)"
              />
              {(errors.selected_fields || inputErrors.selected_fields) && (
                <span className="ob-error">{errors.selected_fields || inputErrors.selected_fields}</span>
              )}
            </div>

            <div className="ob-nav">
              <span />
              <button type="button" className="ob-next-btn" onClick={goNext}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ══ STEP 2: Startup & Market Focus ══ */}
        {step === 2 && (
          <div key="step2" className={`ob-card ${animClass}`}>
            <h1 className="ob-title">Startup &amp; Market Focus</h1>
            <p className="ob-subtitle">
              Define the <a href="#">maturity levels</a> and market segments where you can
              add the most value.
            </p>

            {/* Startup stages */}
            <div className="ob-section">
              <div className="ob-section-heading">
                <span className="ob-icon">🚀</span>
                Preferred Startup Stages
              </div>
              <div className="ob-chips">
                {STARTUP_STAGES.map(stage => (
                  <Chip
                    key={stage}
                    label={formatLabel(stage)}
                    selected={preferences.preferred_startup_stages.includes(stage)}
                    onClick={() => toggle('preferred_startup_stages', stage)}
                  />
                ))}
              </div>
              <AddRow
                value={newStage}
                onChange={e => setNewStage(e.target.value)}
                onAdd={() => addItem('preferred_startup_stages', newStage, setNewStage)}
                placeholder="Add stages (e.g., Early, Growth, Mature)"
              />
              {(errors.preferred_startup_stages || inputErrors.preferred_startup_stages) && (
                <span className="ob-error">{errors.preferred_startup_stages || inputErrors.preferred_startup_stages}</span>
              )}
            </div>

            <div className="ob-divider" />

            {/* Market tags */}
            <div className="ob-section">
              <div className="ob-section-heading">
                <span className="ob-icon">🏷️</span>
                Market Tags
              </div>
              <div className="ob-chips">
                {TAG_SUGGESTIONS.map(tag => (
                  <Chip
                    key={tag}
                    label={formatLabel(tag)}
                    selected={preferences.selected_tags.includes(tag)}
                    onClick={() => toggle('selected_tags', tag)}
                  />
                ))}
              </div>
              <AddRow
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onAdd={() => addItem('selected_tags', newTag, setNewTag)}
                placeholder="Add a tag (e.g., Blockchain, B2B)"
              />
              {(errors.selected_tags || inputErrors.selected_tags) && (
                <span className="ob-error">{errors.selected_tags || inputErrors.selected_tags}</span>
              )}
            </div>

            <div className="ob-nav">
              <button type="button" className="ob-back-btn" onClick={goBack}>
                ← Back
              </button>
              <button type="button" className="ob-next-btn" onClick={goNext}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ══ STEP 3: Engagement & Skills ══ */}
        {step === 3 && (
          <div key="step3" className={`ob-card ${animClass}`}>
            <h1 className="ob-title">Engagement &amp; Skills</h1>
            <p className="ob-subtitle">
              Founders rely on this to tailor <a href="#">collaboration</a> invites. Let them
              know what you bring to the table.
            </p>

            {/* Engagement types */}
            <div className="ob-section">
              <div className="ob-section-heading">
                <span className="ob-icon">🗂️</span>
                Preferred Engagement Types
              </div>
              <div className="ob-check-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                {ENGAGEMENT_TYPES.map(type => (
                  <CheckItem
                    key={type}
                    label={formatLabel(type)}
                    checked={preferences.preferred_engagement_types.includes(type)}
                    onChange={() => toggle('preferred_engagement_types', type)}
                  />
                ))}
              </div>
              {errors.preferred_engagement_types && (
                <span className="ob-error">{errors.preferred_engagement_types}</span>
              )}
            </div>

            <div className="ob-divider" />

            {/* Skills */}
            <div className="ob-section">
              <div className="ob-section-heading">
                <span className="ob-icon">{'<>'}</span>
                Preferred Skills
              </div>
              <div className="ob-chips">
                {SKILL_SUGGESTIONS.map(skill => (
                  <Chip
                    key={skill}
                    label={formatLabel(skill)}
                    selected={preferences.preferred_skills.includes(skill)}
                    onClick={() => toggle('preferred_skills', skill)}
                  />
                ))}
              </div>
              <AddRow
                value={newSkill}
                onChange={e => setNewSkill(e.target.value)}
                onAdd={() => addItem('preferred_skills', newSkill, setNewSkill)}
                placeholder="Add skills (e.g., Python, React, ML)"
              />
              {(errors.preferred_skills || inputErrors.preferred_skills) && (
                <span className="ob-error">{errors.preferred_skills || inputErrors.preferred_skills}</span>
              )}
            </div>

            <div className="ob-nav">
              <button type="button" className="ob-back-btn" onClick={goBack}>
                ← Back
              </button>
              <button
                type="button"
                className={`ob-next-btn ob-save-btn`}
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading
                  ? <><div className="ob-spinner" /> Saving...</>
                  : <>Save Preferences ✓</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Investor section renderer (unchanged logic, extracted for clarity) ─── */
function InvestorSectionRender({ section, investorPreferences, setInvestorPreferences, investorErrors, setInvestorErrors }) {
  const formatLabel = (v) => v.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const value = investorPreferences[section.id] || (section.type === 'chips' ? [] : '');
  const error = investorErrors[section.id];

  const update = (field, val) => {
    setInvestorPreferences(p => ({ ...p, [field]: val }));
    setInvestorErrors(p => ({ ...p, [field]: undefined }));
  };
  const updateNested = (field, key, val) => {
    setInvestorPreferences(p => ({ ...p, [field]: { ...p[field], [key]: val } }));
    setInvestorErrors(p => ({ ...p, [field]: undefined }));
  };
  const toggleChip = (field, opt) => {
    setInvestorPreferences(p => {
      const cur = p[field] || [];
      return { ...p, [field]: cur.includes(opt) ? cur.filter(x => x !== opt) : [...cur, opt] };
    });
    setInvestorErrors(p => ({ ...p, [field]: undefined }));
  };

  const inputStyle = {
    width: '100%', height: '2.45rem', border: '1.5px solid #e5e7eb',
    borderRadius: '8px', padding: '0 0.85rem', fontSize: '0.85rem',
    fontFamily: 'Inter,sans-serif', color: '#1f2937', background: '#fff',
    outline: 'none', boxSizing: 'border-box',
  };

  if (section.type === 'textarea') return (
    <div className="ob-section" key={section.id}>
      <div className="ob-section-heading">{section.title}</div>
      <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '0.5rem' }}>{section.description}</p>
      <textarea style={{ ...inputStyle, height: 'auto', padding: '0.6rem 0.85rem', resize: 'vertical' }}
        rows={4} value={investorPreferences[section.id] || ''}
        onChange={e => update(section.id, e.target.value)}
        placeholder='Example: "Leading $250-500k checks into climate + AI infra at pre-seed."'
      />
      {error && <span className="ob-error">{error}</span>}
    </div>
  );

  if (section.type === 'chips') return (
    <div className="ob-section" key={section.id}>
      <div className="ob-section-heading">{section.title}</div>
      <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '0.5rem' }}>{section.description}</p>
      <div className="ob-chips">
        {(section.options || []).map(opt => (
          <button key={opt} type="button"
            className={`ob-chip${(Array.isArray(value) && value.includes(opt)) ? ' selected' : ''}`}
            onClick={() => toggleChip(section.id, opt)}>
            {formatLabel(opt)}
          </button>
        ))}
      </div>
      {error && <span className="ob-error">{error}</span>}
    </div>
  );

  if (section.type === 'range') return (
    <div className="ob-section" key={section.id}>
      <div className="ob-section-heading">{section.title}</div>
      <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '0.5rem' }}>{section.description}</p>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {[['min','Min'], ['max','Max']].map(([k, lbl]) => (
          <div key={k} style={{ flex: 1, minWidth: '120px' }}>
            <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>{lbl}</span>
            <input style={inputStyle} type="text" value={investorPreferences.check_size[k] || ''}
              onChange={e => updateNested('check_size', k, e.target.value)} placeholder={k === 'min' ? 'e.g. 100k' : 'e.g. 500k'} />
          </div>
        ))}
        <div style={{ flex: 1, minWidth: '120px' }}>
          <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Currency</span>
          <select style={{ ...inputStyle, appearance: 'auto' }} value={investorPreferences.check_size.currency || ''}
            onChange={e => updateNested('check_size', 'currency', e.target.value)}>
            {['USD','EUR','GBP','CAD','AUD','INR'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      {error && <span className="ob-error">{error}</span>}
    </div>
  );

  if (section.type === 'range-percentage') return (
    <div className="ob-section" key={section.id}>
      <div className="ob-section-heading">{section.title}</div>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {[['min_pct','Min %'],['max_pct','Max %']].map(([k, lbl]) => (
          <div key={k} style={{ flex: 1 }}>
            <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>{lbl}</span>
            <input style={inputStyle} type="number" value={investorPreferences.target_ownership[k] || ''}
              onChange={e => updateNested('target_ownership', k, e.target.value)} placeholder={k === 'min_pct' ? 'e.g. 5' : 'e.g. 12'} />
          </div>
        ))}
      </div>
      {error && <span className="ob-error">{error}</span>}
    </div>
  );

  if (section.type === 'key-value') {
    const keyConfig = section.id === 'valuation_caps'
      ? [{ key:'post_money_max',label:'Post-money cap' },{ key:'revenue_multiple_cap',label:'Revenue multiple cap' },{ key:'ebitda_multiple_cap',label:'EBITDA multiple cap' }]
      : [{ key:'arr_min',label:'ARR minimum' },{ key:'revenue_min',label:'Revenue minimum' },{ key:'users_min',label:'Users minimum' },{ key:'growth_min_pct',label:'Growth min %' }];
    return (
      <div className="ob-section" key={section.id}>
        <div className="ob-section-heading">{section.title}</div>
        {keyConfig.map(({ key, label }) => (
          <div key={key} style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>{label}</span>
            <input style={inputStyle} type="text" value={(investorPreferences[section.id]||{})[key]||''}
              onChange={e => updateNested(section.id, key, e.target.value)} placeholder="Optional" />
          </div>
        ))}
        {error && <span className="ob-error">{error}</span>}
      </div>
    );
  }

  if (section.type === 'select') {
    const opts = (section.options||[]).map(o => typeof o === 'string' ? { value:o, label:formatLabel(o) } : o);
    return (
      <div className="ob-section" key={section.id}>
        <div className="ob-section-heading">{section.title}</div>
        <select style={{ ...inputStyle, appearance: 'auto', height: '2.45rem' }}
          value={investorPreferences[section.id]||''} onChange={e => update(section.id, e.target.value)}>
          <option value="">Select an option</option>
          {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {error && <span className="ob-error">{error}</span>}
      </div>
    );
  }

  return null;
}

export default OnboardingPreferences;
