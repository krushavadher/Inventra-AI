import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User as UserIcon, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import Lenis from 'lenis';
import { useAuth } from '@/context/AuthContext';
import { AppGridBackground } from '@/components/ui/AppGridBackground';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLElement>(null);
  const contentContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Smooth scroll via Lenis on app pages (excluding full-height chat assistant)
  useEffect(() => {
    if (location.pathname.startsWith('/assistant')) return;

    const scrollContainer = scrollContainerRef.current;
    const content = contentContainerRef.current;
    if (!scrollContainer || !content) return;

    const lenis = new Lenis({
      wrapper: scrollContainer,
      content: content,
      duration: 1.0,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    lenis.scrollTo(0, { immediate: true });

    let rafId: number;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    // Track scroll for top bar glass and scroll progress
    const handleScroll = () => {
      const top = scrollContainer.scrollTop || 0;
      const maxScroll = (scrollContainer.scrollHeight || 1) - (scrollContainer.clientHeight || 1);
      setIsScrolled(top > 24);
      if (maxScroll > 0) {
        setScrollProgress(Math.min(100, Math.max(0, (top / maxScroll) * 100)));
      } else {
        setScrollProgress(0);
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [location.pathname]);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const getInitials = (userName?: string) => {
    if (!userName) return 'U';
    const parts = userName.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return userName.slice(0, 2).toUpperCase();
  };

  const displayName = user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User';
  const displayRole = user?.role || 'admin';

  // Navigation items: with Sales between Inventory and Alerts, and Forecast after Sales
  const navItems = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/inventory', label: 'Inventory' },
    { to: '/sales', label: 'Sales' },
    { to: '/forecast', label: 'Forecast' },
    { to: '/alerts', label: 'Alerts' },
    { to: '/assistant', label: 'AI Assistant' },
  ];

  return (
    <div className="relative flex h-screen max-h-screen w-screen max-w-full overflow-hidden bg-[#181818] text-white font-['Outfit',sans-serif]">
      {/* 2px Lime Scroll Progress Line at the very top of the page */}
      <div
        className="fixed top-0 left-0 right-0 h-[2px] bg-[#D5F737] z-50 pointer-events-none transition-all duration-150 ease-out shadow-[0_0_8px_rgba(213,247,55,0.8)]"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* Sidebar */}
      <aside className="w-[240px] sm:w-[250px] h-screen bg-[#232323] border-r border-white/10 flex flex-col flex-shrink-0 z-20">
        {/* Brand Logo */}
        <div className="p-5 border-b border-white/10 flex items-center gap-3 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-[#D5F737] flex items-center justify-center font-extrabold text-base text-black shadow-md shadow-[#D5F737]/20 flex-shrink-0">
            I
          </div>
          <div>
            <div className="font-bold text-base sm:text-lg text-white tracking-tight leading-none">Inventra AI</div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3.5 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center px-4 py-3 rounded-xl text-sm sm:text-base font-semibold tracking-tight transition-all duration-150 ${isActive
                    ? 'bg-[#D5F737]/15 text-[#D5F737] border border-[#D5F737]/35 shadow-[0_0_12px_rgba(213,247,55,0.12)] font-bold'
                    : 'text-zinc-100 hover:text-[#D5F737] hover:bg-[#D5F737]/10'
                  }`}
              >
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer: User's name and role with a Logout button */}
        <div className="p-3.5 border-t border-white/10 flex items-center justify-between bg-black/20 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#D5F737] text-black font-semibold text-xs flex items-center justify-center flex-shrink-0 shadow-sm">
              {getInitials(displayName)}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-white truncate max-w-[100px]">{displayName}</div>
              <div className="text-[10px] text-[#9A9A9A] capitalize truncate">{displayRole}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="btn-icon-round text-[#9A9A9A] hover:text-red-400 p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors flex-shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 h-screen max-h-screen flex flex-col overflow-hidden bg-[#181818] relative">
        {/* Top Bar - Turns to glass after 24px of scroll with thin bottom border */}
        <header
          className={`h-16 flex items-center justify-between px-6 flex-shrink-0 z-20 transition-all duration-300 ease-out ${
            isScrolled
              ? 'bg-[rgba(24,24,24,0.7)] backdrop-blur-[16px] border-b border-white/10 shadow-lg'
              : 'bg-[#232323] border-b border-transparent'
          }`}
        >
          {/* Breadcrumb with Lime-to-Green Gradient on One Key Word */}
          <div className="text-xs sm:text-sm text-[#9A9A9A] flex items-center gap-2">
            <span>Inventra AI</span>
            <span>/</span>
            <span className="text-white font-medium capitalize">
              {location.pathname.startsWith('/dashboard') ? (
                <span className="bg-gradient-to-r from-[#D5F737] to-[#7BE0A5] bg-clip-text text-transparent font-bold">
                  Dashboard
                </span>
              ) : location.pathname.startsWith('/inventory') ? (
                <span className="bg-gradient-to-r from-[#D5F737] to-[#7BE0A5] bg-clip-text text-transparent font-bold">
                  Inventory
                </span>
              ) : location.pathname.startsWith('/sales') ? (
                <span className="bg-gradient-to-r from-[#D5F737] to-[#7BE0A5] bg-clip-text text-transparent font-bold">
                  Sales
                </span>
              ) : location.pathname.startsWith('/forecast') ? (
                <span className="bg-gradient-to-r from-[#D5F737] to-[#7BE0A5] bg-clip-text text-transparent font-bold">
                  Forecast
                </span>
              ) : location.pathname.startsWith('/alerts') ? (
                <span className="bg-gradient-to-r from-[#D5F737] to-[#7BE0A5] bg-clip-text text-transparent font-bold">
                  Alerts
                </span>
              ) : location.pathname.startsWith('/assistant') ? (
                <span>
                  AI{' '}
                  <span className="bg-gradient-to-r from-[#D5F737] to-[#7BE0A5] bg-clip-text text-transparent font-bold">
                    Assistant
                  </span>
                </span>
              ) : location.pathname.startsWith('/profile') ? (
                <span>
                  My{' '}
                  <span className="bg-gradient-to-r from-[#D5F737] to-[#7BE0A5] bg-clip-text text-transparent font-bold">
                    Profile
                  </span>
                </span>
              ) : (
                <span className="bg-gradient-to-r from-[#D5F737] to-[#7BE0A5] bg-clip-text text-transparent font-bold">
                  Dashboard
                </span>
              )}
            </span>
          </div>



          {/* Top Bar Right: Profile Avatar with Glass Dropdown */}
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 p-1 rounded-full hover:bg-white/[0.05] transition-colors cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-[#D5F737]"
                aria-expanded={dropdownOpen}
              >
                {/* Profile avatar: initials in a lime circle */}
                <div className="w-8 h-8 rounded-full bg-[#D5F737] text-black font-semibold text-xs flex items-center justify-center flex-shrink-0 shadow-sm shadow-[#D5F737]/20">
                  {getInitials(displayName)}
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-semibold text-white leading-tight">{displayName}</span>
                  <span className="text-[10px] text-[#9A9A9A] capitalize leading-tight">{displayRole}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#9A9A9A]" />
              </button>

              {/* Glass Dropdown (with data-lenis-prevent) */}
              {dropdownOpen && (
                <div
                  data-lenis-prevent
                  className="absolute right-0 mt-2 w-48 rounded-2xl bg-[#232323]/95 backdrop-blur-[20px] border border-white/10 p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="px-3 py-2 border-b border-white/10 md:hidden">
                    <div className="text-xs font-semibold text-white">{displayName}</div>
                    <div className="text-[10px] text-[#9A9A9A] capitalize">{displayRole}</div>
                  </div>

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate('/profile');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-white hover:text-[#D5F737] hover:bg-white/[0.06] rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>My Profile</span>
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area - Fits Screen Height with background layer */}
        <main
          ref={scrollContainerRef}
          className={`relative flex-1 h-[calc(100vh-64px)] max-h-[calc(100vh-64px)] ${
            location.pathname.startsWith('/assistant') ? 'overflow-hidden' : 'overflow-y-auto'
          } overflow-x-hidden bg-[#181818]`}
        >
          {/* Spring-masked Lime Cursor Spotlight Grid Background */}
          <AppGridBackground />

          {/* Children content sitting in foreground relative z-10 */}
          <div
            ref={contentContainerRef}
            className={`relative z-10 ${
              location.pathname.startsWith('/assistant') ? 'h-full' : 'min-h-full'
            } w-full`}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
