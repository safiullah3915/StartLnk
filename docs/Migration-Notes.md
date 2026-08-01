# StartLnk — Non-Destructive Migration Notes

## Overview
This document records the additive migration rules and transition plan for the StartLnk production deployment framework.

## Strict Rules
1. **No Destructive Deletions**: No pre-existing application, configuration, or environment file is deleted during framework implementation.
2. **Side-by-Side Coexistence**: Legacy configuration files (`nginx/startlnk.conf`, `backend/.env.example`, `backend/.env.cookie`) are retained until the new release-based deployment framework is fully validated in production.
3. **Additive Deployment Directory**: All new framework assets reside inside `deployment/` and `docs/`, leaving core Django and React source directories clean and operational.
4. **Git Safety**: `client_secret.json` and `deployment/config` are excluded via `.gitignore` to prevent secret leaks while keeping historical local structures functional.

## Transition Matrix

| Existing File / Asset | Legacy Function | Framework Equivalent | Status |
|-----------------------|-----------------|----------------------|--------|
| `backend/requirements.txt` | Unpinned package list | Pinned exact production versions | **Updated** (Preserved all existing deps) |
| `nginx/startlnk.conf` | Hardcoded server config | `deployment/templates/nginx.conf.template` | **Retained** alongside new template |
| `backend/.env.example` | Partial backend env example | Auto-generated via `deployment/config` | **Retained** alongside new config system |
| `frontend/.env.production` | Manual frontend build env | Auto-generated via `deployment/config` | **Retained** for manual builds |
| `frontend/.env.example` | None | `frontend/.env.example` | **Created** |
| `client_secret.json` | OAuth secret | Master config variable `GOOGLE_CLIENT_ID` + secret | **Gitignored** |

## Validation & Deprecation Criteria
- Legacy configuration files will only be proposed for archival/removal after:
  1. Full execution of Phase 4 (Core Deployment Scripts) on a target server.
  2. Successful deployment, SSL setup, and verification via `verify.sh`.
  3. Explicit approval from the user/operator.
