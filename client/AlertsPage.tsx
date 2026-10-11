import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  RefreshCw,
  Search,
  CheckCircle2,
  ArrowRight,
  FilterX,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedList } from '@/components/ui/animated-list';
import { GlassCard } from '@/components/ui/GlassCard';
import { NumberTicker } from '@/components/ui/number-ticker';
import api from '@/lib/axios';

export interface AlertItem {
  _id: string;
  productId?: string;
  name: string;
  sku: string;
  category: string;
  supplier?: string;
  stock: number;
  minStock: number;
  status: 'OUT_OF_STOCK' | 'LOW_STOCK' | string;
  severity: 'CRITICAL' | 'WARNING' | string;
  message: string;
}

export const AlertsPage: React.FC = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'CRITICAL' | 'WARNING'>('ALL');

  // Lightweight Toast System
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const fetchAlerts = async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get('/api/alerts');
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data)) {
        setAlerts(data);
      }
      if (showSpinner) {
        showToast('Alerts updated');
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const criticalCount = useMemo(
    () => alerts.filter((a) => a.severity === 'CRITICAL' || a.stock === 0).length,
    [alerts]
  );

  const warningCount = useMemo(
    () => alerts.filter((a) => (a.severity === 'WARNING' || a.stock > 0) && a.stock <= a.minStock).length,
    [alerts]
  );

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.sku.toLowerCase().includes(q) ||
        (a.category && a.category.toLowerCase().includes(q)) ||
        (a.supplier && a.supplier.toLowerCase().includes(q));

      const isCritical = a.severity === 'CRITICAL' || a.stock === 0;
      let matchesSeverity = true;
      if (filterSeverity === 'CRITICAL') {
        matchesSeverity = isCritical;
      } else if (filterSeverity === 'WARNING') {
        matchesSeverity = !isCritical;
      }

      return matchesSearch && matchesSeverity;
    });
  }, [alerts, search, filterSeverity]);

  const handleAskAI = (alert: AlertItem) => {
    const isOut = alert.stock === 0;
    const question = isOut
      ? `Critical Alert: The product "${alert.name}" (${alert.sku}) is completely OUT OF STOCK (0 units left, min threshold: ${alert.minStock}). What emergency supplier replenishment actions and lead times do you recommend?`
      : `Low Stock Alert: The product "${alert.name}" (${alert.sku}) has only ${alert.stock} units remaining against a safety threshold of ${alert.minStock} units. How should we calculate the optimal reorder batch size?`;

    navigate('/assistant', {
      state: { question },
    });
  };

  const FILTER_TABS = [
    { key: 'ALL' as const, label: `All (${alerts.length})` },
    { key: 'CRITICAL' as const, label: `Critical (${criticalCount})` },
    { key: 'WARNING' as const, label: `Warnings (${warningCount})` },
  ];

  return (
    <div className="h-full w-full max-w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-5 text-white font-['Outfit',sans-serif] select-none pb-14">
      {/* 1. Header Section */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Stock Alerts & Monitoring</h1>
            {alerts.length > 0 && (
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                {alerts.length} Action Items
              </span>
            )}
          </div>
          <p className="text-xs text-[#9A9A9A] mt-1">
            Live tracking of low-stock thresholds, inventory shortages, and automated AI replenishment assistance.
          </p>
        </div>

        {/* Refresh button (pill with spin on click) */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchAlerts(true)}
            className="px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all active:scale-95 flex items-center gap-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
            title="Refresh alerts"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 transition-transform duration-500 ${
                isRefreshing ? 'animate-spin text-[#D5F737]' : 'hover:rotate-180'
              }`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </section>

      {/* 2. Summary Cards: Critical, Low Stock Warnings, Total Active Alerts */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* Critical Card (Click applies Critical filter) */}
        <GlassCard
          onClick={() => setFilterSeverity('CRITICAL')}
          className={`p-4 sm:p-5 border transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:border-[#F0506E]/40 hover:shadow-[0_8px_24px_-6px_rgba(240,80,110,0.35)] flex items-center justify-between ${
            filterSeverity === 'CRITICAL'
              ? 'border-[#F0506E] shadow-[0_0_16px_rgba(240,80,110,0.25)] bg-[rgba(50,30,35,0.5)]'
              : 'border-rose-500/20 bg-rose-500/[0.05]'
          }`}
        >
          <div>
            <div className="text-[11px] font-semibold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              Critical (Out of Stock)
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-white mt-1 leading-tight">
              <NumberTicker value={criticalCount} className="text-white" />
            </div>
            <div className="text-[11px] text-[#9A9A9A] mt-0.5">Immediate reorder required</div>
          </div>
        </GlassCard>

        {/* Warning Card (Click applies Warnings filter) */}
        <GlassCard
          onClick={() => setFilterSeverity('WARNING')}
          className={`p-4 sm:p-5 border transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:border-[#F5A524]/40 hover:shadow-[0_8px_24px_-6px_rgba(245,165,36,0.35)] flex items-center justify-between ${
            filterSeverity === 'WARNING'
              ? 'border-[#F5A524] shadow-[0_0_16px_rgba(245,165,36,0.25)] bg-[rgba(50,40,30,0.5)]'
              : 'border-amber-500/20 bg-amber-500/[0.05]'
          }`}
        >
          <div>
            <div className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Low Stock Warnings
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-white mt-1 leading-tight">
              <NumberTicker value={warningCount} className="text-white" />
            </div>
            <div className="text-[11px] text-[#9A9A9A] mt-0.5">Below safety buffer</div>
          </div>
        </GlassCard>

        {/* Total Active Alerts Card (Click applies ALL filter) */}
        <GlassCard
          onClick={() => setFilterSeverity('ALL')}
          className={`p-4 sm:p-5 border transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:border-[#D5F737]/40 hover:shadow-[0_8px_24px_-6px_rgba(213,247,55,0.35)] flex items-center justify-between ${
            filterSeverity === 'ALL'
              ? 'border-[#D5F737] shadow-[0_0_16px_rgba(213,247,55,0.25)] bg-[rgba(40,45,30,0.5)]'
              : 'border-white/10 bg-white/[0.04]'
          }`}
        >
          <div>
            <div className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#D5F737]" />
              Total Active Alerts
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-white mt-1 leading-tight">
              <NumberTicker value={alerts.length} className="text-white" />
            </div>
            <div className="text-[11px] text-[#9A9A9A] mt-0.5">
              {alerts.length === 0 ? 'Catalog healthy' : 'Catalog items flagged'}
            </div>
          </div>
        </GlassCard>
      </section>

      {/* 3. Filter Bar: Search Box (with lime glow on focus) + Sliding Filter Tabs */}
      <section className="flex flex-wrap items-center gap-3">
        {/* Search Box */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#9A9A9A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search alert by item name, SKU, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[rgba(40,40,40,0.45)] backdrop-blur-[20px] border border-white/10 rounded-full pl-9 pr-4 py-2 text-xs text-white placeholder-[#9A9A9A] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737] focus:border-[#D5F737]/60 focus:shadow-[0_0_16px_rgba(213,247,55,0.25)]"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9A9A9A] hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sliding Filter Tabs (Framer Motion layoutId) */}
        <div className="flex items-center gap-1 bg-[#232323] p-1 rounded-full border border-white/10 relative">
          {FILTER_TABS.map((tab) => {
            const isActive = filterSeverity === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilterSeverity(tab.key)}
                className={`relative z-10 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737] ${
                  isActive
                    ? tab.key === 'CRITICAL'
                      ? 'text-rose-400'
                      : tab.key === 'WARNING'
                      ? 'text-amber-400'
                      : 'text-white'
                    : 'text-[#9A9A9A] hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="activeFilterPill"
                    className={`absolute inset-0 rounded-full -z-10 ${
                      tab.key === 'CRITICAL'
                        ? 'bg-rose-500/20 border border-rose-500/35 shadow-sm'
                        : tab.key === 'WARNING'
                        ? 'bg-amber-500/20 border border-amber-500/35 shadow-sm'
                        : 'bg-white/15 border border-white/20 shadow-sm'
                    }`}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Main Alerts List (No inner vertical scroll box, grows with page and scrolls with window) */}
      <div className="w-full">
        {loading ? (
          // Shimmering skeleton cards
          <div className="flex flex-col gap-3.5">
            {[1, 2, 3, 4].map((i) => (
              <GlassCard
                key={i}
                className="p-5 rounded-[24px] border border-white/10 animate-pulse flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="h-5 bg-white/10 rounded-full w-32" />
                  <div className="h-7 bg-white/10 rounded-full w-24" />
                </div>
                <div className="h-5 bg-white/10 rounded w-64" />
                <div className="h-3.5 bg-white/5 rounded w-80" />
                <div className="h-1.5 bg-white/5 rounded-full w-48 mt-1" />
              </GlassCard>
            ))}
          </div>
        ) : filteredAlerts.length > 0 ? (
          /* EXACT PRESERVED ENTRANCE ANIMATION: AnimatedList with delay={150} */
          <AnimatedList delay={150} className="w-full flex flex-col gap-3.5 pb-2">
            {filteredAlerts.map((item) => {
              const isOut = item.stock === 0;
              const bufferRatio = Math.min(100, Math.round((item.stock / Math.max(item.minStock, 1)) * 100));

              return (
                <GlassCard
                  key={item._id || item.productId || item.sku}
                  className={`p-5 rounded-[24px] border transition-colors duration-200 backdrop-blur-xl group ${
                    isOut
                      ? 'border-l-[3px] border-l-[#F0506E] hover:border-rose-500/40 hover:shadow-[0_8px_24px_-8px_rgba(240,80,110,0.25)]'
                      : 'border-l-[3px] border-l-[#F5A524] hover:border-amber-500/40 hover:shadow-[0_8px_24px_-8px_rgba(245,165,36,0.25)]'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Product & Alert Info */}
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                              isOut
                                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {isOut ? 'Critical • Out of Stock' : 'Warning • Low Stock'}
                          </span>
                          <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-300">
                            {item.sku}
                          </span>
                          <span className="text-xs text-[#9A9A9A] px-2.5 py-0.5 rounded-full bg-white/5">
                            {item.category || 'General'}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-white tracking-tight mt-0.5 leading-snug">
                          {item.name}
                        </h3>

                        <p className="text-xs text-zinc-300 font-medium leading-relaxed">{item.message}</p>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-[#9A9A9A] mt-1">
                          <div>
                            Current Stock:{' '}
                            <span className={`font-mono font-bold ${isOut ? 'text-[#F0506E]' : 'text-[#F5A524]'}`}>
                              {item.stock} units
                            </span>
                          </div>
                          <div>
                            Safety Buffer:{' '}
                            <span className="font-mono text-zinc-300">{item.minStock} units</span>
                          </div>
                          {item.supplier && (
                            <div className="truncate max-w-[200px]">
                              Supplier: <span className="text-zinc-300">{item.supplier}</span>
                            </div>
                          )}
                        </div>

                        {/* Thin stock bar comparing Current Stock to Safety Buffer */}
                        <div className="w-full max-w-[260px] pt-1">
                          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700 ease-out"
                              style={{
                                width: `${bufferRatio}%`,
                                backgroundColor: isOut ? '#F0506E' : '#F5A524',
                              }}
                            />
                          </div>
                        </div>
                      </div>

                    {/* Right: Ask AI Action Button (Pill with shine sweep, arrow slide, pulse dot) */}
                    <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-2 flex-shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-white/5">
                      <button
                        onClick={() => handleAskAI(item)}
                        className="relative overflow-hidden group/btn px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 bg-[#D5F737]/15 hover:bg-[#D5F737]/25 border border-[#D5F737]/40 text-[#D5F737] shadow-sm hover:shadow-[0_0_15px_rgba(213,247,55,0.25)] transition-all duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
                        title="Analyze alert with Inventra AI Assistant"
                      >
                        {/* Light shine sweep across on hover */}
                        <span className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
                        <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Ask AI</span>
                        <ArrowRight className="w-3 h-3 ml-0.5 group-hover/btn:translate-x-1 transition-transform duration-200" />
                      </button>

                      {/* Prompt ready with softly pulsing lime dot */}
                      <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D5F737] animate-pulse" />
                        Prompt ready
                      </span>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </AnimatedList>
        ) : (
          /* Centered Empty State with gentle fade-in */
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="w-full flex items-center justify-center p-8 py-16"
          >
            <GlassCard className="p-8 border border-white/10 rounded-[24px] max-w-md w-full text-center flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                {search || filterSeverity !== 'ALL' ? (
                  <FilterX className="w-7 h-7 text-[#9A9A9A]" />
                ) : (
                  <CheckCircle2 className="w-7 h-7 text-[#D5F737]" />
                )}
              </div>
              <h3 className="text-lg font-bold text-white">
                {search || filterSeverity !== 'ALL' ? 'No alerts match your search' : 'All stocked up'}
              </h3>
              <p className="text-xs text-[#9A9A9A] max-w-xs leading-relaxed">
                {search || filterSeverity !== 'ALL'
                  ? 'No inventory alerts match your active filter criteria. Clear filters to view all alerts.'
                  : 'Every item in the warehouse catalog meets or exceeds its minimum safety stock thresholds.'}
              </p>
              {search || filterSeverity !== 'ALL' ? (
                <button
                  onClick={() => {
                    setSearch('');
                    setFilterSeverity('ALL');
                  }}
                  className="mt-2 px-5 py-2 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
                >
                  Clear filters
                </button>
              ) : (
                <button
                  onClick={() => fetchAlerts(true)}
                  className="mt-2 px-5 py-2 rounded-full text-xs font-semibold border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
                >
                  Re-check Thresholds
                </button>
              )}
            </GlassCard>
          </motion.div>
        )}
      </div>

      {/* 5. Small Glass Toast Notification ("Alerts updated") */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#232323]/95 backdrop-blur-[20px] shadow-2xl border border-[#D5F737]/40 text-[#D5F737]"
          >
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#D5F737]" />
            <span className="text-xs font-medium text-white">{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-[#9A9A9A] hover:text-white ml-2 p-0.5 rounded-full hover:bg-white/5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AlertsPage;
