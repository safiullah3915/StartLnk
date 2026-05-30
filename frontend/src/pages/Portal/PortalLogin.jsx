import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../utils/axiosConfig';
import { useAuth } from '../../contexts/AuthContext';
import './Portal.css';

export default function PortalLogin() {
  const navigate = useNavigate();
  const { setAuthData } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const data = response.data;

      if (!data.user) {
        setError('Invalid credentials. Please try again.');
        return;
      }

      const user = data.user;

      // Only allow staff / superusers into the portal
      if (!user.is_staff && !user.is_superuser) {
        setError('Access denied. You need staff privileges to access the admin portal.');
        return;
      }

      // Store auth token and set user in context
      if (data.auth_token) {
        localStorage.setItem('auth_token', data.auth_token);
      }

      setAuthData({ ...user, onboarding_completed: user.onboarding_completed }, data.auth_token);
      navigate('/portal', { replace: true });

    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Login failed. Check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-login-root">
      <div className="portal-login-card">
        <div className="portal-login-brand">
          <div className="portal-login-brand-icon">⚡</div>
          <div>
            <div className="portal-login-brand-name">StartLnk</div>
            <div className="portal-login-brand-sub">Admin Portal</div>
          </div>
        </div>

        <h1 className="portal-login-title">Sign In</h1>
        <p className="portal-login-sub">Staff &amp; superuser access only</p>

        <form className="portal-login-form" onSubmit={handleSubmit}>
          <div className="portal-login-field">
            <label className="portal-login-label" htmlFor="portal-email">Email</label>
            <input
              id="portal-email"
              type="email"
              className="portal-login-input"
              placeholder="admin@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="portal-login-field">
            <label className="portal-login-label" htmlFor="portal-password">Password</label>
            <input
              id="portal-password"
              type="password"
              className="portal-login-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="portal-login-error">{error}</div>
          )}

          <button
            type="submit"
            className="portal-login-btn"
            disabled={loading}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                <span className="portal-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                Signing in…
              </span>
            ) : 'Sign In to Portal'}
          </button>
        </form>

        <p className="portal-login-note">
          This portal is restricted to authorised staff.<br />
          Regular users should go to <a href="/login">startlnk.xyz/login</a>.
        </p>
      </div>
    </div>
  );
}
