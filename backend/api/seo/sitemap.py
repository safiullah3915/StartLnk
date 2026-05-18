"""
StartLnk SEO Sitemap Generator
Generates dynamic sitemap XML for all indexable pages.
Uses Django's default LocMemCache — NO Redis required currently.

Production safeguards:
- Programmatic pages only included when indexability thresholds are met
- Thin startups (short titles/descriptions) excluded
- Empty sitemaps return valid XML with zero entries
"""

import json
from datetime import datetime
from django.http import HttpResponse
from django.core.cache import cache
from django.utils import timezone

from .metadata import (
    ALLOWED_PROGRAMMATIC_SLUGS,
    PROGRAMMATIC_INDEX_THRESHOLDS,
    check_programmatic_indexability,
    check_startup_indexability,
)

SITE_URL = "https://startlnk.xyz"

# Cache timeouts (seconds)
SITEMAP_CACHE_TTL = 60 * 30          # 30 minutes for main sitemap
STARTUPS_CACHE_TTL = 60 * 15         # 15 minutes for startups
STATIC_CACHE_TTL = 60 * 60 * 24      # 24 hours for static pages


def _xml_escape(text):
    if not text:
        return ""
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


def _url_entry(loc, lastmod=None, changefreq="weekly", priority="0.7"):
    lastmod_tag = f"    <lastmod>{lastmod}</lastmod>\n" if lastmod else ""
    return (
        f"  <url>\n"
        f"    <loc>{_xml_escape(loc)}</loc>\n"
        f"{lastmod_tag}"
        f"    <changefreq>{changefreq}</changefreq>\n"
        f"    <priority>{priority}</priority>\n"
        f"  </url>\n"
    )


def _build_sitemap_xml(urls):
    header = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
        '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'
    )
    footer = "</urlset>"
    return header + "".join(urls) + footer


def _build_index_xml(sitemaps):
    header = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    )
    footer = "</sitemapindex>"
    today = datetime.utcnow().strftime("%Y-%m-%d")
    entries = "".join(
        f"  <sitemap>\n    <loc>{SITE_URL}{loc}</loc>\n    <lastmod>{today}</lastmod>\n  </sitemap>\n"
        for loc in sitemaps
    )
    return header + entries + footer


# ─────────────────────────────────────────────
# SITEMAP INDEX
# ─────────────────────────────────────────────
def sitemap_index_view(request):
    cached = cache.get("seo_sitemap_index")
    if cached:
        return HttpResponse(cached, content_type="application/xml")

    # Only include programmatic sitemap if thresholds are met
    sitemaps = [
        "/sitemap-static.xml",
        "/sitemap-startups.xml",
        "/sitemap-collaboration.xml",
        "/sitemap-marketplace.xml",
    ]

    # Gate: only add programmatic sitemap if platform has content
    try:
        from api.models import Startup, Position
        startup_count = Startup.objects.filter(status="active").count()
        position_count = Position.objects.filter(is_active=True).count()
        if (startup_count >= PROGRAMMATIC_INDEX_THRESHOLDS["min_active_startups"]
                and position_count >= PROGRAMMATIC_INDEX_THRESHOLDS["min_active_positions"]):
            sitemaps.append("/sitemap-programmatic.xml")
    except Exception:
        pass  # Don't include programmatic if we can't verify

    xml = _build_index_xml(sitemaps)
    cache.set("seo_sitemap_index", xml, SITEMAP_CACHE_TTL)
    return HttpResponse(xml, content_type="application/xml")


# ─────────────────────────────────────────────
# STATIC PAGES SITEMAP
# ─────────────────────────────────────────────
def sitemap_static_view(request):
    cached = cache.get("seo_sitemap_static")
    if cached:
        return HttpResponse(cached, content_type="application/xml")

    static_pages = [
        ("/", "daily", "1.0"),
        ("/collaboration", "daily", "0.9"),
        ("/marketplace", "daily", "0.9"),
        ("/people", "daily", "0.8"),
        ("/about", "monthly", "0.6"),
        ("/contact", "monthly", "0.5"),
        ("/faq", "monthly", "0.7"),
        ("/privacy", "monthly", "0.4"),
        ("/terms", "monthly", "0.4"),
        ("/signup", "monthly", "0.8"),
    ]

    today = datetime.utcnow().strftime("%Y-%m-%d")
    urls = [
        _url_entry(f"{SITE_URL}{path}", today, freq, pri)
        for path, freq, pri in static_pages
    ]
    xml = _build_sitemap_xml(urls)
    cache.set("seo_sitemap_static", xml, STATIC_CACHE_TTL)
    return HttpResponse(xml, content_type="application/xml")


