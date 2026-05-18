/**
 * StartLnk SEOHead Component
 * Injects all meta tags, OG tags, Twitter cards, canonical, and JSON-LD
 * via react-helmet-async. Purely additive — touches NO existing UI.
 *
 * Production safeguards:
 * - Zero <meta name="keywords"> output (deprecated, ignored by Google/Bing)
 * - Canonical validation: strips query params, trailing slashes
 * - robots directive passthrough (noindex for thin pages)
 * - Zero cloaking: identical rendering for users and bots
 * - Zero hydration instability: Helmet manages <head> only
 *
 * Usage:
 *   <SEOHead
 *     title="..."
 *     description="..."
 *     canonical="..."
 *     robots="index, follow"
 *     og={{ title, description, image, type, url }}
 *     twitter={{ card, title, description, image }}
 *     schema={[{...jsonLD}, ...]}
 *   />
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';
import { buildSEOConfig } from '../../hooks/useSEO';

function SEOHead(props) {
  const seo = buildSEOConfig(props);

  return (
    <Helmet>
      {/* Primary Meta */}
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <meta name="robots" content={seo.robots} />
      <link rel="canonical" href={seo.canonical} />

      {/* Open Graph */}
      <meta property="og:title" content={seo.og.title} />
      <meta property="og:description" content={seo.og.description} />
      <meta property="og:image" content={seo.og.image} />
      <meta property="og:type" content={seo.og.type} />
      <meta property="og:url" content={seo.og.url} />
      <meta property="og:site_name" content={seo.og.site_name} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Card */}
      <meta name="twitter:card" content={seo.twitter.card} />
      <meta name="twitter:title" content={seo.twitter.title} />
      <meta name="twitter:description" content={seo.twitter.description} />
      <meta name="twitter:image" content={seo.twitter.image} />
      <meta name="twitter:site" content={seo.twitter.site} />

      {/* Extra crawl hints */}
      <meta name="author" content="StartLnk" />
      <meta name="theme-color" content="#25224A" />

      {/* JSON-LD Structured Data — only emitted if schema is provided */}
      {seo.schema && Array.isArray(seo.schema) && seo.schema.map((s, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }}
        />
      ))}
      {seo.schema && !Array.isArray(seo.schema) && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(seo.schema) }}
        />
      )}
    </Helmet>
  );
}

export default SEOHead;
