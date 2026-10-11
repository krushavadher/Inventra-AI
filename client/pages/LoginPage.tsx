import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { BlurFade } from '@/components/ui/blur-fade';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/axios';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Email address is required');
      return;
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/api/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });

      const { token, user } = res.data;
      if (token && user) {
        login(token, user);
        navigate('/dashboard', { replace: true });
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Failed to log in. Please check your credentials.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatedBackground className="h-screen max-h-screen w-full overflow-hidden flex items-center justify-center p-4">
      <BlurFade delay={0.08} duration={0.45} className="w-full max-w-[420px]">
        <GlassCard className="w-full max-w-[420px] p-7 sm:p-8 shadow-2xl relative">
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-[#D5F737] flex items-center justify-center font-bold text-base text-black shadow-lg shadow-[#D5F737]/25">
                I
              </div>
              <span className="text-xl font-bold tracking-tight text-white">Inventra AI</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Welcome back</h1>
            <p className="text-sm text-[#9A9A9A] mt-1">Sign in to your account to continue</p>
          </div>

          {/* Inline Error Alert */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/25 flex items-start gap-2.5 text-xs text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
              <span className="leading-tight">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#9A9A9A] uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                autoComplete="email"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-[#9A9A9A] text-sm focus:outline-none focus:border-[#D5F737] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#9A9A9A] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-[#9A9A9A] text-sm focus:outline-none focus:border-[#D5F737] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A9A9A] hover:text-white transition-colors p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <ShimmerButton
                type="submit"
                disabled={loading}
                background="#D5F737"
                shimmerColor="#ffffff"
                className="w-full text-black font-semibold text-sm py-2.5 rounded-xl cursor-pointer hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Logging in...
                  </span>
                ) : (
                  'Login'
                )}
              </ShimmerButton>
            </div>
          </form>

          {/* Default Credentials Helper */}
          <div className="mt-4 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-[#9A9A9A] flex items-center justify-between">
            <span>Demo: <span className="text-white font-mono">admin@inventra.ai</span></span>
            <span>Pass: <span className="text-white font-mono">admin123</span></span>
          </div>

          {/* Sign Up Link */}
          <div className="mt-4 text-center text-xs text-[#9A9A9A]">
            Don't have an account?{' '}
            <Link to="/signup" className="text-[#D5F737] hover:underline font-medium transition-colors">
              Sign up
            </Link>
          </div>
        </GlassCard>
      </BlurFade>
    </AnimatedBackground>
  );
};

export default LoginPage;
