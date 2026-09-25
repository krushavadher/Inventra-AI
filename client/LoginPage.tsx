import React, { useState } from 'react';
import { apiFetch, setAuthToken, setStoredUser } from './apiClient';

interface LoginPageProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('admin@inventra.ai');
  const [password, setPassword] = useState('AdminPassword#2026');
  const [companyName, setCompanyName] = useState('Enterprise Logistics Inc');
  const [firstName, setFirstName] = useState('Senior');
  const [lastName, setLastName] = useState('Architect');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegistering) {
        const res = await apiFetch('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            companyName,
            firstName,
            lastName,
            email,
            password
          })
        });
        const user = res.data.user;
        const token = res.data.tokens.accessToken;
        setAuthToken(token);
        setStoredUser(user);
        onLoginSuccess(user);
      } else {
        const res = await apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        const user = res.data.user;
        const token = res.data.tokens.accessToken;
        setAuthToken(token);
        setStoredUser(user);
        onLoginSuccess(user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    // Quick demo login bypassing form typing
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@inventra.ai', password: 'AdminPassword#2026' })
      });
      const user = res.data.user;
      const token = res.data.tokens.accessToken;
      setAuthToken(token);
      setStoredUser(user);
      onLoginSuccess(user);
    } catch (err: any) {
      // If user doesn't exist yet, auto register demo user
      try {
        const regRes = await apiFetch('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            companyName: 'Inventra Global',
            firstName: 'Supply Chain',
            lastName: 'VP',
            email: 'admin@inventra.ai',
            password: 'AdminPassword#2026'
          })
        });
        const user = regRes.data.user;
        const token = regRes.data.tokens.accessToken;
        setAuthToken(token);
        setStoredUser(user);
        onLoginSuccess(user);
      } catch (regErr: any) {
        setError(regErr.message || 'Demo login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#09090B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif", padding: '20px', position: 'relative', overflow: 'hidden' }}>
      {/* Background Ambient Glow */}
      <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%, -50%)', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, rgba(9, 9, 11, 0) 70%)', pointerEvents: 'none' }} />

      <div className="glass-card" style={{ padding: '40px', width: '100%', maxWidth: '440px', backgroundColor: '#111115', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 24px 48px rgba(0,0,0,0.6)', position: 'relative', zIndex: 1 }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '22px', color: '#FFF', margin: '0 auto 14px auto', boxShadow: '0 8px 20px rgba(99, 102, 241, 0.35)' }}>S</div>
          <h1 className="page-title" style={{ fontSize: '24px' }}>Inventra AI</h1>
          <p className="subtext-muted" style={{ marginTop: '6px' }}>Enterprise Supply Chain & Inventory Intelligence</p>
        </div>

        {error && (
          <div className="badge badge-danger" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px', justifyContent: 'flex-start' }}>
            ⚠ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {isRegistering && (
            <>
              <div>
                <label className="kpi-label" style={{ display: 'block', marginBottom: '6px' }}>Company Name</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="input-dark"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="kpi-label" style={{ display: 'block', marginBottom: '6px' }}>First Name</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="input-dark"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label className="kpi-label" style={{ display: 'block', marginBottom: '6px' }}>Last Name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="input-dark"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="kpi-label" style={{ display: 'block', marginBottom: '6px' }}>Work Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-dark"
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label className="kpi-label" style={{ display: 'block', marginBottom: '6px' }}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-dark"
              style={{ width: '100%' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ padding: '12px', fontSize: '14px', marginTop: '6px', width: '100%' }}
          >
            {loading ? 'Authenticating...' : isRegistering ? 'Create Workspace' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <button
            onClick={handleDemoLogin}
            disabled={loading}
            className="btn-secondary"
            style={{ width: '100%', padding: '10px', color: '#10B981', borderColor: 'rgba(16, 185, 129, 0.3)' }}
          >
            ⚡ One-Click Demo Admin Sign In
          </button>

          <div style={{ textAlign: 'center', fontSize: '13px', color: '#A1A1AA' }}>
            {isRegistering ? 'Already have an account?' : "Don't have an enterprise workspace?"}{' '}
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              style={{ backgroundColor: 'transparent', border: 'none', color: '#818CF8', fontWeight: 600, cursor: 'pointer' }}
            >
              {isRegistering ? 'Sign In' : 'Register Here'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
