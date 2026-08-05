import React, { useState } from 'react';
import { apiFetch, setAuthToken, setStoredUser } from './apiClient';

interface LoginPageProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('admin@stockmind.ai');
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
        body: JSON.stringify({ email: 'admin@stockmind.ai', password: 'AdminPassword#2026' })
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
            companyName: 'StockMind Global',
            firstName: 'Supply Chain',
            lastName: 'VP',
            email: 'admin@stockmind.ai',
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
    <div style={{ minHeight: '100vh', backgroundColor: '#09090B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', padding: '20px' }}>
      <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '16px', padding: '36px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '24px', color: '#FFF', margin: '0 auto 12px auto' }}>S</div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#FFF', margin: 0 }}>StockMind AI</h1>
          <p style={{ fontSize: '13px', color: '#A1A1AA', marginTop: '6px' }}>Enterprise Inventory & Supply Chain Intelligence</p>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)', border: '1px solid #F43F5E', color: '#F43F5E', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isRegistering && (
            <>
              <div>
                <label style={{ fontSize: '12px', color: '#A1A1AA', display: 'block', marginBottom: '6px' }}>Company Name</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '8px', fontSize: '14px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#A1A1AA', display: 'block', marginBottom: '6px' }}>First Name</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '8px', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#A1A1AA', display: 'block', marginBottom: '6px' }}>Last Name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '8px', fontSize: '14px' }}
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label style={{ fontSize: '12px', color: '#A1A1AA', display: 'block', marginBottom: '6px' }}>Work Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '8px', fontSize: '14px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#A1A1AA', display: 'block', marginBottom: '6px' }}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '8px', fontSize: '14px' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ backgroundColor: '#6366F1', color: '#FFF', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '14px', marginTop: '8px' }}
          >
            {loading ? 'Authenticating...' : isRegistering ? 'Create Workspace' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '20px', borderTop: '1px solid #27272A', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={handleDemoLogin}
            disabled={loading}
            style={{ backgroundColor: '#27272A', color: '#10B981', padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
          >
            ⚡ One-Click Demo Admin Sign In
          </button>

          <div style={{ textAlign: 'center', fontSize: '13px', color: '#A1A1AA' }}>
            {isRegistering ? 'Already have an account?' : "Don't have an enterprise workspace?"}{' '}
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              style={{ backgroundColor: 'transparent', border: 'none', color: '#8B5CF6', fontWeight: 600, cursor: 'pointer' }}
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
