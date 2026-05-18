/**
 * StartLnk Programmatic SEO Page
 * Generates landing pages for high-volume search terms:
 * /jobs/:role, /internships/:role, /startups/:category,
 * /collaborate/:type, /remote/:role, /opportunities/:role
 *
 * ISOLATED SEO LAYER — zero impact on existing UI/routes.
 *
 * Production safeguards:
 * - Indexability gating: only whitelisted slugs are indexable
 * - Unrecognized slugs get noindex + excluded from sitemap
 * - Zero keywords meta tag
 * - Canonical validation (no query params, no trailing slashes)
 * - Identical rendering for users and bots (zero cloaking)
 */

import React from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import SEOHead from '../../components/SEOHead/SEOHead';

const SITE_URL = 'https://startlnk.xyz';

// ─── WHITELISTED SLUGS ────────────────────────────────────────
// Only these slugs produce indexable pages.
// Any slug NOT in this set gets noindex automatically.
const ALLOWED_SLUGS = {
  jobs: new Set([
    'react-developer', 'frontend-developer', 'backend-developer',
    'ui-ux-designer', 'software-engineer', 'full-stack-developer',
    'product-manager', 'data-scientist', 'ai-engineer',
    'mobile-developer', 'devops-engineer', 'marketing-specialist',
  ]),
  internships: new Set([
    'react-developer', 'frontend-developer', 'backend-developer',
    'ui-ux-designer', 'software-engineer', 'full-stack-developer',
  ]),
  startups: new Set([
    'saas', 'marketplace', 'ecommerce', 'agency',
    'subscription', 'social-platform', 'fintech',
    'edtech', 'healthtech', 'ai-startup',
  ]),
  collaborate: new Set([
    'cofounder-ai', 'cofounder-saas', 'cofounder-ecommerce',
    'technical-cofounder', 'business-cofounder',
  ]),
  remote: new Set([
    'react-developer', 'frontend-developer', 'backend-developer',
    'ui-ux-designer', 'software-engineer',
  ]),
  opportunities: new Set([
    'react-developer', 'frontend-developer', 'backend-developer',
    'ui-ux-designer', 'software-engineer',
  ]),
};

function slugToLabel(slug = '') {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function isSlugIndexable(pageType, slug) {
  const allowed = ALLOWED_SLUGS[pageType];
  return allowed ? allowed.has(slug) : false;
}

function buildSEO(pageType, param) {
  const label = slugToLabel(param);
  const indexable = isSlugIndexable(pageType, param);
  const url = `${SITE_URL}/${pageType}/${param}`;

  const configs = {
    jobs: {
      title: `${label} Startup Jobs — Find Your Startup Career | StartLnk`,
      description: `Find ${label} jobs at startups on StartLnk. Join innovative startup teams, work with founders, and grow your career in Pakistan's startup ecosystem.`,
    },
    internships: {
      title: `${label} Startup Internships | StartLnk`,
      description: `Discover ${label} internships at startups on StartLnk. Gain real startup experience, build your portfolio, and kickstart your career in Pakistan.`,
    },
    startups: {
      title: `${label} Startups | StartLnk`,
      description: `Browse ${label} startups on StartLnk. Discover innovative companies, investment opportunities, and collaboration projects in Pakistan's startup ecosystem.`,
    },
    collaborate: {
      title: `Collaborate on ${label} Startups | StartLnk`,
      description: `Find ${label} collaboration opportunities on StartLnk. Join startup teams, find co-founders, and build innovative products together.`,
    },
    remote: {
      title: `Remote ${label} Startup Jobs & Opportunities | StartLnk`,
      description: `Work remotely with startups as a ${label} on StartLnk. Find remote startup jobs, freelance opportunities, and flexible arrangements.`,
    },
    opportunities: {
      title: `${label} Startup Opportunities | StartLnk`,
      description: `Explore ${label} opportunities at startups on StartLnk. Jobs, internships, collaborations, and freelance work with innovative startups.`,
    },
  };

  const cfg = configs[pageType] || configs.opportunities;

  return {
    ...cfg,
    canonical: url,
    robots: indexable ? 'index, follow' : 'noindex, follow',
    og: { title: cfg.title, description: cfg.description, url },
    twitter: { title: cfg.title, description: cfg.description },
    // Only emit schema for indexable pages
    schema: indexable ? [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: cfg.title,
        description: cfg.description,
        url,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: slugToLabel(pageType), item: `${SITE_URL}/${pageType}` },
          { '@type': 'ListItem', position: 3, name: label, item: url },
        ],
      },
    ] : null,
  };
}

