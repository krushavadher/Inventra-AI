import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { BlurFade } from '@/components/ui/blur-fade';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/axios';

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Full name is required');
      return;
    }

    if (!email.trim()) {
      setError('Email address is required');
      return;
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const payload: Record<string, any> = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      };

      if (company.trim()) {
        payload.company = company.trim();
      }

      const res = await api.post('/api/auth/register', payload);
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
        'Registration failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatedBackground className="h-screen max-h-screen w-full overflow-hidden flex items-center justify-center p-3 sm:p-4">
      <BlurFade delay={0.08} duration={0.45} className="w-full max-w-[420px]">
        <GlassCard className="w-full max-w-[420px] p-5 sm:p-6 shadow-2xl relative">
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center mb-3 sm:mb-4">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-8 h-8 rounded-xl bg-[#D5F737] flex items-center justify-center font-bold text-sm text-black shadow-lg shadow-[#D5F737]/25">
                I
              </div>
              <span className="text-lg font-bold tracking-tight text-white">Inventra AI</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Create an account</h1>
            <p className="text-xs text-[#9A9A9A] mt-0.5">Start streamlining your inventory intelligence</p>
          </div>

          {/* Inline Error Alert */}
          {error && (
            <div className="mb-2.5 p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 flex items-start gap-2 text-xs text-red-400">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-red-400" />
              <span className="leading-tight">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-[#9A9A9A] uppercase tracking-wider mb-1">
                  Name
                </label>
                <input
                  id="signup-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-[#9A9A9A] text-xs sm:text-sm focus:outline-none focus:border-[#D5F737] transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#9A9A9A] uppercase tracking-wider mb-1">
                  Company <span className="text-[10px] lowercase text-[#9A9A9A]/70">(opt)</span>
                </label>
                <input
                  id="signup-company"
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Corp"
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-[#9A9A9A] text-xs sm:text-sm focus:outline-none focus:border-[#D5F737] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#9A9A9A] uppercase tracking-wider mb-1">
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                autoComplete="email"
                className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-[#9A9A9A] text-xs sm:text-sm focus:outline-none focus:border-[#D5F737] transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-[#9A9A9A] uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    required
                    className="w-full px-3 py-2 pr-8 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-[#9A9A9A] text-xs sm:text-sm focus:outline-none focus:border-[#D5F737] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9A9A9A] hover:text-white p-0.5"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#9A9A9A] uppercase tracking-wider mb-1">
                  Confirm
                </label>
                <div className="relative">
                  <input
                    id="signup-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat"
                    required
                    className="w-full px-3 py-2 pr-8 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-[#9A9A9A] text-xs sm:text-sm focus:outline-none focus:border-[#D5F737] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9A9A9A] hover:text-white p-0.5"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-1.5">
              <ShimmerButton
                type="submit"
                disabled={loading}
                background="#D5F737"
                shimmerColor="#ffffff"
                className="w-full text-black font-semibold text-xs sm:text-sm py-2 sm:py-2.5 rounded-xl cursor-pointer hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Creating account...
                  </span>
                ) : (
                  'Create account'
                )}
              </ShimmerButton>
            </div>
          </form>

          {/* Login Link */}
          <div className="mt-3.5 text-center text-xs text-[#9A9A9A]">
            Already have an account?{' '}
            <Link to="/login" className="text-[#D5F737] hover:underline font-medium transition-colors">
              Log in
            </Link>
          </div>
        </GlassCard>
      </BlurFade>
    </AnimatedBackground>
  );
};

export default SignupPage;
