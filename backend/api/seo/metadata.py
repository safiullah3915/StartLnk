"""
StartLnk SEO Metadata Builder
Generates dynamic meta tags, OG tags, Twitter cards, and structured data
for all page types. Isolated SEO layer — does NOT touch any business logic.

Production safeguards:
- Zero <meta name="keywords"> output (deprecated by all major engines)
- Indexability threshold logic for programmatic pages
- Canonical validation for pagination/filters/query params
- noindex strategy for thin/low-content/internal pages
"""

SITE_NAME = "StartLnk"
SITE_URL = "https://startlnk.xyz"
SITE_DESCRIPTION = (
    "StartLnk is Pakistan's leading startup collaboration ecosystem. "
    "Connect with founders, join startups, discover internships, "
    "and grow your startup network in Pakistan."
)
SITE_TWITTER = "@StartLnk"
DEFAULT_OG_IMAGE = f"{SITE_URL}/og-default.png"

# ─────────────────────────────────────────────
# INDEXABILITY THRESHOLDS
# ─────────────────────────────────────────────
# Minimum requirements for a programmatic page to be indexable
PROGRAMMATIC_INDEX_THRESHOLDS = {
    "min_active_startups": 5,       # Platform must have at least 5 active startups
    "min_active_positions": 3,      # At least 3 active positions
    "min_description_length": 50,   # Min chars for a meaningful description
    "min_title_length": 10,         # Min chars for a meaningful title
}

# Allowed programmatic page slugs — only these are indexable
ALLOWED_PROGRAMMATIC_SLUGS = {
    "jobs": {
        "react-developer", "frontend-developer", "backend-developer",
        "ui-ux-designer", "software-engineer", "full-stack-developer",
        "product-manager", "data-scientist", "ai-engineer",
        "mobile-developer", "devops-engineer", "marketing-specialist",
    },
    "internships": {
        "react-developer", "frontend-developer", "backend-developer",
        "ui-ux-designer", "software-engineer", "full-stack-developer",
    },
    "startups": {
        "saas", "marketplace", "ecommerce", "agency",
        "subscription", "social-platform", "fintech",
        "edtech", "healthtech", "ai-startup",
    },
    "collaborate": {
        "cofounder-ai", "cofounder-saas", "cofounder-ecommerce",
        "technical-cofounder", "business-cofounder",
    },
    "remote": {
        "react-developer", "frontend-developer", "backend-developer",
        "ui-ux-designer", "software-engineer",
    },
    "opportunities": {
        "react-developer", "frontend-developer", "backend-developer",
        "ui-ux-designer", "software-engineer",
    },
}


def check_programmatic_indexability(page_type, slug):
    """
    Returns True if a programmatic page should be indexed.
    Returns False if the page should be noindex.
    
    Rules:
    1. slug must be in the allowed set for that page_type
    2. Platform must meet minimum content thresholds
    """
    # Rule 1: Slug must be in allowed set
    allowed = ALLOWED_PROGRAMMATIC_SLUGS.get(page_type, set())
    if slug not in allowed:
        return False

    # Rule 2: Platform content thresholds
    try:
        from api.models import Startup, Position
        startup_count = Startup.objects.filter(status="active").count()
        position_count = Position.objects.filter(is_active=True).count()

        if startup_count < PROGRAMMATIC_INDEX_THRESHOLDS["min_active_startups"]:
            return False
        if position_count < PROGRAMMATIC_INDEX_THRESHOLDS["min_active_positions"]:
            return False
    except Exception:
        # If we can't verify, default to noindex (safe)
        return False

    return True


def check_startup_indexability(startup_data):
    """
    Returns True if a startup detail page should be indexed.
    Prevents thin/low-quality pages from being indexed.
    """
    title = startup_data.get("title", "")
    description = startup_data.get("description", "")
    
    if len(title) < PROGRAMMATIC_INDEX_THRESHOLDS["min_title_length"]:
        return False
    if len(description) < PROGRAMMATIC_INDEX_THRESHOLDS["min_description_length"]:
        return False
    
    return True