# ─────────────────────────────────────────────
# STARTUPS SITEMAP (all startups — with quality gate)
# ─────────────────────────────────────────────
def sitemap_startups_view(request):
    cached = cache.get("seo_sitemap_startups")
    if cached:
        return HttpResponse(cached, content_type="application/xml")

    try:
        from api.models import Startup
        startups = Startup.objects.filter(
            status="active"
        ).values("id", "title", "description", "updated_at", "type").order_by("-updated_at")[:5000]

        urls = []
        for s in startups:
            # Quality gate: skip thin startups from sitemap
            if not check_startup_indexability(s):
                continue
            lastmod = s["updated_at"].strftime("%Y-%m-%d") if s.get("updated_at") else None
            urls.append(_url_entry(
                f"{SITE_URL}/startupdetail/{s['id']}",
                lastmod=lastmod,
                changefreq="weekly",
                priority="0.8",
            ))
    except Exception:
        urls = []

    xml = _build_sitemap_xml(urls)
    cache.set("seo_sitemap_startups", xml, STARTUPS_CACHE_TTL)
    return HttpResponse(xml, content_type="application/xml")


# ─────────────────────────────────────────────
# COLLABORATION SITEMAP (with quality gate)
# ─────────────────────────────────────────────
def sitemap_collaboration_view(request):
    cached = cache.get("seo_sitemap_collaboration")
    if cached:
        return HttpResponse(cached, content_type="application/xml")

    try:
        from api.models import Startup
        startups = Startup.objects.filter(
            status="active", type="collaboration"
        ).values("id", "title", "description", "updated_at")[:2000]

        urls = [
            _url_entry(
                f"{SITE_URL}/startupdetail/{s['id']}",
                lastmod=s["updated_at"].strftime("%Y-%m-%d") if s.get("updated_at") else None,
                changefreq="daily",
                priority="0.9",
            )
            for s in startups
            if check_startup_indexability(s)
        ]
    except Exception:
        urls = []

    xml = _build_sitemap_xml(urls)
    cache.set("seo_sitemap_collaboration", xml, STARTUPS_CACHE_TTL)
    return HttpResponse(xml, content_type="application/xml")


# ─────────────────────────────────────────────
# MARKETPLACE SITEMAP (with quality gate)
# ─────────────────────────────────────────────
def sitemap_marketplace_view(request):
    cached = cache.get("seo_sitemap_marketplace")
    if cached:
        return HttpResponse(cached, content_type="application/xml")

    try:
        from api.models import Startup
        startups = Startup.objects.filter(
            status="active", type="marketplace"
        ).values("id", "title", "description", "updated_at")[:2000]

        urls = [
            _url_entry(
                f"{SITE_URL}/startupdetail/{s['id']}",
                lastmod=s["updated_at"].strftime("%Y-%m-%d") if s.get("updated_at") else None,
                changefreq="weekly",
                priority="0.8",
            )
            for s in startups
            if check_startup_indexability(s)
        ]
    except Exception:
        urls = []

    xml = _build_sitemap_xml(urls)
    cache.set("seo_sitemap_marketplace", xml, STARTUPS_CACHE_TTL)
    return HttpResponse(xml, content_type="application/xml")


# ─────────────────────────────────────────────
# PROGRAMMATIC SEO SITEMAP (strict indexability gate)
# ─────────────────────────────────────────────
def sitemap_programmatic_view(request):
    """
    Generates sitemap for programmatic SEO landing pages.
    Each slug is individually checked against indexability thresholds.
    Only pages that pass ALL checks are included.
    """
    cached = cache.get("seo_sitemap_programmatic")
    if cached:
        return HttpResponse(cached, content_type="application/xml")

    urls = []
    today = datetime.utcnow().strftime("%Y-%m-%d")

    # Iterate over all allowed programmatic page types and their slugs
    for page_type, slugs in ALLOWED_PROGRAMMATIC_SLUGS.items():
        for slug in sorted(slugs):
            # Each slug individually checked
            if check_programmatic_indexability(page_type, slug):
                urls.append(_url_entry(
                    f"{SITE_URL}/{page_type}/{slug}",
                    today, "weekly", "0.6"
                ))

    xml = _build_sitemap_xml(urls)
    cache.set("seo_sitemap_programmatic", xml, SITEMAP_CACHE_TTL)
    return HttpResponse(xml, content_type="application/xml")
