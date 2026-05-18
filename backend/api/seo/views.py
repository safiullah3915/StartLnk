"""
StartLnk SEO Views
Handles: robots.txt, metadata API, structured data endpoints.
All views are READ-ONLY. No business logic is altered.

Production safeguards:
- Crawl budget protection via strict robots.txt
- Duplicate URL prevention
- noindex for thin/internal pages
- Zero cloaking — identical content for users and bots
"""

import json
from django.http import HttpResponse, JsonResponse
from django.core.cache import cache
from django.views.decorators.http import require_GET
from django.views.decorators.cache import cache_page

from .metadata import (
    get_landing_metadata,
    get_collaboration_metadata,
    get_marketplace_metadata,
    get_people_metadata,
    get_about_metadata,
    get_contact_metadata,
    get_faq_metadata,
    get_programmatic_metadata,
    get_startup_metadata,
    get_organization_schema,
    get_website_schema,
    get_faq_schema,
    get_breadcrumb_schema,
    get_job_posting_schema,
    check_programmatic_indexability,
    check_startup_indexability,
    build_canonical,
    SITE_URL,
    SITE_NAME,
    ALLOWED_PROGRAMMATIC_SLUGS,
)


# ─────────────────────────────────────────────
# ROBOTS.TXT — Crawl budget protection
# ─────────────────────────────────────────────
@require_GET
def robots_txt_view(request):
    """
    Serve robots.txt with strict crawl budget protection.
    
    Strategy:
    - Allow only high-value, indexable public routes
    - Block ALL authenticated/private/internal routes
    - Block ALL query-parameter variations to prevent duplicate URLs
    - Block internal search to prevent crawl waste
    - Single sitemap reference (index only) to control discovery
    """
    cached = cache.get("seo_robots_txt")
    if cached:
        return HttpResponse(cached, content_type="text/plain")

    content = f"""User-agent: *

# ─── HIGH-VALUE PUBLIC ROUTES ───
Allow: /$
Allow: /collaboration$
Allow: /marketplace$
Allow: /people$
Allow: /about$
Allow: /contact$
Allow: /faq$
Allow: /privacy$
Allow: /terms$
Allow: /signup$
Allow: /startupdetail/

# Programmatic SEO routes (gated by indexability on-page)
Allow: /jobs/
Allow: /internships/
Allow: /startups/
Allow: /collaborate/
Allow: /remote/
Allow: /opportunities/

# ─── BLOCK AUTHENTICATED/PRIVATE ROUTES ───
Disallow: /dashboard
Disallow: /account
Disallow: /message
Disallow: /onboarding-preferences
Disallow: /complete-profile
Disallow: /createstartup
Disallow: /pitch-idea
Disallow: /investor-dashboard
Disallow: /apply-for-collaboration/
Disallow: /startups-with-applications
Disallow: /positions/
Disallow: /favorites
Disallow: /verify-email
Disallow: /signin
Disallow: /login

# ─── BLOCK API/ADMIN ENDPOINTS ───
Disallow: /api/
Disallow: /auth/
Disallow: /admin/
Disallow: /account/

# ─── CRAWL BUDGET: BLOCK QUERY PARAMETERS ───
# Prevents duplicate content from pagination, sorting, filtering
Disallow: /*?*page=
Disallow: /*?*sort=
Disallow: /*?*sortBy=
Disallow: /*?*filter=
Disallow: /*?*category=
Disallow: /*?*order=
Disallow: /*?*query=
Disallow: /*?*q=
Disallow: /*?*search=
Disallow: /*?*type=
Disallow: /*?*minRevenue=
Disallow: /*?*maxRevenue=
Disallow: /*?*field=
Disallow: /*?*phase=
Disallow: /*?*team_size=

# ─── BLOCK INTERNAL SEARCH PAGES ───
Disallow: /search
Disallow: /search?

# ─── CRAWL RATE LIMITING ───
Crawl-delay: 1

# ─── SITEMAP (single index only) ───
Sitemap: {SITE_URL}/sitemap.xml

# ─── MEDIA ACCESS FOR IMAGE CRAWLERS ───
User-agent: Googlebot-Image
Allow: /media/
Disallow: /api/
"""
    cache.set("seo_robots_txt", content, 60 * 60 * 24)  # Cache 24h
    return HttpResponse(content, content_type="text/plain")


