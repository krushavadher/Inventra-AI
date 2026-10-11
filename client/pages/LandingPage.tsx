import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Package,
  Bell,
  Bot,
  LayoutDashboard,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Activity,
  ShieldCheck,
  Send,
  CheckCircle2,
  Boxes,
  Cpu
} from 'lucide-react';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatedGridPattern } from '@/components/ui/animated-grid-pattern';
import { AuroraText } from '@/components/ui/aurora-text';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { NumberTicker } from '@/components/ui/number-ticker';
import { BlurFade } from '@/components/ui/blur-fade';
import { MagicCard } from '@/components/ui/magic-card';
import { TypingAnimation } from '@/components/ui/typing-animation';
import { useAuth } from '@/context/AuthContext';

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="relative min-h-screen w-full max-w-full overflow-x-hidden bg-[#181818] text-white font-['Outfit',sans-serif] selection:bg-[#D5F737] selection:text-black">
      {/* 1. STICKY GLASS NAVBAR */}
      <nav className="sticky top-0 z-50 w-full backdrop-blur-[18px] bg-[#181818]/80 border-b border-white/10 transition-all">
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
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#9A9A9A]">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#ai-assistant" className="hover:text-white transition-colors">
              AI Assistant
            </a>
            <a href="#how-it-works" className="hover:text-white transition-colors">
              How it works
            </a>
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

      {/* 2. HERO SECTION (FULL SCREEN) */}
      <section className="relative min-h-[calc(100vh-64px)] w-full flex items-center justify-center overflow-hidden py-12 lg:py-20 px-4 sm:px-6 lg:px-8">
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

      {/* 3. SECTION 1: FEATURES (BENTO GRID WITH MAGIC CARD HOVER) */}
      <section id="features" className="py-20 lg:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <BlurFade delay={0.08} inView>
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D5F737]/10 border border-[#D5F737]/25 text-xs font-semibold text-[#D5F737] mb-3">
              Core Capabilities
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Engineered for Precision Inventory
            </h2>
            <p className="text-sm sm:text-base text-[#9A9A9A] mt-2.5">
              Everything you need to eliminate stockouts, reduce carrying costs, and automate replenishment.
            </p>
          </div>
        </BlurFade>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Feature 1: Live Inventory */}
          <BlurFade delay={0.12} inView>
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
          </BlurFade>

          {/* Feature 2: Low-Stock Alerts */}
          <BlurFade delay={0.16} inView>
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
          </BlurFade>

          {/* Feature 3: AI Assistant */}
          <BlurFade delay={0.2} inView>
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
          </BlurFade>

          {/* Feature 4: Smart Dashboard */}
          <BlurFade delay={0.24} inView>
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
          </BlurFade>
        </div>
      </section>

      {/* 4. SECTION 2: HOW IT WORKS (3 STEPS) */}
      <section id="how-it-works" className="py-20 lg:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/10">
        <BlurFade delay={0.08} inView>
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D5F737]/10 border border-[#D5F737]/25 text-xs font-semibold text-[#D5F737] mb-3">
              Simple Workflow
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              How It Works
            </h2>
            <p className="text-sm sm:text-base text-[#9A9A9A] mt-2.5">
              Three streamlined steps to full control of your supply chain.
            </p>
          </div>
        </BlurFade>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {/* Step 1 */}
          <BlurFade delay={0.12} inView>
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
          </BlurFade>

          {/* Step 2 */}
          <BlurFade delay={0.18} inView>
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
          </BlurFade>

          {/* Step 3 */}
          <BlurFade delay={0.24} inView>
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
          </BlurFade>
        </div>
      </section>

      {/* 5. SECTION 3: AI ASSISTANT PREVIEW */}
      <section id="ai-assistant" className="py-20 lg:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/10">
        <BlurFade delay={0.08} inView>
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D5F737]/10 border border-[#D5F737]/25 text-xs font-semibold text-[#D5F737] mb-3">
              Intelligence in Action
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Meet Your Inventory Copilot
            </h2>
            <p className="text-sm sm:text-base text-[#9A9A9A] mt-2.5">
              Ask questions in plain English and receive instant, data-backed operational actions.
            </p>
          </div>
        </BlurFade>

        <BlurFade delay={0.16} inView>
          <div className="max-w-3xl mx-auto">
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
          </div>
        </BlurFade>
      </section>

      {/* 6. SECTION 4: CALL TO ACTION */}
      <section className="py-20 lg:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/10">
        <BlurFade delay={0.08} inView>
          <GlassCard className="p-8 sm:p-14 border border-white/15 bg-white/[0.08] backdrop-blur-[24px] rounded-[32px] text-center relative overflow-hidden shadow-2xl">
            <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-[#D5F737] text-black font-extrabold flex items-center justify-center mb-6 shadow-lg shadow-[#D5F737]/25">
                <Boxes className="w-6 h-6" />
              </div>
              <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
                Own Your Inventory Today
              </h2>
              <p className="text-sm sm:text-base text-[#9A9A9A] max-w-md mb-8 leading-relaxed">
                Join high-growth supply chains eliminating stockouts and maximizing working capital efficiency with Inventra AI.
              </p>
              <Link to="/signup">
                <ShimmerButton
                  background="#D5F737"
                  shimmerColor="#ffffff"
                  className="text-black font-bold text-sm sm:text-base px-8 py-4 rounded-xl shadow-xl shadow-[#D5F737]/30 hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer"
                >
                  Create free account
                </ShimmerButton>
              </Link>
            </div>
          </GlassCard>
        </BlurFade>
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
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#ai-assistant" className="hover:text-white transition-colors">
              AI Assistant
            </a>
            <a href="#how-it-works" className="hover:text-white transition-colors">
              How it works
            </a>
            <Link to="/login" className="hover:text-white transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
