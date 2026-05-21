// src/utils/authDebug.js
// Auth debugging utilities — DEVELOPMENT ONLY.
// All functions are no-ops in production (Vite strips dead code via tree-shaking).

import Cookies from 'js-cookie';

const isDev = import.meta.env.DEV;

/**
 * Logs a summary of the current authentication state.
 * Only active in development mode — silent no-op in production builds.
 */
export const debugAuthStatus = () => {
  if (!isDev) return null;

  const authToken    = localStorage.getItem('auth_token');
  const sessionCookie = Cookies.get('sessionid');
  const csrfCookie   = Cookies.get('csrftoken') || Cookies.get('csrf');

  const hasValidToken = !!(authToken || sessionCookie);

  return {
    hasAuthToken: !!authToken,
    hasSessionCookie: !!sessionCookie,
    hasCSRFToken: !!csrfCookie,
    canAuthenticate: hasValidToken,
  };
};

/**
 * Sets test tokens in localStorage.
 * Only works in development mode.
 */
export const setTestTokens = (authToken, refreshToken) => {
  if (!isDev) return;
  if (authToken)    localStorage.setItem('auth_token', authToken);
  if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
};

/**
 * Clears all authentication tokens and cookies.
 * Only works in development mode.
 */
export const clearAllTokens = () => {
  if (!isDev) return;
  localStorage.removeItem('auth_token');
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('token');
  Cookies.remove('sessionid');
  Cookies.remove('token');
  Cookies.remove('refresh_token');
};