// ─── Type badges ───────────────────────────────────────────────
const TYPE_LABELS = {
  jobs: { label: 'Startup Jobs', color: '#2563eb' },
  internships: { label: 'Startup Internships', color: '#059669' },
  startups: { label: 'Startups', color: '#7c3aed' },
  collaborate: { label: 'Collaboration', color: '#d97706' },
  remote: { label: 'Remote Work', color: '#0891b2' },
  opportunities: { label: 'Opportunities', color: '#dc2626' },
};

const PAGE_STYLES = {
  wrapper: {
    minHeight: '100vh',
    background: '#f8fafc',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  hero: {
    background: 'linear-gradient(135deg, #1e1b4b 0%, #25224A 60%, #312e81 100%)',
    color: '#fff',
    padding: '3rem 2rem 2.5rem',
    textAlign: 'center',
  },
  badge: {
    display: 'inline-block',
    padding: '0.3rem 1rem',
    borderRadius: '999px',
    fontSize: '0.78rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: '1rem',
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  h1: {
    fontSize: 'clamp(1.6rem, 4vw, 2.5rem)',
    fontWeight: 800,
    margin: '0 0 0.75rem',
    lineHeight: 1.2,
  },
  desc: {
    fontSize: '1.05rem',
    opacity: 0.85,
    maxWidth: '600px',
    margin: '0 auto 1.5rem',
  },
  ctaRow: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  ctaPrimary: {
    padding: '0.7rem 1.8rem',
    borderRadius: '8px',
    fontWeight: 700,
    fontSize: '0.95rem',
    background: '#fff',
    color: '#25224A',
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block',
  },
  ctaSecondary: {
    padding: '0.7rem 1.8rem',
    borderRadius: '8px',
    fontWeight: 700,
    fontSize: '0.95rem',
    background: 'transparent',
    color: '#fff',
    border: '2px solid rgba(255,255,255,0.4)',
    textDecoration: 'none',
    display: 'inline-block',
  },
  content: {
    maxWidth: '1100px',
    margin: '2.5rem auto',
    padding: '0 1.5rem',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#1e1b4b',
    marginBottom: '1.25rem',
  },
  relatedGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '1rem',
    marginBottom: '2.5rem',
  },
  relatedCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '1rem 1.25rem',
    textDecoration: 'none',
    color: '#25224A',
    fontWeight: 600,
    fontSize: '0.9rem',
    display: 'block',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  faqSection: {
    background: '#fff',
    borderRadius: '12px',
    padding: '1.5rem',
    border: '1px solid #e2e8f0',
    marginBottom: '2rem',
  },
  faqQ: {
    fontWeight: 700,
    color: '#25224A',
    marginBottom: '0.35rem',
    fontSize: '0.97rem',
  },
  faqA: {
    color: '#475569',
    fontSize: '0.9rem',
    marginBottom: '1.25rem',
    lineHeight: 1.6,
  },
  cta2: {
    background: 'linear-gradient(135deg, #25224A, #312e81)',
    borderRadius: '14px',
    padding: '2rem',
    textAlign: 'center',
    color: '#fff',
    marginBottom: '2rem',
  },
};

export default function ProgrammaticSEOPage() {
  const { param } = useParams();
  const location = useLocation();

  // Infer page type from URL path
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const pageType = pathSegments[0] || 'opportunities';
  const seoParam = param || pathSegments[1] || '';

  const seo = buildSEO(pageType, seoParam);
  const typeInfo = TYPE_LABELS[pageType] || TYPE_LABELS.opportunities;
  const paramLabel = slugToLabel(seoParam);

  // Only link to whitelisted related roles
  const allAllowed = ALLOWED_SLUGS[pageType] || new Set();
  const relatedRoles = [...allAllowed]
    .filter(r => r !== seoParam)
    .slice(0, 8);

  const faqs = [
    {
      q: `How do I find ${paramLabel} opportunities on StartLnk?`,
      a: `Sign up for free on StartLnk, browse the Collaboration and Marketplace sections, and filter by your skills. Founders post ${paramLabel.toLowerCase()} roles directly on the platform.`,
    },
    {
      q: `Are these ${paramLabel} positions paid?`,
      a: `StartLnk features a mix of paid and equity-based opportunities. Each listing clearly states the compensation model — revenue share, equity, salary, or hybrid arrangements.`,
    },
    {
      q: `Can I apply remotely for ${paramLabel} positions?`,
      a: `Yes. Many startups on StartLnk are open to remote collaboration. Filter by "remote" when browsing to find fully remote ${paramLabel.toLowerCase()} positions.`,
    },
    {
      q: `What types of startups are hiring ${paramLabel} professionals?`,
      a: `StartLnk features startups across SaaS, FinTech, EdTech, HealthTech, AI/ML, E-commerce, and more. All are actively seeking ${paramLabel.toLowerCase()} collaborators.`,
    },
  ];

  return (
    <div style={PAGE_STYLES.wrapper}>
      <SEOHead
        title={seo.title}
        description={seo.description}
        canonical={seo.canonical}
        robots={seo.robots}
        og={seo.og}
        twitter={seo.twitter}
        schema={seo.schema}
      />

      {/* Hero */}
      <div style={PAGE_STYLES.hero}>
        <span style={PAGE_STYLES.badge}>{typeInfo.label}</span>
        <h1 style={PAGE_STYLES.h1}>{paramLabel} {typeInfo.label}</h1>
        <p style={PAGE_STYLES.desc}>{seo.description}</p>
        <div style={PAGE_STYLES.ctaRow}>
          <Link to="/signup" style={PAGE_STYLES.ctaPrimary}>
            Get Started Free
          </Link>
          <Link
            to={pageType === 'startups' ? '/marketplace' : '/collaboration'}
            style={PAGE_STYLES.ctaSecondary}
          >
            Browse {typeInfo.label}
          </Link>
        </div>
      </div>

      <div style={PAGE_STYLES.content}>

        {/* Internal Linking — Only whitelisted related roles */}
        {relatedRoles.length > 0 && (
          <>
            <h2 style={PAGE_STYLES.sectionTitle}>
              Explore More {typeInfo.label}
            </h2>
            <div style={PAGE_STYLES.relatedGrid}>
              {relatedRoles.map(role => (
                <Link
                  key={role}
                  to={`/${pageType}/${role}`}
                  style={PAGE_STYLES.relatedCard}
                >
                  {slugToLabel(role)} →
                </Link>
              ))}
            </div>
          </>
        )}

        {/* FAQ Section — boosts FAQPage schema + long-tail */}
        <div style={PAGE_STYLES.faqSection}>
          <h2 style={PAGE_STYLES.sectionTitle}>
            Frequently Asked Questions
          </h2>
          {faqs.map((faq, i) => (
            <div key={i}>
              <p style={PAGE_STYLES.faqQ}>{faq.q}</p>
              <p style={PAGE_STYLES.faqA}>{faq.a}</p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div style={PAGE_STYLES.cta2}>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.4rem', fontWeight: 800 }}>
            Ready to Join the Startup Ecosystem?
          </h2>
          <p style={{ opacity: 0.85, marginBottom: '1.25rem' }}>
            Thousands of founders, developers, and innovators are already building on StartLnk.
          </p>
          <Link to="/signup" style={PAGE_STYLES.ctaPrimary}>
            Create Your Free Account
          </Link>
        </div>

      </div>
    </div>
  );
}