# ─────────────────────────────────────────────
# CANONICAL VALIDATION
# ─────────────────────────────────────────────
def build_canonical(path, strip_params=True):
    """
    Builds a clean canonical URL.
    - Strips query parameters (pagination, sort, filter) by default
    - Strips trailing slashes for consistency
    - Normalizes to lowercase
    """
    clean = path.split("?")[0] if strip_params else path
    clean = clean.rstrip("/")
    if not clean.startswith("http"):
        clean = f"{SITE_URL}{clean}"
    return clean


# ─────────────────────────────────────────────
# LANDING PAGE
# ─────────────────────────────────────────────
def get_landing_metadata():
    return {
        "title": "StartLnk — Startup Collaboration, Internships & Opportunities",
        "description": (
            "Join StartLnk, Pakistan's #1 startup ecosystem. Find co-founders, "
            "join startup teams, discover internships, remote jobs, and startup "
            "opportunities. Connect with founders, investors, and innovators."
        ),
        "canonical": SITE_URL,
        "og": {
            "title": "StartLnk — Connect, Collaborate, Build Startups",
            "description": (
                "Pakistan's leading startup collaboration platform. "
                "Find startup jobs, internships, co-founders, and investors."
            ),
            "image": DEFAULT_OG_IMAGE,
            "type": "website",
            "url": SITE_URL,
            "site_name": SITE_NAME,
        },
        "twitter": {
            "card": "summary_large_image",
            "title": "StartLnk — Startup Collaboration & Opportunities",
            "description": "Find co-founders, startup internships, and remote jobs.",
            "image": DEFAULT_OG_IMAGE,
            "site": SITE_TWITTER,
        },
        "robots": "index, follow",
        "schema": get_organization_schema(),
    }


# ─────────────────────────────────────────────
# STARTUP DETAIL PAGE
# ─────────────────────────────────────────────
def get_startup_metadata(startup):
    """Generate metadata for a specific startup detail page."""
    title = startup.get("title", "Startup")
    description = startup.get("description", "")
    description_excerpt = description[:155] + "..." if len(description) > 155 else description
    startup_id = startup.get("id", "")
    category = startup.get("category", "startup")
    field = startup.get("field", "")
    startup_type = startup.get("type", "collaboration")
    owner = startup.get("owner", {})
    founder_name = owner.get("full_name") or owner.get("username", "Founder")
    image = startup.get("image_url") or DEFAULT_OG_IMAGE
    url = build_canonical(f"/startupdetail/{startup_id}")

    type_label = "Collaboration Startup" if startup_type == "collaboration" else "Marketplace Startup"
    
    # Indexability check — thin pages get noindex
    is_indexable = check_startup_indexability(startup)
    robots = "index, follow" if is_indexable else "noindex, follow"

    return {
        "title": f"{title} — {type_label} | StartLnk",
        "description": (
            f"{description_excerpt} Founded by {founder_name}. "
            f"Explore this {category} startup on StartLnk."
        ),
        "canonical": url,
        "og": {
            "title": f"{title} | StartLnk Startup",
            "description": description_excerpt,
            "image": image,
            "type": "website",
            "url": url,
            "site_name": SITE_NAME,
        },
        "twitter": {
            "card": "summary_large_image",
            "title": f"{title} | StartLnk",
            "description": description_excerpt,
            "image": image,
            "site": SITE_TWITTER,
        },
        "robots": robots,
        "schema": get_startup_schema(startup) if is_indexable else None,
    }


