import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  AnimatePresence,
} from 'framer-motion';
import Lenis from 'lenis';
import {
  Package,
  Bell,
  Bot,
  LayoutDashboard,
  ArrowRight,
  ArrowUp,
  Sparkles,
  TrendingUp,
  Activity,
  ShieldCheck,
  Send,
  CheckCircle2,
  Boxes,
  Cpu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedGridPattern } from '@/components/ui/animated-grid-pattern';
import { AuroraText } from '@/components/ui/aurora-text';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { NumberTicker } from '@/components/ui/number-ticker';
import { MagicCard } from '@/components/ui/magic-card';
import { TypingAnimation } from '@/components/ui/typing-animation';
import { useAuth } from '@/context/AuthContext';

/**
 * Section Reveal Item
 * Fades in and slides up ~24px once when 20% visible.
 * Respects prefers-reduced-motion.
 */
interface SectionRevealItemProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  prefersReducedMotion?: boolean | null;
}

const SectionRevealItem: React.FC<SectionRevealItemProps> = ({
  children,
  delay = 0,
  className = '',
  prefersReducedMotion,
}) => {
  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1], // ease-out curve
        delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * Parallax Section Heading
 * Moves slightly slower than scroll (8-10%) across viewport.
 * Animates GPU transform only with zero layout shift.
 */
interface ParallaxHeadingProps {
  children: React.ReactNode;
  className?: string;
  prefersReducedMotion?: boolean | null;
}

