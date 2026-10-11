import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Bell, Bot, LogOut, User as UserIcon, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    navigate('/', { replace: true });
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

  // Navigation items: only 4 pages as mandated
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/inventory', label: 'Inventory', icon: Package },
    { to: '/alerts', label: 'Alerts', icon: Bell },
    { to: '/assistant', label: 'AI Assistant', icon: Bot },
  ];

  // Breadcrumb current label
  const getCurrentLabel = () => {
    if (location.pathname.startsWith('/dashboard')) return 'Dashboard';
    if (location.pathname.startsWith('/inventory')) return 'Inventory';
    if (location.pathname.startsWith('/alerts')) return 'Alerts';
    if (location.pathname.startsWith('/assistant')) return 'AI Assistant';
    if (location.pathname.startsWith('/profile')) return 'My Profile';
    return 'Dashboard';
  };

  return (
    <div className="flex h-screen max-h-screen w-screen max-w-full overflow-hidden bg-[#181818] text-white font-['Outfit',sans-serif]">
      {/* Sidebar - Strictly 4 pages + User footer with Logout */}
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

        {/* Navigation Items (strictly the 4 required pages) */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${isActive
                    ? 'bg-[#D5F737]/15 text-[#D5F737] border border-[#D5F737]/25 shadow-sm'
                    : 'text-[#9A9A9A] hover:text-white hover:bg-white/[0.04]'
                  }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#D5F737]' : 'text-[#9A9A9A]'}`} />
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
            className="text-[#9A9A9A] hover:text-red-400 p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors flex-shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 h-screen max-h-screen flex flex-col overflow-hidden bg-[#181818]">
        {/* Top Bar */}
        <header className={`h-16 bg-[#232323] ${location.pathname.startsWith('/dashboard') ? '' : 'border-b border-white/10'} flex items-center justify-between px-6 flex-shrink-0 z-10`}>
          {/* Breadcrumb */}
          <div className="text-xs sm:text-sm text-[#9A9A9A] flex items-center gap-2">
            <span>Inventra AI</span>
            <span>/</span>
            <span className="text-white font-medium capitalize">{getCurrentLabel()}</span>
          </div>

          {/* Top Bar Right: Profile Avatar with Glass Dropdown */}
          <div className="flex items-center gap-4 sm:gap-6">

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 p-1 rounded-full hover:bg-white/[0.05] transition-colors cursor-pointer text-left"
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

              {/* Glass Dropdown */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-[#232323]/95 backdrop-blur-[20px] border border-white/10 p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
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

        {/* Main Content Area - Fits Screen Height */}
        <main className="flex-1 h-[calc(100vh-64px)] max-h-[calc(100vh-64px)] overflow-hidden bg-[#181818]">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