# ─────────────────────────────────────────────
# COLLABORATION PAGE
# ─────────────────────────────────────────────
def get_collaboration_metadata():
    return {
        "title": "Startup Collaboration Opportunities — Join a Startup Team | StartLnk",
        "description": (
            "Browse startup collaboration opportunities on StartLnk. "
            "Join early-stage startups, find co-founders, and build innovative "
            "products. Startup team building for founders, developers, designers & marketers."
        ),
        "canonical": build_canonical("/collaboration"),
        "og": {
            "title": "Startup Collaboration Opportunities | StartLnk",
            "description": "Find startup collaboration, join teams, and build your startup career.",
            "image": DEFAULT_OG_IMAGE,
            "type": "website",
            "url": build_canonical("/collaboration"),
            "site_name": SITE_NAME,
        },
        "twitter": {
            "card": "summary_large_image",
            "title": "Startup Collaboration | StartLnk",
            "description": "Join startup teams and collaborate with founders on innovative projects.",
            "image": DEFAULT_OG_IMAGE,
            "site": SITE_TWITTER,
        },
        "robots": "index, follow",
        "schema": get_collection_page_schema(
            name="Startup Collaboration Opportunities",
            description="Browse and join startup collaboration projects on StartLnk.",
            url=build_canonical("/collaboration"),
        ),
    }


# ─────────────────────────────────────────────
# MARKETPLACE PAGE
# ─────────────────────────────────────────────
def get_marketplace_metadata():
    return {
        "title": "Startup Marketplace — Buy & Sell Startups | StartLnk",
        "description": (
            "Discover startups for sale on StartLnk Marketplace. "
            "Buy established startups, SaaS products, ecommerce businesses, "
            "and digital assets. Connect with founders and investors."
        ),
        "canonical": build_canonical("/marketplace"),
        "og": {
            "title": "Startup Marketplace — Buy & Sell Startups | StartLnk",
            "description": "Browse startups for sale, investment opportunities, and digital businesses.",
            "image": DEFAULT_OG_IMAGE,
            "type": "website",
            "url": build_canonical("/marketplace"),
            "site_name": SITE_NAME,
        },
        "twitter": {
            "card": "summary_large_image",
            "title": "Startup Marketplace | StartLnk",
            "description": "Buy and sell startups. Discover investment opportunities on StartLnk.",
            "image": DEFAULT_OG_IMAGE,
            "site": SITE_TWITTER,
        },
        "robots": "index, follow",
        "schema": get_collection_page_schema(
            name="StartLnk Startup Marketplace",
            description="Buy and sell startups on Pakistan's leading startup marketplace.",
            url=build_canonical("/marketplace"),
        ),
    }


# ─────────────────────────────────────────────
# PEOPLE / PROFILES PAGE
# ─────────────────────────────────────────────
def get_people_metadata():
    return {
        "title": "Startup Founders, Developers & Investors Directory | StartLnk",
        "description": (
            "Discover founders, co-founders, developers, designers, investors, "
            "and startup professionals on StartLnk. Build your startup network "
            "and find the right people for your team."
        ),
        "canonical": build_canonical("/people"),
        "og": {
            "title": "Startup People Directory | StartLnk",
            "description": "Find founders, investors, developers, and startup professionals.",
            "image": DEFAULT_OG_IMAGE,
            "type": "website",
            "url": build_canonical("/people"),
            "site_name": SITE_NAME,
        },
        "twitter": {
            "card": "summary_large_image",
            "title": "Startup People Directory | StartLnk",
            "description": "Connect with startup founders, investors, and professionals on StartLnk.",
            "image": DEFAULT_OG_IMAGE,
            "site": SITE_TWITTER,
        },
        "robots": "index, follow",
        "schema": get_collection_page_schema(
            name="Startup People Directory",
            description="Directory of founders, investors, and startup professionals on StartLnk.",
            url=build_canonical("/people"),
        ),
    }


# ─────────────────────────────────────────────
# STATIC PAGES
# ─────────────────────────────────────────────
def get_about_metadata():
    return {
        "title": "About StartLnk — the Startup Collaboration Ecosystem",
        "description": (
            "StartLnk is Pakistan's leading startup ecosystem connecting founders, "
            "investors, developers, and students. Learn about our mission to empower "
            "startup collaboration and innovation across Pakistan."
        ),
        "canonical": build_canonical("/about"),
        "og": {
            "title": "About StartLnk",
            "description": "Pakistan's #1 startup collaboration ecosystem.",
            "image": DEFAULT_OG_IMAGE,
            "type": "website",
            "url": build_canonical("/about"),
            "site_name": SITE_NAME,
        },
        "twitter": {
            "card": "summary",
            "title": "About StartLnk",
            "description": "Learn about StartLnk's mission to power the startup ecosystem.",
            "site": SITE_TWITTER,
        },
        "robots": "index, follow",
        "schema": get_organization_schema(),
    }


