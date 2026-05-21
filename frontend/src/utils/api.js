// src/utils/api.js
// Production-safe API base URL resolver.
//
// In development (.env.development):  VITE_API_BASE_URL=http://127.0.0.1:8000
//   → Vite dev server proxy forwards /api/ and /auth/ to Django directly
//
// In production (.env.production):    VITE_API_BASE_URL=  (empty)
//   → All API calls use relative URLs (e.g. /api/users/)
//   → Nginx receives the request and proxies to Gunicorn via Unix socket
//   → Works on both HTTP and HTTPS without any code changes

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export const getApiBaseUrl = () => API_BASE_URL;
