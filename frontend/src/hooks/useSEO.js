/**
 * StartLnk SEO Config Builder
 * Manages page-level metadata resolution for react-helmet-async.
 * ISOLATED layer — does NOT modify any existing component logic.
 *
 * Production safeguards:
 * - Zero keywords output (deprecated by Google/Bing)
 * - Canonical validation: strips query params, trailing slashes
 * - Safe defaults for all metadata fields
 * - SITE_URL driven by VITE_APP_URL env var — no hardcoding
 *
 * Usage:
 *   buildSEOConfig({ title, description, canonical, og, twitter, schema, robots })
 */

const SITE_NAME = 'StartLnk';

// Driven by environment variable — changes automatically between dev and prod
// Dev:  VITE_APP_URL=http://localhost:5173
// Prod: VITE_APP_URL=https://startlnk.xyz
export const SITE_URL = import.meta.env.VITE_APP_URL || 'https://startlnk.xyz';

export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

/**
 * Validates and normalizes a canonical URL.
 * - Strips query parameters (pagination, filters must not be indexed)
 * - Strips trailing slashes (canonical consistency)
 * - Ensures absolute URL
 */
export function validateCanonical(url) {
  if (!url) return SITE_URL;

  // Strip query parameters — filtered/paginated pages share the canonical with the root page
  let clean = url.split('?')[0];

  // Strip trailing slash (except bare domain root)
  if (clean !== SITE_URL && clean.endsWith('/')) {
    clean = clean.replace(/\/+$/, '');
  }

  // Ensure absolute URL — relative paths get the site prefix
  if (!clean.startsWith('http')) {
    clean = `${SITE_URL}${clean.startsWith('/') ? '' : '/'}${clean}`;
  }

  return clean;
}

/**
 * Returns a fully resolved SEO config object with safe defaults.
 * Keywords are intentionally excluded — deprecated by all major search engines.
 */
export function buildSEOConfig({
  title       = '',
  description = '',
  canonical   = '',
  robots      = 'index, follow',
  og          = {},
  twitter     = {},
  schema      = null,
} = {}) {
  const resolvedTitle = title
    ? (title.includes('|') || title.includes('—') ? title : `${title} | ${SITE_NAME}`)
    : `${SITE_NAME} — Startup Collaboration & Opportunities`;

  const resolvedDesc =
    description ||
    "StartLnk is Pakistan's leading startup collaboration ecosystem. Connect with founders, join startups, and discover opportunities.";

  const resolvedCanonical = validateCanonical(canonical);
  const resolvedOGImage   = og.image || DEFAULT_OG_IMAGE;

  let resolvedRobots = robots;

  // Crawl budget protection — noindex thin/duplicate pages automatically
  if (typeof window !== 'undefined') {
    const search = window.location.search.toLowerCase();
    const path   = window.location.pathname.toLowerCase();

    if (path.includes('/search') || search.includes('?q=') || search.includes('?query=')) {
      resolvedRobots = 'noindex, follow';
    } else if (
      search.includes('page=')   ||
      search.includes('filter=') ||
      search.includes('sort=')   ||
      search.includes('sortby=') ||
      search.includes('category=') ||
      search.includes('type=')
    ) {
      resolvedRobots = 'noindex, follow';
    }
  }

  return {
    title:       resolvedTitle,
    description: resolvedDesc,
    canonical:   resolvedCanonical,
    robots:      resolvedRobots,
    og: {
      title:       og.title       || resolvedTitle,
      description: og.description || resolvedDesc,
      image:       resolvedOGImage,
      type:        og.type        || 'website',
      url:         og.url         || resolvedCanonical,
      site_name:   og.site_name   || SITE_NAME,
    },
    twitter: {
      card:        twitter.card        || 'summary_large_image',
      title:       twitter.title       || resolvedTitle,
      description: twitter.description || resolvedDesc,
      image:       twitter.image       || resolvedOGImage,
      site:        twitter.site        || '@StartLnk',
    },
    schema,
  };
}

export { SITE_NAME, DEFAULT_OG_IMAGE as DEFAULT_OG_IMAGE_URL };