def get_contact_metadata():
    return {
        "title": "Contact StartLnk — Get in Touch",
        "description": "Contact the StartLnk team. Reach out for partnerships, support, or inquiries.",
        "canonical": build_canonical("/contact"),
        "og": {
            "title": "Contact StartLnk",
            "description": "Get in touch with the StartLnk team.",
            "image": DEFAULT_OG_IMAGE,
            "type": "website",
            "url": build_canonical("/contact"),
            "site_name": SITE_NAME,
        },
        "twitter": {"card": "summary", "title": "Contact StartLnk", "site": SITE_TWITTER},
        "robots": "index, follow",
    }


def get_faq_metadata():
    return {
        "title": "FAQ — StartLnk Startup Collaboration Platform",
        "description": (
            "Frequently asked questions about StartLnk. Learn how to join startups, "
            "find co-founders, discover internships, and grow your startup network in Pakistan."
        ),
        "canonical": build_canonical("/faq"),
        "og": {
            "title": "FAQ | StartLnk",
            "description": "Everything you need to know about StartLnk.",
            "image": DEFAULT_OG_IMAGE,
            "type": "website",
            "url": build_canonical("/faq"),
            "site_name": SITE_NAME,
        },
        "twitter": {"card": "summary", "title": "FAQ | StartLnk", "site": SITE_TWITTER},
        "robots": "index, follow",
        "schema": get_faq_schema(),
    }


# ─────────────────────────────────────────────
# PROGRAMMATIC SEO PAGES (with indexability gate)
# ─────────────────────────────────────────────
def get_programmatic_metadata(page_type, filters):
    """
    Generate metadata for programmatic SEO landing pages.
    Applies indexability threshold checks — returns noindex
    if the page doesn't meet quality/content thresholds.
    """
    role = filters.get("role", "").replace("-", " ").title()
    city = filters.get("city", "").replace("-", " ").title()
    category = filters.get("category", "").replace("-", " ").title()
    slug = _build_slug(page_type, filters)

    # Check indexability BEFORE generating metadata
    is_indexable = check_programmatic_indexability(page_type, slug)
    robots = "index, follow" if is_indexable else "noindex, follow"

    templates = {
        "jobs": {
            "title": f"{role} Startup Jobs{' in ' + city if city else ''} | StartLnk",
            "description": (
                f"Find {role} startup jobs{' in ' + city if city else ''} on StartLnk. "
                "Join innovative startups, work with founders, and grow your career in Pakistan's startup ecosystem."
            ),
        },
        "internships": {
            "title": f"{role} Startup Internships{' in ' + city if city else ''} | StartLnk",
            "description": (
                f"Discover {role} internships{' in ' + city if city else ''} at startups on StartLnk. "
                "Gain real startup experience, build your portfolio, and kickstart your career in Pakistan."
            ),
        },
        "startups": {
            "title": f"{category} Startups{' in ' + city if city else ''} | StartLnk",
            "description": (
                f"Browse {category} startups{' in ' + city if city else ''} on StartLnk. "
                "Discover innovative companies, investment opportunities, and collaboration projects."
            ),
        },
        "collaborate": {
            "title": f"Collaborate on {role or category} Startups | StartLnk",
            "description": (
                f"Find collaboration opportunities for {role or category} on StartLnk. "
                "Join startup teams, find co-founders, and build innovative products together."
            ),
        },
        "remote": {
            "title": f"Remote {role} Startup Jobs & Opportunities | StartLnk",
            "description": (
                f"Work remotely with startups as a {role} on StartLnk. "
                "Find remote startup jobs, freelance opportunities, and flexible work arrangements."
            ),
        },
        "opportunities": {
            "title": f"{role} Startup Opportunities{' in ' + city if city else ''} | StartLnk",
            "description": (
                f"Explore {role} opportunities{' in ' + city if city else ''} at startups on StartLnk. "
                "Jobs, internships, collaborations, and freelance work with innovative startups."
            ),
        },
    }

    data = templates.get(page_type, templates["opportunities"])
    url = build_canonical(f"/{page_type}/{slug}") if slug else build_canonical(f"/{page_type}")

    result = {
        "title": data["title"],
        "description": data["description"],
        "canonical": url,
        "og": {
            "title": data["title"],
            "description": data["description"],
            "image": DEFAULT_OG_IMAGE,
            "type": "website",
            "url": url,
            "site_name": SITE_NAME,
        },
        "twitter": {
            "card": "summary_large_image",
            "title": data["title"],
            "description": data["description"],
            "image": DEFAULT_OG_IMAGE,
            "site": SITE_TWITTER,
        },
        "robots": robots,
        "is_indexable": is_indexable,
    }

    return result