# ─────────────────────────────────────────────
# METADATA API ENDPOINT
# ─────────────────────────────────────────────
@require_GET
def page_metadata_view(request):
    """
    Returns SEO metadata JSON for any page type.
    Frontend uses this for dynamic react-helmet-async tag injection.
    Query params: ?page=landing|collaboration|marketplace|people|about|contact|faq|startup
    For startup: also pass ?id=<uuid>
    """
    page = request.GET.get("page", "landing")
    cache_key = f"seo_meta_{page}_{request.GET.get('id', '')}"
    cached = cache.get(cache_key)
    if cached:
        return JsonResponse(cached)

    if page == "landing":
        data = get_landing_metadata()
    elif page == "collaboration":
        data = get_collaboration_metadata()
    elif page == "marketplace":
        data = get_marketplace_metadata()
    elif page == "people":
        data = get_people_metadata()
    elif page == "about":
        data = get_about_metadata()
    elif page == "contact":
        data = get_contact_metadata()
    elif page == "faq":
        data = get_faq_metadata()
    elif page == "startup":
        startup_id = request.GET.get("id", "")
        if not startup_id:
            return JsonResponse({"error": "startup id required"}, status=400)
        try:
            from api.models import Startup
            startup = Startup.objects.select_related("owner").prefetch_related(
                "positions", "tags", "team__members__user"
            ).get(id=startup_id)

            startup_data = {
                "id": str(startup.id),
                "title": startup.title,
                "description": startup.description,
                "type": startup.type,
                "category": startup.category,
                "field": startup.field,
                "owner": {
                    "id": str(startup.owner.id),
                    "username": startup.owner.username,
                    "full_name": getattr(startup.owner, "full_name", "") or startup.owner.username,
                },
                "positions": [
                    {"title": p.title, "description": p.description, "created_at": str(p.created_at)}
                    for p in startup.positions.filter(is_active=True)[:5]
                ],
            }
            data = get_startup_metadata(startup_data)
        except Exception:
            data = get_landing_metadata()
    else:
        data = get_landing_metadata()

    cache.set(cache_key, data, 60 * 10)  # Cache 10 minutes
    return JsonResponse(data)


# ─────────────────────────────────────────────
# STRUCTURED DATA ENDPOINTS
# ─────────────────────────────────────────────
@require_GET
def schema_organization_view(request):
    """Returns Organization structured data JSON-LD."""
    cached = cache.get("seo_schema_org")
    if cached:
        return JsonResponse(cached)
    data = get_organization_schema()
    cache.set("seo_schema_org", data, 60 * 60 * 6)
    return JsonResponse(data)


@require_GET
def schema_website_view(request):
    """Returns WebSite structured data with SearchAction."""
    cached = cache.get("seo_schema_website")
    if cached:
        return JsonResponse(cached)
    data = get_website_schema()
    cache.set("seo_schema_website", data, 60 * 60 * 6)
    return JsonResponse(data)


@require_GET
def schema_faq_view(request):
    """Returns FAQPage structured data JSON-LD."""
    cached = cache.get("seo_schema_faq")
    if cached:
        return JsonResponse(cached)
    data = get_faq_schema()
    cache.set("seo_schema_faq", data, 60 * 60 * 24)
    return JsonResponse(data)


@require_GET
def schema_startup_view(request, pk):
    """Returns structured data for a specific startup (JobPostings + Organization)."""
    cache_key = f"seo_schema_startup_{pk}"
    cached = cache.get(cache_key)
    if cached:
        return JsonResponse(cached, safe=False)

    try:
        from api.models import Startup
        startup = Startup.objects.select_related("owner").prefetch_related(
            "positions", "tags"
        ).get(id=pk, status="active")

        startup_data = {
            "id": str(startup.id),
            "title": startup.title,
            "description": startup.description,
            "type": startup.type,
            "category": startup.category,
            "field": startup.field,
            "owner": {
                "username": startup.owner.username,
                "full_name": getattr(startup.owner, "full_name", "") or startup.owner.username,
            },
            "positions": [
                {
                    "title": p.title,
                    "description": p.description,
                    "time_commitment": p.time_commitment,
                    "created_at": str(p.created_at),
                }
                for p in startup.positions.filter(is_active=True)[:10]
            ],
        }

        # Only emit schema for indexable startups
        if not check_startup_indexability(startup_data):
            return JsonResponse([], safe=False)

        schemas = []

        from .metadata import get_startup_schema
        schemas.append(get_startup_schema(startup_data))

        # JobPosting schemas for each active position
        for pos in startup_data["positions"]:
            schemas.append(get_job_posting_schema(startup_data, pos))

        # Breadcrumb
        schemas.append(get_breadcrumb_schema([
            {"name": "Home", "url": "/"},
            {"name": "Collaboration" if startup.type == "collaboration" else "Marketplace",
             "url": f"/{startup.type}"},
            {"name": startup.title, "url": f"/startupdetail/{startup.id}"},
        ]))

        cache.set(cache_key, schemas, 60 * 15)
        return JsonResponse(schemas, safe=False)

    except Exception:
        return JsonResponse([], safe=False)


# ─────────────────────────────────────────────
# PROGRAMMATIC SEO PAGE METADATA
# ─────────────────────────────────────────────
@require_GET
def programmatic_metadata_view(request):
    """
    Returns metadata for programmatic SEO landing pages.
    Includes indexability status so frontend can apply noindex.
    Query: ?type=jobs&role=react-developer&city=lahore
    """
    page_type = request.GET.get("type", "opportunities")
    filters = {
        "role": request.GET.get("role", ""),
        "city": request.GET.get("city", ""),
        "category": request.GET.get("category", ""),
        "stage": request.GET.get("stage", ""),
    }
    cache_key = f"seo_prog_{page_type}_{json.dumps(filters, sort_keys=True)}"
    cached = cache.get(cache_key)
    if cached:
        return JsonResponse(cached)

    data = get_programmatic_metadata(page_type, filters)
    cache.set(cache_key, data, 60 * 30)
    return JsonResponse(data)
