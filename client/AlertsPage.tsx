import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Search,
  ShieldCheck,
  Package,
  Boxes,
  ArrowRight
} from 'lucide-react';
import { AnimatedList } from '@/components/ui/animated-list';
import { GlassCard } from '@/components/ui/GlassCard';
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

  const fetchAlerts = async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get('/api/alerts');
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data)) {
        setAlerts(data);
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
      state: { question }
    });
  };

  return (
    <div className="h-full max-h-full w-full flex flex-col overflow-hidden p-6 text-white select-none">
      {/* Header Section */}
      <div className="flex-shrink-0 flex flex-col gap-4 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">Stock Alerts & Monitoring</h1>
              {alerts.length > 0 && (
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  {alerts.length} Action Items
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Live tracking of low-stock thresholds, inventory shortages, and automated AI replenishment assistance.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchAlerts(true)}
              className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all active:scale-95 flex items-center gap-2 text-xs font-semibold"
              title="Refresh alerts"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#D5F737]' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Metric Summary Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Critical (Out of Stock) */}
          <GlassCard className="p-4 border border-rose-500/20 bg-rose-500/[0.06] rounded-2xl flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                Critical (Out of Stock)
              </div>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                {criticalCount}
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">Immediate reorder required</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertCircle className="w-5 h-5" />
            </div>
          </GlassCard>

          {/* Warning (Low Stock) */}
          <GlassCard className="p-4 border border-amber-500/20 bg-amber-500/[0.06] rounded-2xl flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Low Stock Warnings
              </div>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                {warningCount}
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">Below safety buffer</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </GlassCard>

          {/* Total Attention Needed */}
          <GlassCard className="p-4 border border-white/10 bg-white/[0.04] rounded-2xl flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#D5F737]" />
                Total Active Alerts
              </div>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                {alerts.length}
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                {alerts.length === 0 ? 'Catalog healthy' : 'Catalog items flagged'}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300">
              <Package className="w-5 h-5" />
            </div>
          </GlassCard>
        </div>

        {/* Filter Bar: Search + Severity Pills */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search alert by item name, SKU, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#D5F737]/60 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setFilterSeverity('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                filterSeverity === 'ALL'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All ({alerts.length})
            </button>
            <button
              onClick={() => setFilterSeverity('CRITICAL')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                filterSeverity === 'CRITICAL'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Critical ({criticalCount})
            </button>
            <button
              onClick={() => setFilterSeverity('WARNING')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                filterSeverity === 'WARNING'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Warnings ({warningCount})
            </button>
          </div>
        </div>
      </div>

      {/* Main Alerts List (Fits screen height, scrolls inside its own container) */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 animate-pulse flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="h-5 bg-white/10 rounded w-28" />
                  <div className="h-7 bg-white/10 rounded-xl w-24" />
                </div>
                <div className="h-4 bg-white/10 rounded w-64" />
                <div className="h-3 bg-white/5 rounded w-48" />
              </div>
            ))}
          </div>
        ) : filteredAlerts.length > 0 ? (
          <AnimatedList delay={150} className="w-full flex flex-col gap-3.5 pb-4">
            {filteredAlerts.map((item) => {
              const isOut = item.stock === 0;

              return (
                <GlassCard
                  key={item._id || item.productId || item.sku}
                  className={`p-5 rounded-2xl border transition-all duration-200 backdrop-blur-xl ${
                    isOut
                      ? 'border-rose-500/30 bg-rose-500/[0.04] hover:border-rose-500/50'
                      : 'border-amber-500/30 bg-amber-500/[0.04] hover:border-amber-500/50'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: Product & Alert Info */}
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isOut
                            ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                            : 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                        }`}
                      >
                        {isOut ? (
                          <AlertCircle className="w-5 h-5" />
                        ) : (
                          <AlertTriangle className="w-5 h-5" />
                        )}
                      </div>

                      <div className="flex flex-col gap-1">
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
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300">
                            {item.sku}
                          </span>
                          <span className="text-xs text-zinc-400 px-2 py-0.5 rounded-full bg-white/5">
                            {item.category || 'General'}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                          {item.name}
                        </h3>

                        <p className="text-xs text-zinc-300 font-medium">
                          {item.message}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 mt-1">
                          <div>
                            Current Stock:{' '}
                            <span
                              className={`font-mono font-bold ${
                                isOut ? 'text-rose-400' : 'text-amber-400'
                              }`}
                            >
                              {item.stock} units
                            </span>
                          </div>
                          <div>
                            Safety Buffer:{' '}
                            <span className="font-mono text-zinc-300">
                              {item.minStock} units
                            </span>
                          </div>
                          {item.supplier && (
                            <div>
                              Supplier:{' '}
                              <span className="text-zinc-300">{item.supplier}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Ask AI Action Button */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                      <button
                        onClick={() => handleAskAI(item)}
                        className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 bg-[#D5F737]/15 hover:bg-[#D5F737]/25 border border-[#D5F737]/40 text-[#D5F737] shadow-sm hover:shadow-[#D5F737]/10 transition-all hover:scale-[1.03] active:scale-[0.98]"
                        title="Analyze alert with Inventra AI Assistant"
                      >
                        <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Ask AI</span>
                        <ArrowRight className="w-3 h-3 ml-0.5 opacity-70" />
                      </button>

                      <span className="text-[10px] text-zinc-500 font-mono">
                        Prompt ready
                      </span>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </AnimatedList>
        ) : (
          <div className="h-full flex items-center justify-center p-8">
            <GlassCard className="p-8 border border-white/10 rounded-2xl max-w-md w-full text-center flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white">All Stock Levels Healthy</h3>
              <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                {search || filterSeverity !== 'ALL'
                  ? 'No inventory alerts match your active filter.'
                  : 'Every item in the warehouse catalog meets or exceeds its minimum safety stock thresholds.'}
              </p>
              <button
                onClick={() => fetchAlerts(true)}
                className="mt-2 px-4 py-1.5 rounded-xl text-xs font-semibold border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300"
              >
                Re-check Thresholds
              </button>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsPage;