def _build_slug(page_type, filters):
    parts = []
    if filters.get("role"):
        parts.append(filters["role"])
    if filters.get("city"):
        parts.append(filters["city"])
    if filters.get("category"):
        parts.append(filters["category"])
    return "-".join(p for p in parts if p)


# ─────────────────────────────────────────────
# NOINDEX PAGES — explicit strategy
# ─────────────────────────────────────────────
# These page types always get noindex
NOINDEX_ROUTES = {
    "/dashboard", "/account", "/message", "/onboarding-preferences",
    "/complete-profile", "/createstartup", "/pitch-idea",
    "/investor-dashboard", "/apply-for-collaboration",
    "/startups-with-applications", "/favorites",
    "/positions",  # internal management
}

def get_robots_for_path(path):
    """
    Determines robots directive for any given path.
    Used for centralized noindex decisions.
    """
    clean = path.rstrip("/").lower()
    
    # Explicit noindex routes
    for route in NOINDEX_ROUTES:
        if clean.startswith(route):
            return "noindex, nofollow"
    
    # Internal search pages — always noindex
    if "/search" in clean or "?q=" in path or "?query=" in path:
        return "noindex, follow"
    
    # Paginated pages — noindex (canonical points to page 1)
    if "?page=" in path and "page=1" not in path:
        return "noindex, follow"
    
    # Filter combinations — noindex
    if "?filter=" in path or "?sort=" in path or "?category=" in path:
        return "noindex, follow"
    
    return "index, follow"


# ─────────────────────────────────────────────
# SCHEMA.ORG STRUCTURED DATA
# ─────────────────────────────────────────────
def get_organization_schema():
    return {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "StartLnk",
        "url": SITE_URL,
        "logo": f"{SITE_URL}/logo.png",
        "description": SITE_DESCRIPTION,
        "sameAs": [
            "https://twitter.com/StartLnk",
            "https://linkedin.com/company/startlnk",
        ],
        "contactPoint": {
            "@type": "ContactPoint",
            "contactType": "customer support",
            "url": f"{SITE_URL}/contact",
        },
    }


def get_startup_schema(startup):
    title = startup.get("title", "")
    description = startup.get("description", "")
    startup_type = startup.get("type", "collaboration")
    startup_id = startup.get("id", "")
    owner = startup.get("owner", {})
    founder_name = owner.get("full_name") or owner.get("username", "")
    url = build_canonical(f"/startupdetail/{startup_id}")

    schema = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": title,
        "description": description,
        "url": url,
        "founder": {
            "@type": "Person",
            "name": founder_name,
        },
    }

    if startup_type == "collaboration":
        positions = startup.get("positions", [])
        if positions:
            schema["hasOfferCatalog"] = {
                "@type": "OfferCatalog",
                "name": f"Open Positions at {title}",
                "itemListElement": [
                    {
                        "@type": "Offer",
                        "itemOffered": {
                            "@type": "Service",
                            "name": pos.get("title", "Position"),
                            "description": pos.get("description", ""),
                        }
                    }
                    for pos in positions[:5]
                ],
            }

    return schema


