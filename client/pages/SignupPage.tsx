import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  User,
  Building,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { HeroGridLayer } from '@/components/ui/HeroGridLayer';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/axios';

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [focusedField, setFocusedField] = useState<
    'name' | 'company' | 'email' | 'password' | 'confirmPassword' | null
  >(null);

  // Trigger 300ms shake animation when error appears
  useEffect(() => {
    if (error && !prefersReducedMotion) {
      setShake(true);
      const timer = setTimeout(() => setShake(false), 320);
      return () => clearTimeout(timer);
    }
  }, [error, prefersReducedMotion]);

  // Password Strength Calculation (4 tiers: weak, fair, good, strong)
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: 'transparent' };
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;
    else if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 0.5;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;

    const finalScore = Math.min(4, Math.max(1, Math.floor(score)));
    if (finalScore === 1) return { score: 1, label: 'Weak', color: '#F0506E' };
    if (finalScore === 2) return { score: 2, label: 'Fair', color: '#F5A524' };
    if (finalScore === 3) return { score: 3, label: 'Good', color: '#D5F737' };
    return { score: 4, label: 'Strong', color: '#34D399' };
  }, [password]);

  const passwordsMatch =
    confirmPassword.length > 0 &&
    password.length > 0 &&
    confirmPassword === password;

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

  // Stagger animation container variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.06,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 14 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, ease: 'easeOut' },
    },
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden overflow-y-auto flex flex-col items-center justify-center p-4 sm:p-6 bg-[#181818] text-white font-['Outfit',sans-serif] selection:bg-[#D5F737] selection:text-black">
      {/* 1. SHARED BACKGROUND: Animated Grid + Spotlight + Blobs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <AnimatedBackground className="w-full h-full" />
        <HeroGridLayer />
      </div>

      {/* 2. GHOST "BACK TO HOME" LINK AT TOP-LEFT */}
      <Link
        to="/"
        className="fixed top-5 left-5 z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-[#D5F737]/40 text-xs text-[#9A9A9A] hover:text-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to home</span>
      </Link>

      {/* 3. CENTERED FORM CONTAINER */}
      <div className="relative z-10 w-full max-w-[480px] my-auto py-8 flex flex-col items-center">
        {/* Glow Behind the Glass Card */}
        <div className="absolute -inset-1.5 rounded-[30px] bg-[#D5F737]/15 blur-2xl pointer-events-none -z-10" />

        {/* Card with Entrance Animation & Shake */}
        <motion.div
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 16 }}
          animate={
            shake
              ? { x: [0, -8, 8, -6, 6, 0], y: 0, opacity: 1 }
              : { opacity: 1, y: 0 }
          }
          transition={{ duration: shake ? 0.3 : 0.5, ease: 'easeOut' }}
          className="relative w-full rounded-[24px] p-5 sm:p-10 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-[20px] saturate-[90%] overflow-hidden"
          style={{
            backgroundColor: 'rgba(40, 40, 40, 0.45)',
          }}
        >
          {/* Border Beam Effect: rotating conic-gradient along the 24px border */}
          <div
            className="absolute inset-0 rounded-[24px] pointer-events-none overflow-hidden p-[1px]"
            style={{
              mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              maskComposite: 'exclude',
              WebkitMaskComposite: 'xor',
            }}
          >
            <motion.div
              className="absolute aspect-square w-[250%] -left-[75%] -top-[75%]"
              style={{
                background:
                  'conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(213,247,55,0.2) 320deg, rgba(213,247,55,0.45) 360deg)',
              }}
              animate={prefersReducedMotion ? { rotate: 0 } : { rotate: 360 }}
              transition={{ repeat: Infinity, duration: 7, ease: 'linear' }}
            />
          </div>

          {/* Staggered Form Contents */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="relative z-10 w-full"
          >
            {/* Header: Logo, Title, Subtitle */}
            <motion.div variants={itemVariants} className="flex flex-col items-center text-center mb-5 sm:mb-7">
              {/* Brand Logo Header: Inventra AI */}
              <motion.div
                animate={prefersReducedMotion ? {} : { y: [0, -4, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                className="mb-3.5 sm:mb-4"
              >
                <Link
                  to="/"
                  className="group relative inline-flex items-center px-4 sm:px-5 py-2 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 hover:border-[#D5F737]/50 shadow-[0_4px_20px_rgba(0,0,0,0.35)] hover:shadow-[0_0_24px_rgba(213,247,55,0.25)] backdrop-blur-xl transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
                >
                  <span className="text-base sm:text-lg font-bold tracking-tight text-white transition-colors">
                    Inventra <span className="text-[#D5F737] font-extrabold tracking-wide drop-shadow-[0_0_12px_rgba(213,247,55,0.4)]">AI</span>
                  </span>
                </Link>
              </motion.div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Create an account
              </h1>
              <p className="text-xs sm:text-sm text-[#9A9A9A] mt-1.5">
                Start streamlining your inventory intelligence
              </p>
            </motion.div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Name & Company in 2 Columns */}
              <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="signup-name"
                    className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 transition-colors duration-200 ${
                      focusedField === 'name' ? 'text-[#D5F737]' : 'text-[#9A9A9A]'
                    }`}
                  >
                    Name
                  </label>
                  <div
                    className={`relative flex items-center rounded-xl bg-[#1C1C1C] border transition-all duration-200 ${
                      error && !name.trim()
                        ? 'border-[#F0506E]'
                        : focusedField === 'name'
                        ? 'border-[#D5F737] shadow-[0_0_12px_rgba(213,247,55,0.25)]'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <User className="w-4 h-4 text-[#9A9A9A] absolute left-3.5 pointer-events-none" />
                    <input
                      id="signup-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onFocus={() => setFocusedField('name')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="John Doe"
                      required
                      className="w-full bg-transparent pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-[#9A9A9A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737] rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="signup-company"
                    className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 transition-colors duration-200 ${
                      focusedField === 'company' ? 'text-[#D5F737]' : 'text-[#9A9A9A]'
                    }`}
                  >
                    Company <span className="text-[10px] lowercase text-[#9A9A9A]/60">(opt)</span>
                  </label>
                  <div
                    className={`relative flex items-center rounded-xl bg-[#1C1C1C] border transition-all duration-200 ${
                      focusedField === 'company'
                        ? 'border-[#D5F737] shadow-[0_0_12px_rgba(213,247,55,0.25)]'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <Building className="w-4 h-4 text-[#9A9A9A] absolute left-3.5 pointer-events-none" />
                    <input
                      id="signup-company"
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      onFocus={() => setFocusedField('company')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Acme Corp"
                      className="w-full bg-transparent pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-[#9A9A9A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737] rounded-xl"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Email Field */}
              <motion.div variants={itemVariants}>
                <label
                  htmlFor="signup-email"
                  className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 transition-colors duration-200 ${
                    focusedField === 'email' ? 'text-[#D5F737]' : 'text-[#9A9A9A]'
                  }`}
                >
                  Email
                </label>
                <div
                  className={`relative flex items-center rounded-xl bg-[#1C1C1C] border transition-all duration-200 ${
                    error && !email.trim()
                      ? 'border-[#F0506E]'
                      : focusedField === 'email'
                      ? 'border-[#D5F737] shadow-[0_0_12px_rgba(213,247,55,0.25)]'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <Mail className="w-4 h-4 text-[#9A9A9A] absolute left-3.5 pointer-events-none" />
                  <input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="name@company.com"
                    required
                    autoComplete="email"
                    className="w-full bg-transparent pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-[#9A9A9A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737] rounded-xl"
                  />
                </div>
              </motion.div>

              {/* Password & Confirm Password */}
              <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Password Field with Strength Bar */}
                <div>
                  <label
                    htmlFor="signup-password"
                    className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 transition-colors duration-200 ${
                      focusedField === 'password' ? 'text-[#D5F737]' : 'text-[#9A9A9A]'
                    }`}
                  >
                    Password
                  </label>
                  <div
                    className={`relative flex items-center rounded-xl bg-[#1C1C1C] border transition-all duration-200 ${
                      error && (!password || password.length < 6)
                        ? 'border-[#F0506E]'
                        : focusedField === 'password'
                        ? 'border-[#D5F737] shadow-[0_0_12px_rgba(213,247,55,0.25)]'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <Lock className="w-4 h-4 text-[#9A9A9A] absolute left-3.5 pointer-events-none" />
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Min 6 chars"
                      required
                      className="w-full bg-transparent pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-[#9A9A9A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737] rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-[#9A9A9A] hover:text-white p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737] transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        {showPassword ? (
                          <motion.span
                            key="eye-off"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.15 }}
                            className="block"
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                          </motion.span>
                        ) : (
                          <motion.span
                            key="eye"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.15 }}
                            className="block"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {password && (
                    <div className="mt-1.5 flex items-center gap-1.5 px-0.5">
                      {[1, 2, 3, 4].map((seg) => (
                        <div
                          key={seg}
                          className="h-1 flex-1 rounded-full transition-all duration-300"
                          style={{
                            backgroundColor:
                              seg <= strength.score ? strength.color : 'rgba(255, 255, 255, 0.08)',
                          }}
                        />
                      ))}
                      <span
                        className="text-[10px] font-medium ml-1 transition-colors duration-200"
                        style={{ color: strength.color }}
                      >
                        {strength.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm Password Field with Match Checkmark */}
                <div>
                  <label
                    htmlFor="signup-confirm-password"
                    className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 transition-colors duration-200 ${
                      focusedField === 'confirmPassword' ? 'text-[#D5F737]' : 'text-[#9A9A9A]'
                    }`}
                  >
                    Confirm Password
                  </label>
                  <div
                    className={`relative flex items-center rounded-xl bg-[#1C1C1C] border transition-all duration-200 ${
                      error && confirmPassword !== password
                        ? 'border-[#F0506E]'
                        : focusedField === 'confirmPassword'
                        ? 'border-[#D5F737] shadow-[0_0_12px_rgba(213,247,55,0.25)]'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <Lock className="w-4 h-4 text-[#9A9A9A] absolute left-3.5 pointer-events-none" />
                    <input
                      id="signup-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onFocus={() => setFocusedField('confirmPassword')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Repeat"
                      required
                      className="w-full bg-transparent pl-10 pr-16 py-2.5 text-xs sm:text-sm text-white placeholder-[#9A9A9A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737] rounded-xl"
                    />

                    {/* Match Checkmark Indicator */}
                    <div className="absolute right-8 flex items-center pointer-events-none">
                      {passwordsMatch && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.6 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
                        </motion.div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 text-[#9A9A9A] hover:text-white p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737] transition-colors"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        {showConfirmPassword ? (
                          <motion.span
                            key="eye-off"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.15 }}
                            className="block"
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                          </motion.span>
                        ) : (
                          <motion.span
                            key="eye"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.15 }}
                            className="block"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* Inline Error Alert sliding down */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -6, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="p-3 rounded-xl bg-[#F0506E]/10 border border-[#F0506E]/30 flex items-start gap-2.5 text-xs text-[#F0506E] overflow-hidden"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span className="leading-tight font-medium">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button: Lime Pill with Shine Sweep */}
              <motion.div variants={itemVariants} className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full rounded-full bg-[#D5F737] hover:brightness-105 active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed text-black font-semibold text-sm py-3 px-6 shadow-md shadow-[#D5F737]/25 transition-all duration-200 overflow-hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737] focus-visible:ring-offset-2 focus-visible:ring-offset-[#181818]"
                >
                  {/* Light Shine Sweep on hover */}
                  <span className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
                    <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12" />
                  </span>

                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    </span>
                  ) : (
                    <span className="relative z-10">Create account</span>
                  )}
                </button>
              </motion.div>
            </form>

            {/* Login Link with Center-Grow Underline */}
            <motion.div variants={itemVariants} className="mt-5 text-center text-xs text-[#9A9A9A]">
              Already have an account?{' '}
              <Link
                to="/login"
                className="relative inline-block text-[#D5F737] font-semibold group rounded px-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
              >
                <span>Log in</span>
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] bg-[#D5F737] w-0 group-hover:w-full transition-all duration-300 ease-out origin-center pointer-events-none" />
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Muted Privacy Notice Below Card */}
        <p className="text-center text-xs text-[#9A9A9A] mt-4 font-normal">
          Secure login. Your data stays private.
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