const ParallaxHeading: React.FC<ParallaxHeadingProps> = ({
  children,
  className = '',
  prefersReducedMotion,
}) => {
  const targetRef = useRef<HTMLHeadingElement>(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ['start end', 'end start'],
  });

  // Moves 8-10% slower than scroll across viewport range
  const y = useTransform(scrollYProgress, [0, 1], [-20, 20]);

  if (prefersReducedMotion) {
    return <h2 className={className}>{children}</h2>;
  }

  return (
    <motion.h2 ref={targetRef} style={{ y }} className={className}>
      {children}
    </motion.h2>
  );
};

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const lenisRef = useRef<Lenis | null>(null);

  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');
  const [showBackToTop, setShowBackToTop] = useState(false);

  // 1. Initialize Lenis on the window (native touch unchanged, smooth wheel on)
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
      smoothWheel: true,
      syncTouch: false, // touch unchanged (native)
    });

    lenisRef.current = lenis;

    // Single requestAnimationFrame loop
    let rafId: number | null = null;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    // React StrictMode-safe cleanup on unmount
    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      lenis.destroy();
      lenisRef.current = null;
      document.documentElement.classList.remove('lenis', 'lenis-smooth', 'lenis-scrolling', 'lenis-stopped');
    };
  }, []);

  // 2. Passive Scroll Listener for Sticky Navbar (>40px) & Back-To-Top (>450px)
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;

      const scrolled = scrollY > 40;
      setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev));

      const showBtn = scrollY > 450;
      setShowBackToTop((prev) => (prev !== showBtn ? showBtn : prev));

      if (scrollY < 180) {
        setActiveSection('');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 3. Intersection Observer for Active Section Navbar Highlighting
  useEffect(() => {
    const sectionIds = ['features', 'how-it-works', 'ai-assistant'];
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-80px 0px -55% 0px',
        threshold: 0,
      }
    );

    sections.forEach((sec) => observer.observe(sec));
    return () => observer.disconnect();
  }, []);

  // 4. Smooth Scroll with Navbar Offset (64px)
  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, target: string) => {
    if (target.startsWith('#')) {
      const element = document.querySelector(target);
      if (element) {
        e.preventDefault();
        if (lenisRef.current && !prefersReducedMotion) {
          lenisRef.current.scrollTo(element as HTMLElement, {
            offset: -64,
            duration: 1.2,
          });
        } else {
          const top = element.getBoundingClientRect().top + window.scrollY - 64;
          window.scrollTo({
            top,
            behavior: prefersReducedMotion ? 'auto' : 'smooth',
          });
        }
      }
    }
  };

  // 5. Back to Top Action
  const scrollToTop = () => {
    if (lenisRef.current && !prefersReducedMotion) {
      lenisRef.current.scrollTo(0, { duration: 1.2 });
    } else {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      });
    }
  };

  const navLinks = [
    { name: 'Features', href: '#features', id: 'features' },
    { name: 'AI Assistant', href: '#ai-assistant', id: 'ai-assistant' },
    { name: 'How it works', href: '#how-it-works', id: 'how-it-works' },
  ];

  return (
    <div className="relative min-h-screen w-full max-w-full overflow-x-hidden bg-[#181818] text-white font-['Outfit',sans-serif] selection:bg-[#D5F737] selection:text-black">
      {/* 1. STICKY GLASS NAVBAR */}
      <nav
        className="sticky top-0 z-50 w-full transition-all duration-300"
        style={{
          backgroundColor: isScrolled ? 'rgba(24, 24, 24, 0.70)' : 'transparent',
          backdropFilter: isScrolled ? 'blur(16px)' : 'none',
          WebkitBackdropFilter: isScrolled ? 'blur(16px)' : 'none',
          borderBottom: isScrolled
            ? '1px solid rgba(255, 255, 255, 0.10)'
            : '1px solid transparent',
          boxShadow: isScrolled ? '0 10px 30px -10px rgba(0,0,0,0.5)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#D5F737] flex items-center justify-center font-bold text-sm text-black shadow-md shadow-[#D5F737]/25 group-hover:scale-105 transition-transform">
              I
            </div>
            <span className="font-bold text-base sm:text-lg tracking-tight text-white group-hover:text-[#D5F737] transition-colors">
              Inventra AI
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            {navLinks.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <a
                  key={link.id}
                  href={link.href}
                  onClick={(e) => scrollToSection(e, link.href)}
                  className={cn(
                    'transition-colors duration-200 cursor-pointer',
                    isActive
                      ? 'text-[#D5F737] font-semibold'
                      : 'text-[#9A9A9A] hover:text-white'
                  )}
                >
                  {link.name}
                </a>
              );
            })}
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link to="/dashboard">
                <ShimmerButton
                  background="#D5F737"
                  shimmerColor="#ffffff"
                  className="text-black font-semibold text-xs sm:text-sm px-4 sm:px-5 py-2 rounded-xl shadow-md shadow-[#D5F737]/20 hover:brightness-105 transition-all"
                >
                  Go to Dashboard
                </ShimmerButton>
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-[#9A9A9A] hover:text-white hover:bg-white/[0.05] transition-all"
                >
                  Login
                </Link>
                <Link to="/signup">
                  <ShimmerButton
                    background="#D5F737"
                    shimmerColor="#ffffff"
                    className="text-black font-semibold text-xs sm:text-sm px-3.5 sm:px-4.5 py-2 rounded-xl shadow-md shadow-[#D5F737]/20 hover:brightness-105 transition-all"
                  >
                    Sign Up
                  </ShimmerButton>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION (FULL SCREEN - INITIAL ANIMATION UNCHANGED) */}
      <section
        id="hero"
        className="relative min-h-[calc(100vh-64px)] w-full flex items-center justify-center overflow-hidden py-12 lg:py-20 px-4 sm:px-6 lg:px-8"
      >
        {/* Animated Background & Animated Grid Pattern */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <AnimatedBackground className="w-full h-full" />
          <AnimatedGridPattern
            numSquares={45}
            maxOpacity={0.25}
            duration={3}
            repeatDelay={0.5}
            className="[mask-image:radial-gradient(750px_circle_at_center,white,transparent)]"
          />
        </div>

        <div className="relative z-10 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Text Column */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            {/* Pill Badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/15 backdrop-blur-md text-xs font-medium text-[#D5F737] mb-6 shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-[#D5F737] animate-pulse" />
              <span>AI-Powered Platform</span>
            </motion.div>

            {/* Large Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08] mb-6"
            >
              Own Your{' '}
              <AuroraText colors={['#D5F737', '#2BB4A0', '#FFFFFF', '#D5F737']} speed={1.2}>
                Inventory
              </AuroraText>
              .
            </motion.h1>

            {/* One-line subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-base sm:text-lg lg:text-xl text-[#9A9A9A] max-w-xl mb-8 leading-relaxed font-normal"
            >
              Track stock, get low-stock alerts, and ask AI what to do next.
            </motion.p>

            {/* Hero Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-wrap items-center gap-4 w-full sm:w-auto"
            >
              <Link to="/signup" className="w-full sm:w-auto">
                <ShimmerButton
                  background="#D5F737"
                  shimmerColor="#ffffff"
                  className="w-full sm:w-auto text-black font-semibold text-sm sm:text-base px-7 py-3.5 rounded-xl shadow-lg shadow-[#D5F737]/25 hover:brightness-105 active:scale-[0.99] transition-all"
                >
                  Get Started
                </ShimmerButton>
              </Link>

              <Link to="/login" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 backdrop-blur-md text-white font-semibold text-sm sm:text-base transition-all hover:border-white/30 cursor-pointer">
                  Login
                </button>
              </Link>
            </motion.div>
          </div>

          {/* Right Floating Cards Column */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative w-full pt-4 lg:pt-0">
            <div className="relative w-full max-w-md flex flex-col gap-4">
              {/* Floating Card 1: Incoming Stock */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut' }}
                className="w-full"
              >
                <GlassCard className="p-4 sm:p-5 border border-white/15 bg-white/[0.08] backdrop-blur-[18px] rounded-[20px] shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#D5F737]/15 border border-[#D5F737]/30 flex items-center justify-center text-[#D5F737]">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs text-[#9A9A9A] font-medium uppercase tracking-wider">
                          Incoming Stock
                        </div>
                        <div className="text-lg sm:text-xl font-bold text-white flex items-center gap-1.5 mt-0.5">
                          <NumberTicker value={2480} className="text-white" />
                          <span className="text-xs font-medium text-[#9A9A9A]">units</span>
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#D5F737]/15 text-[#D5F737] border border-[#D5F737]/25">
                      In Transit
                    </span>
                  </div>
                </GlassCard>
              </motion.div>

              {/* Floating Card 2: Stock Health */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 5.4, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
                className="w-full"
              >
                <GlassCard className="p-4 sm:p-5 border border-white/15 bg-white/[0.08] backdrop-blur-[18px] rounded-[20px] shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs text-[#9A9A9A] font-medium uppercase tracking-wider">
                          Stock Health
                        </div>
                        <div className="text-lg sm:text-xl font-bold text-white flex items-center mt-0.5">
                          <NumberTicker value={92} className="text-white" />
                          <span>%</span>
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                      Optimal
                    </span>
                  </div>
                </GlassCard>
              </motion.div>

              {/* Floating Card 3: Sales +26% */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 6.2, repeat: Infinity, ease: 'easeInOut', delay: 1.6 }}
                className="w-full"
              >
                <GlassCard className="p-4 sm:p-5 border border-white/15 bg-white/[0.08] backdrop-blur-[18px] rounded-[20px] shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs text-[#9A9A9A] font-medium uppercase tracking-wider">
                          Sales Velocity
                        </div>
                        <div className="text-lg sm:text-xl font-bold text-white flex items-center mt-0.5">
                          <span>+</span>
                          <NumberTicker value={26} className="text-white" />
                          <span>%</span>
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/25">
                      This Month
                    </span>
                  </div>
                </GlassCard>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SECTION 1: FEATURES (STAGGERED REVEALS & SUBTLE PARALLAX) */}
      <section id="features" className="py-20 lg:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <SectionRevealItem delay={0} prefersReducedMotion={prefersReducedMotion}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D5F737]/10 border border-[#D5F737]/25 text-xs font-semibold text-[#D5F737] mb-3">
              Core Capabilities
            </div>
          </SectionRevealItem>

          <SectionRevealItem delay={0.08} prefersReducedMotion={prefersReducedMotion}>
            <ParallaxHeading
              prefersReducedMotion={prefersReducedMotion}
              className="text-3xl sm:text-4xl font-bold text-white tracking-tight"
            >
              Engineered for Precision Inventory
            </ParallaxHeading>
          </SectionRevealItem>

          <SectionRevealItem delay={0.16} prefersReducedMotion={prefersReducedMotion}>
            <p className="text-sm sm:text-base text-[#9A9A9A] mt-2.5">
              Everything you need to eliminate stockouts, reduce carrying costs, and automate replenishment.
            </p>
          </SectionRevealItem>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Feature 1 */}
          <SectionRevealItem delay={0.24} prefersReducedMotion={prefersReducedMotion} className="h-full">
            <MagicCard
              gradientColor="#D5F73718"
              gradientSize={260}
              className="h-full rounded-[24px] border border-white/10 bg-[#232323] p-6 flex flex-col justify-between transition-all hover:border-[#D5F737]/40"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#D5F737]/15 border border-[#D5F737]/30 flex items-center justify-center text-[#D5F737] mb-5">
                  <Package className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Live Inventory</h3>
                <p className="text-xs sm:text-sm text-[#9A9A9A] leading-relaxed">
                  Real-time stock tracking with millisecond-level sync across warehouse bins and multiple fulfillment channels.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-1.5 text-xs text-[#D5F737] font-medium">
                <span>Instant sync active</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </MagicCard>
          </SectionRevealItem>

          {/* Feature 2 */}
          <SectionRevealItem delay={0.32} prefersReducedMotion={prefersReducedMotion} className="h-full">
            <MagicCard
              gradientColor="#D5F73718"
              gradientSize={260}
              className="h-full rounded-[24px] border border-white/10 bg-[#232323] p-6 flex flex-col justify-between transition-all hover:border-[#D5F737]/40"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-5">
                  <Bell className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Low-Stock Alerts</h3>
                <p className="text-xs sm:text-sm text-[#9A9A9A] leading-relaxed">
                  Predictive safety threshold monitoring that notifies you before stock runs dry, factoring supplier lead times.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                <span>Zero unexpected stockouts</span>
              </div>
            </MagicCard>
          </SectionRevealItem>

          {/* Feature 3 */}
          <SectionRevealItem delay={0.4} prefersReducedMotion={prefersReducedMotion} className="h-full">
            <MagicCard
              gradientColor="#D5F73718"
              gradientSize={260}
              className="h-full rounded-[24px] border border-white/10 bg-[#232323] p-6 flex flex-col justify-between transition-all hover:border-[#D5F737]/40"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-5">
                  <Bot className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">AI Assistant</h3>
                <p className="text-xs sm:text-sm text-[#9A9A9A] leading-relaxed">
                  Conversational intelligence that generates purchase recommendations, predicts demand spikes, and analyzes velocity.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-1.5 text-xs text-purple-400 font-medium">
                <span>Autonomous decision support</span>
              </div>
            </MagicCard>
          </SectionRevealItem>

          {/* Feature 4 */}
          <SectionRevealItem delay={0.48} prefersReducedMotion={prefersReducedMotion} className="h-full">
            <MagicCard
              gradientColor="#D5F73718"
              gradientSize={260}
              className="h-full rounded-[24px] border border-white/10 bg-[#232323] p-6 flex flex-col justify-between transition-all hover:border-[#D5F737]/40"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-5">
                  <LayoutDashboard className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Smart Dashboard</h3>
                <p className="text-xs sm:text-sm text-[#9A9A9A] leading-relaxed">
                  Real-time visibility into turnover rates, inventory valuation, active SKUs, and immediate reorder urgency.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-1.5 text-xs text-cyan-400 font-medium">
                <span>Executive analytics live</span>
              </div>
            </MagicCard>
          </SectionRevealItem>
        </div>
      </section>

      {/* 4. SECTION 2: HOW IT WORKS (STAGGERED REVEALS & SUBTLE PARALLAX) */}
      <section
        id="how-it-works"
        className="py-20 lg:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/10"
      >
        <div className="text-center max-w-2xl mx-auto mb-14">
          <SectionRevealItem delay={0} prefersReducedMotion={prefersReducedMotion}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D5F737]/10 border border-[#D5F737]/25 text-xs font-semibold text-[#D5F737] mb-3">
              Simple Workflow
            </div>
          </SectionRevealItem>

          <SectionRevealItem delay={0.08} prefersReducedMotion={prefersReducedMotion}>
            <ParallaxHeading
              prefersReducedMotion={prefersReducedMotion}
              className="text-3xl sm:text-4xl font-bold text-white tracking-tight"
            >
              How It Works
            </ParallaxHeading>
          </SectionRevealItem>

          <SectionRevealItem delay={0.16} prefersReducedMotion={prefersReducedMotion}>
            <p className="text-sm sm:text-base text-[#9A9A9A] mt-2.5">
              Three streamlined steps to full control of your supply chain.
            </p>
          </SectionRevealItem>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {/* Step 1 */}
          <SectionRevealItem delay={0.24} prefersReducedMotion={prefersReducedMotion} className="h-full">
            <GlassCard className="p-7 border border-white/15 bg-white/[0.06] backdrop-blur-[18px] rounded-[24px] relative h-full flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#D5F737] text-black font-extrabold text-base flex items-center justify-center mb-6 shadow-md shadow-[#D5F737]/20">
                  01
                </div>
                <h3 className="text-xl font-bold text-white mb-2.5">Add products</h3>
                <p className="text-xs sm:text-sm text-[#9A9A9A] leading-relaxed">
                  Import your catalog, specify SKUs, and set minimum safety thresholds to establish your baseline inventory parameters.
                </p>
              </div>
              <div className="mt-6 text-xs text-[#D5F737] font-semibold flex items-center gap-1">
                <span>Connect catalog</span> <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </GlassCard>
          </SectionRevealItem>

          {/* Step 2 */}
          <SectionRevealItem delay={0.32} prefersReducedMotion={prefersReducedMotion} className="h-full">
            <GlassCard className="p-7 border border-white/15 bg-white/[0.06] backdrop-blur-[18px] rounded-[24px] relative h-full flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#D5F737] text-black font-extrabold text-base flex items-center justify-center mb-6 shadow-md shadow-[#D5F737]/20">
                  02
                </div>
                <h3 className="text-xl font-bold text-white mb-2.5">Track stock</h3>
                <p className="text-xs sm:text-sm text-[#9A9A9A] leading-relaxed">
                  Monitor inbound shipments and outgoing items with automatic stock-level audits and trigger-based notifications.
                </p>
              </div>
              <div className="mt-6 text-xs text-[#D5F737] font-semibold flex items-center gap-1">
                <span>Automated monitoring</span> <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </GlassCard>
          </SectionRevealItem>

          {/* Step 3 */}
          <SectionRevealItem delay={0.4} prefersReducedMotion={prefersReducedMotion} className="h-full">
            <GlassCard className="p-7 border border-white/15 bg-white/[0.06] backdrop-blur-[18px] rounded-[24px] relative h-full flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#D5F737] text-black font-extrabold text-base flex items-center justify-center mb-6 shadow-md shadow-[#D5F737]/20">
                  03
                </div>
                <h3 className="text-xl font-bold text-white mb-2.5">Ask AI</h3>
                <p className="text-xs sm:text-sm text-[#9A9A9A] leading-relaxed">
                  Query your copilot on what to order, when to replenish, and how to optimize working capital with predictive guidance.
                </p>
              </div>
              <div className="mt-6 text-xs text-[#D5F737] font-semibold flex items-center gap-1">
                <span>Actionable decisions</span> <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </GlassCard>
          </SectionRevealItem>
        </div>
      </section>

      {/* 5. SECTION 3: AI ASSISTANT PREVIEW (STAGGERED REVEALS & SUBTLE PARALLAX) */}
      <section
        id="ai-assistant"
        className="py-20 lg:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/10"
      >
        <div className="text-center max-w-2xl mx-auto mb-14">
          <SectionRevealItem delay={0} prefersReducedMotion={prefersReducedMotion}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D5F737]/10 border border-[#D5F737]/25 text-xs font-semibold text-[#D5F737] mb-3">
              Intelligence in Action
            </div>
          </SectionRevealItem>

          <SectionRevealItem delay={0.08} prefersReducedMotion={prefersReducedMotion}>
            <ParallaxHeading
              prefersReducedMotion={prefersReducedMotion}
              className="text-3xl sm:text-4xl font-bold text-white tracking-tight"
            >
              Meet Your Inventory Copilot
            </ParallaxHeading>
          </SectionRevealItem>

          <SectionRevealItem delay={0.16} prefersReducedMotion={prefersReducedMotion}>
            <p className="text-sm sm:text-base text-[#9A9A9A] mt-2.5">
              Ask questions in plain English and receive instant, data-backed operational actions.
            </p>
          </SectionRevealItem>
        </div>

        <div className="max-w-3xl mx-auto">
          <SectionRevealItem delay={0.24} prefersReducedMotion={prefersReducedMotion}>
            <GlassCard className="p-6 sm:p-8 border border-white/15 bg-white/[0.08] backdrop-blur-[20px] rounded-[24px] shadow-2xl relative">
              {/* Chat Mock Header */}
              <div className="flex items-center justify-between pb-5 border-b border-white/10 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#D5F737] text-black font-bold flex items-center justify-center">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Inventra AI Copilot</div>
                    <div className="text-[10px] text-[#9A9A9A] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D5F737] animate-ping" />
                      Active & Connected to live warehouse
                    </div>
                  </div>
                </div>

                <span className="text-xs px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/10 text-[#9A9A9A]">
                  Enterprise Model
                </span>
              </div>

              {/* Chat Messages */}
              <div className="space-y-4">
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="max-w-md p-3.5 sm:p-4 rounded-2xl rounded-tr-none bg-[#D5F737]/15 border border-[#D5F737]/30 text-xs sm:text-sm text-white">
                    Which products are reaching critical stock levels and need immediate reordering?
                  </div>
                </div>

                {/* AI Reply with Typing Animation */}
                <div className="flex justify-start items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#D5F737] text-black flex items-center justify-center flex-shrink-0 mt-1">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="max-w-xl p-4 sm:p-5 rounded-2xl rounded-tl-none bg-white/[0.05] border border-white/10 text-xs sm:text-sm text-[#FFFFFF] leading-relaxed shadow-inner">
                    <TypingAnimation
                      duration={25}
                      delay={200}
                      className="text-white font-normal"
                    >
                      Based on current sales velocity, SKU-402 (Wireless Pro Headphones) has 14 units left and will stock out in 3 days. I recommend generating a purchase order for 250 units today to maintain your optimal 30-day buffer stock.
                    </TypingAnimation>

                    {/* Action recommendations buttons inside mock */}
                    <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-2">
                      <button className="px-3 py-1.5 rounded-lg bg-[#D5F737]/20 hover:bg-[#D5F737]/30 text-[#D5F737] text-xs font-semibold border border-[#D5F737]/30 transition-colors">
                        Draft PO for 250 units
                      </button>
                      <button className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white text-xs border border-white/10 transition-colors">
                        View Supplier Lead Times
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </SectionRevealItem>
        </div>
      </section>

      {/* 6. SECTION 4: CALL TO ACTION (STAGGERED REVEALS & SUBTLE PARALLAX) */}
      <section className="py-20 lg:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/10">
        <SectionRevealItem delay={0} prefersReducedMotion={prefersReducedMotion}>
          <GlassCard className="p-8 sm:p-14 border border-white/15 bg-white/[0.08] backdrop-blur-[24px] rounded-[32px] text-center relative overflow-hidden shadow-2xl">
            <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
              <SectionRevealItem delay={0.08} prefersReducedMotion={prefersReducedMotion}>
                <div className="w-12 h-12 rounded-2xl bg-[#D5F737] text-black font-extrabold flex items-center justify-center mb-6 shadow-lg shadow-[#D5F737]/25">
                  <Boxes className="w-6 h-6" />
                </div>
              </SectionRevealItem>

              <SectionRevealItem delay={0.16} prefersReducedMotion={prefersReducedMotion}>
                <ParallaxHeading
                  prefersReducedMotion={prefersReducedMotion}
                  className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4"
                >
                  Own Your Inventory Today
                </ParallaxHeading>
              </SectionRevealItem>

              <SectionRevealItem delay={0.24} prefersReducedMotion={prefersReducedMotion}>
                <p className="text-sm sm:text-base text-[#9A9A9A] max-w-md mb-8 leading-relaxed">
                  Join high-growth supply chains eliminating stockouts and maximizing working capital efficiency with Inventra AI.
                </p>
              </SectionRevealItem>

              <SectionRevealItem delay={0.32} prefersReducedMotion={prefersReducedMotion}>
                <Link to="/signup">
                  <ShimmerButton
                    background="#D5F737"
                    shimmerColor="#ffffff"
                    className="text-black font-bold text-sm sm:text-base px-8 py-4 rounded-xl shadow-xl shadow-[#D5F737]/30 hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    Create free account
                  </ShimmerButton>
                </Link>
              </SectionRevealItem>
            </div>
          </GlassCard>
        </SectionRevealItem>
      </section>

      {/* 7. SIMPLE FOOTER */}
      <footer className="w-full border-t border-white/10 bg-[#181818] py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#D5F737] flex items-center justify-center font-bold text-xs text-black">
              I
            </div>
            <span className="font-semibold text-sm text-white">Inventra AI</span>
            <span className="text-xs text-[#9A9A9A]">© 2026 Inventra AI. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-[#9A9A9A]">
            <a
              href="#features"
              onClick={(e) => scrollToSection(e, '#features')}
              className="hover:text-white transition-colors"
            >
              Features
            </a>
            <a
              href="#ai-assistant"
              onClick={(e) => scrollToSection(e, '#ai-assistant')}
              className="hover:text-white transition-colors"
            >
              AI Assistant
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => scrollToSection(e, '#how-it-works')}
              className="hover:text-white transition-colors"
            >
              How it works
            </a>
            <Link to="/login" className="hover:text-white transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </footer>

      {/* Back to Top Round Lime Button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            type="button"
            aria-label="Back to top"
            onClick={scrollToTop}
            initial={{ opacity: 0, scale: 0.8, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 16 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50 w-11 h-11 rounded-full bg-[#D5F737] text-black shadow-xl shadow-[#D5F737]/30 flex items-center justify-center cursor-pointer transition-transform"
          >
            <ArrowUp className="w-5 h-5 stroke-[2.5]" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LandingPage;