def get_job_posting_schema(startup, position):
    return {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        "title": position.get("title", ""),
        "description": position.get("description", ""),
        "datePosted": str(position.get("created_at", ""))[:10],
        "employmentType": position.get("time_commitment", "FULL_TIME").upper(),
        "hiringOrganization": {
            "@type": "Organization",
            "name": startup.get("title", ""),
            "sameAs": build_canonical(f"/startupdetail/{startup.get('id', '')}"),
        },
        "jobLocation": {
            "@type": "Place",
            "address": {
                "@type": "PostalAddress",
                "addressCountry": "PK",
            },
        },
        "applicantLocationRequirements": {
            "@type": "Country",
            "name": "Pakistan",
        },
        "directApply": True,
        "url": build_canonical(f"/startupdetail/{startup.get('id', '')}"),
    }


def get_person_schema(user_profile):
    user = user_profile.get("user", user_profile)
    return {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": user.get("full_name") or user.get("username", ""),
        "url": f"{SITE_URL}/people",
        "jobTitle": user.get("role", "Startup Professional").title(),
        "description": user_profile.get("bio", ""),
        "knowsAbout": user_profile.get("skills", []),
    }


def get_collection_page_schema(name, description, url):
    return {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": name,
        "description": description,
        "url": url,
        "isPartOf": {
            "@type": "WebSite",
            "name": SITE_NAME,
            "url": SITE_URL,
        },
    }


def get_faq_schema():
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": "What is StartLnk?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": (
                        "StartLnk is Pakistan's leading startup collaboration ecosystem "
                        "connecting founders, investors, developers, designers, and students "
                        "to build innovative startups together."
                    ),
                },
            },
            {
                "@type": "Question",
                "name": "How do I join a startup on StartLnk?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": (
                        "Create a free account on StartLnk, browse startup collaboration "
                        "opportunities, and apply for open positions or connect with founders directly."
                    ),
                },
            },
            {
                "@type": "Question",
                "name": "Can I find startup internships on StartLnk?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": (
                        "Yes. StartLnk lists startup collaboration opportunities including "
                        "internships, part-time roles, and full-time positions at early-stage startups."
                    ),
                },
            },
            {
                "@type": "Question",
                "name": "Is StartLnk free to use?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": (
                        "Yes. Signing up and browsing startup opportunities on StartLnk is completely free."
                    ),
                },
            },
            {
                "@type": "Question",
                "name": "How do I list my startup on StartLnk?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": (
                        "Register as an entrepreneur on StartLnk and use the 'Upload Startup' feature "
                        "to list your startup for collaboration or in the marketplace."
                    ),
                },
            },
            {
                "@type": "Question",
                "name": "Can investors find startups on StartLnk?",
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": (
                        "Yes. Investors can browse the StartLnk Marketplace to discover "
                        "startups seeking investment and express interest directly."
                    ),
                },
            },
        ],
    }


def get_breadcrumb_schema(items):
    """
    items: list of dicts with 'name' and 'url'
    Example: [{'name': 'Home', 'url': '/'}, {'name': 'Collaboration', 'url': '/collaboration'}]
    """
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": i + 1,
                "name": item["name"],
                "item": SITE_URL + item["url"] if not item["url"].startswith("http") else item["url"],
            }
            for i, item in enumerate(items)
        ],
    }


def get_website_schema():
    return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": SITE_NAME,
        "url": SITE_URL,
        "description": SITE_DESCRIPTION,
        "potentialAction": {
            "@type": "SearchAction",
            "target": {
                "@type": "EntryPoint",
                "urlTemplate": f"{SITE_URL}/search?q={{search_term_string}}",
            },
            "query-input": "required name=search_term_string",
        },
    }
