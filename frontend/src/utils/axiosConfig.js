import axios from 'axios';
import Cookies from 'js-cookie';
import { API_BASE_URL } from './api';

// ── Axios Client ─────────────────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,   // Send cookies (session, CSRF) on every request
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Endpoints that do NOT require an auth token ───────────────────────────────
const PUBLIC_ENDPOINTS = new Set([
  '/signup',
  '/check-username',
  '/check-email',
  '/auth/login',
  '/auth/refresh',
  '/auth/forget-password',
  '/auth/send-verification-code',
  '/auth/verify',
  '/api/marketplace',
  '/api/collaborations',
  '/api/positions',
  '/api/stats',
  '/api/search',
  '/',
]);

const isPublicEndpoint = (url = '') =>
  [...PUBLIC_ENDPOINTS].some((ep) => url.includes(ep)) || url === '/' || url === '';

// ── Request Interceptor ───────────────────────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    config.headers = config.headers || {};

    // Attach Bearer token if present (primary auth method)
    const authToken = localStorage.getItem('auth_token');
    if (authToken) {
      config.headers['Authorization'] = `Bearer ${authToken}`;
    }

    // Always include CSRF token for state-changing requests
    const csrfToken = Cookies.get('csrftoken') || Cookies.get('csrf');
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor ──────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Session expired — clear local state and redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      Cookies.remove('sessionid');

      if (
        !window.location.pathname.includes('/login') &&
        !window.location.pathname.includes('/signup')
      ) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;