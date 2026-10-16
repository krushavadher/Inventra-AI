import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  X,
  Copy,
  PackagePlus,
  Bot,
  Calendar,
  Layers,
  ArrowRight,
  ShieldAlert,
  Clock,
  ChevronRight,
  Plus,
  Upload,
  Info
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { NumberTicker } from '@/components/ui/number-ticker';
import api from '@/lib/axios';

export interface ForecastProduct {
  productId: string;
  id: string;
  _id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  leadTimeDays: number;
  unitCost: number;
  dailyDemand: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
  daysLeft: number | null;
  stockoutDate: string | null;
  reorderPoint: number;
  suggestedOrderQty: number;
  suggestedOrderCost: number;
  risk: 'no_data' | 'out' | 'critical' | 'warning' | 'no_demand' | 'healthy';
  confidence: 'high' | 'medium' | 'low';
  windowDays: number;
  salesDays: number;
}

export interface ForecastSummary {
  counts: {
    no_data: number;
    out: number;
    critical: number;
    warning: number;
    no_demand: number;
    healthy: number;
    total: number;
  };
  atRiskThisWeek: number;
  totalSuggestedOrderCost: number;
  averageDaysOfCover: number;
  nearestStockout: {
    productId: string;
    name: string;
    sku: string;
    daysLeft: number;
  } | null;
  deadStockValue: number;
}

export interface DrawerSeries {
  historical: { date: string; sales: number }[];
  projected: { date: string; projectedStock: number }[];
}

export const ForecastPage: React.FC = () => {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  // Data states
  const [summary, setSummary] = useState<ForecastSummary | null>(null);
  const [products, setProducts] = useState<ForecastProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(true);

  // Filters & Controls
  const [search, setSearch] = useState<string>('');
  const [category, setCategory] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('daysLeft');
  const [activeKpiCard, setActiveKpiCard] = useState<string | null>(null);

  // Drawer state
  const [selectedProduct, setSelectedProduct] = useState<ForecastProduct | null>(null);
  const [drawerSeries, setDrawerSeries] = useState<DrawerSeries | null>(null);
  const [drawerLoading, setDrawerLoading] = useState<boolean>(false);

  // AI Insights Modal state
  const [isInsightsOpen, setIsInsightsOpen] = useState<boolean>(false);
  const [insightsText, setInsightsText] = useState<string>('');
  const [insightsLoading, setInsightsLoading] = useState<boolean>(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  // Stock In Modal State
  const [isStockInOpen, setIsStockInOpen] = useState<boolean>(false);
  const [stockInQty, setStockInQty] = useState<number>(0);
  const [stockInSubmitting, setStockInSubmitting] = useState<boolean>(false);

  // Toast Notification
  const [toast, setToast] = useState<{ id: number; message: string; type: 'success' | 'error' } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ id: Date.now(), message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Fetch Summary
  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await api.get('/api/forecast/summary');
      const data = res.data?.data || res.data;
      setSummary(data);
    } catch (err: any) {
      console.error('Failed to fetch forecast summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Fetch Forecasts
  const fetchForecasts = async () => {
    setLoading(true);
    try {
      const params: any = { sort: sortBy };
      if (search.trim()) params.search = search.trim();
      if (category !== 'all') params.category = category;
      if (riskFilter !== 'all' && riskFilter !== 'atRisk7') params.risk = riskFilter;

      const res = await api.get('/api/forecast', { params });
      const items = res.data?.data || res.data?.forecasts || [];
      setProducts(items);
    } catch (err: any) {
      console.error('Failed to fetch forecasts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchForecasts();
  }, [search, category, riskFilter, sortBy]);

  // Handle drawer opening
  const handleSelectProduct = async (prod: ForecastProduct) => {
    setSelectedProduct(prod);
    setDrawerSeries(null);
    setDrawerLoading(true);

    try {
      const res = await api.get(`/api/forecast/${prod.productId || prod.id || prod._id}`);
      const payload = res.data?.data || res.data;
      if (payload && payload.series) {
        setDrawerSeries(payload.series);
      }
    } catch (err: any) {
      console.error('Failed to fetch product forecast series:', err);
    } finally {
      setDrawerLoading(false);
    }
  };

  // Close drawer on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isStockInOpen) {
          setIsStockInOpen(false);
        } else if (isInsightsOpen) {
          setIsInsightsOpen(false);
        } else if (selectedProduct) {
          setSelectedProduct(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedProduct, isInsightsOpen, isStockInOpen]);

  // Fetch AI Insights
  const fetchInsights = async () => {
    setIsInsightsOpen(true);
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const res = await api.post('/api/forecast/insights');
      const text = res.data?.insights || res.data?.data?.insights || '';
      const cleanText = text
        .replace(/\$/g, '₹')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/^(\s*)\*\s+/gm, '$1• ')
        .replace(/\*/g, '')
        .trim();
      setInsightsText(cleanText);
    } catch (err: any) {
      console.error('Failed to generate forecast insights:', err);
      setInsightsError('Could not connect to the analyst engine. Please try again.');
    } finally {
      setInsightsLoading(false);
    }
  };

  // Copy Reorder Note
  const handleCopyReorderNote = (prod: ForecastProduct) => {
    const note = `Reorder Note:
Product: ${prod.name} (${prod.sku})
Category: ${prod.category}
Current Stock: ${prod.stock} units
Daily Demand: ${prod.dailyDemand}/day
Days of Cover: ${prod.daysLeft ?? 'N/A'} days
Suggested Reorder Qty: ${prod.suggestedOrderQty} units
Estimated Cost: ₹${prod.suggestedOrderCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
Reorder Point: ${prod.reorderPoint} units`;

    navigator.clipboard.writeText(note);
    showToast('Reorder note copied to clipboard!');
  };

  // Submit Stock In from drawer
  const handleStockInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || stockInQty <= 0) return;
    setStockInSubmitting(true);
    try {
      await api.post('/api/stock/in', {
        productId: selectedProduct.productId || selectedProduct.id,
        quantity: Number(stockInQty),
        reason: 'Forecast replenishment'
      });
      showToast(`Stocked in ${stockInQty} units for ${selectedProduct.name}`);
      setIsStockInOpen(false);
      // Refresh data
      fetchSummary();
      fetchForecasts();
      if (selectedProduct) {
        handleSelectProduct({
          ...selectedProduct,
          stock: selectedProduct.stock + Number(stockInQty)
        });
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to record stock in';
      showToast(msg, 'error');
    } finally {
      setStockInSubmitting(false);
    }
  };

  // Categories list
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  // Client filter for "atRisk7" card click
  const filteredProducts = useMemo(() => {
    if (riskFilter === 'atRisk7') {
      return products.filter((p) => p.risk === 'out' || (p.daysLeft !== null && p.daysLeft <= 7));
    }
    return products;
  }, [products, riskFilter]);

  // Format chart data combining historical and projected
  const chartData = useMemo(() => {
    if (!drawerSeries) return [];
    const points: any[] = [];

    // Historical (last 30d): sales bars
    (drawerSeries.historical || []).forEach((h) => {
      points.push({
        date: h.date,
        formattedDate: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(h.date)),
        sales: h.sales,
        projectedStock: null,
        type: 'historical'
      });
    });

    // Projected (next 30d): stock line
    (drawerSeries.projected || []).forEach((p) => {
      points.push({
        date: p.date,
        formattedDate: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(p.date)),
        sales: null,
        projectedStock: p.projectedStock,
        type: 'projected'
      });
    });

    return points;
  }, [drawerSeries]);

  // Lead-time date string for vertical chart marker
  const leadTimeDateMarker = useMemo(() => {
    if (!selectedProduct || !drawerSeries?.projected?.length) return null;
    const leadDays = selectedProduct.leadTimeDays || 7;
    const targetIdx = Math.min(leadDays - 1, drawerSeries.projected.length - 1);
    if (targetIdx >= 0 && drawerSeries.projected[targetIdx]) {
      return drawerSeries.projected[targetIdx].date;
    }
    return null;
  }, [selectedProduct, drawerSeries]);

  return (
    <div className="min-h-full w-full max-w-full p-4 sm:p-6 space-y-6 text-white font-['Outfit',sans-serif] select-none pb-20">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border ${
              toast.type === 'error'
                ? 'bg-red-950/80 border-red-500/40 text-red-200'
                : 'bg-[#232323]/90 border-[#D5F737]/40 text-[#D5F737]'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-[#D5F737] flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="text-white/60 hover:text-white p-1 rounded-lg ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Page Header */}
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-1">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white">
              Inventory{' '}
              <span className="bg-gradient-to-r from-[#D5F737] to-[#7BE0A5] bg-clip-text text-transparent">
                Forecast
              </span>
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#D5F737]/15 text-[#D5F737] border border-[#D5F737]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D5F737] animate-pulse" />
              60-Day Runway
            </span>
          </div>
          <p className="text-xs text-[#9A9A9A] mt-1 font-medium">
            Predict stock depletion, reorder horizons, and risk velocities using sales history
          </p>
        </div>

        {/* Action Button: AI Insights Pill */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchInsights}
            className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold bg-[#D5F737] hover:bg-[#D9F958] text-black shadow-md shadow-[#D5F737]/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.97] flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
          >
            <Sparkles className="w-4 h-4 stroke-[2.5]" />
            <span>AI Insights</span>
          </button>
        </div>
      </section>

      {/* 2. Top 4 Glass Cards with Counting Numbers (Clickable to Filter) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Running out within 7 days */}
        <div
          onClick={() => {
            if (activeKpiCard === 'atRisk7') {
              setActiveKpiCard(null);
              setRiskFilter('all');
            } else {
              setActiveKpiCard('atRisk7');
              setRiskFilter('atRisk7');
            }
          }}
          className={`cursor-pointer p-4 rounded-3xl bg-[rgba(40,40,40,0.45)] backdrop-blur-[20px] saturate-[90%] border transition-all duration-300 hover:-translate-y-0.5 shadow-lg flex flex-col justify-between ${
            activeKpiCard === 'atRisk7'
              ? 'border-[#F5A524] shadow-[0_0_20px_rgba(245,165,36,0.2)]'
              : 'border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#9A9A9A] font-semibold uppercase tracking-wider">
              Running out within 7 days
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
              Urgent
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono tracking-tight flex items-center">
            <NumberTicker value={summary?.atRiskThisWeek ?? 0} className="text-amber-400" />
            <span className="text-sm font-sans font-medium text-zinc-400 ml-2">SKUs</span>
          </div>
          <div className="text-[11px] text-[#9A9A9A] mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
            <span>Filter table by immediate risk</span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
          </div>
        </div>

        {/* Card 2: Critical now */}
        <div
          onClick={() => {
            if (activeKpiCard === 'critical') {
              setActiveKpiCard(null);
              setRiskFilter('all');
            } else {
              setActiveKpiCard('critical');
              setRiskFilter('critical');
            }
          }}
          className={`cursor-pointer p-4 rounded-3xl bg-[rgba(40,40,40,0.45)] backdrop-blur-[20px] saturate-[90%] border transition-all duration-300 hover:-translate-y-0.5 shadow-lg flex flex-col justify-between ${
            activeKpiCard === 'critical'
              ? 'border-[#F0506E] shadow-[0_0_20px_rgba(240,80,110,0.2)]'
              : 'border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#9A9A9A] font-semibold uppercase tracking-wider">
              Critical now
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
              Immediate
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#F0506E] font-mono tracking-tight flex items-center">
            <NumberTicker
              value={(summary?.counts?.critical ?? 0) + (summary?.counts?.out ?? 0)}
              className="text-[#F0506E]"
            />
            <span className="text-sm font-sans font-medium text-zinc-400 ml-2">SKUs</span>
          </div>
          <div className="text-[11px] text-[#9A9A9A] mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
            <span>Lead time exceeded or depleted</span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
          </div>
        </div>

        {/* Card 3: Suggested reorder cost */}
        <div
          onClick={() => {
            if (activeKpiCard === 'cost') {
              setActiveKpiCard(null);
              setSortBy('daysLeft');
            } else {
              setActiveKpiCard('cost');
              setSortBy('suggestedOrderCost');
            }
          }}
          className={`cursor-pointer p-4 rounded-3xl bg-[rgba(40,40,40,0.45)] backdrop-blur-[20px] saturate-[90%] border transition-all duration-300 hover:-translate-y-0.5 shadow-lg flex flex-col justify-between ${
            activeKpiCard === 'cost'
              ? 'border-[#D5F737] shadow-[0_0_20px_rgba(213,247,55,0.2)]'
              : 'border-white/10 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#9A9A9A] font-semibold uppercase tracking-wider">
              Suggested reorder cost
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">Procurement</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight flex items-center">
            <span>₹</span>
            <NumberTicker
              value={summary?.totalSuggestedOrderCost ?? 0}
              decimalPlaces={2}
              className="text-white"
            />
          </div>
          <div className="text-[11px] text-[#9A9A9A] mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
            <span>Sort by replenishment cost</span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
          </div>
        </div>

        {/* Card 4: Average days of cover */}
        <div
          onClick={() => {
            setActiveKpiCard(null);
            setRiskFilter('all');
            setSortBy('daysLeft');
          }}
          className="p-4 rounded-3xl bg-[rgba(40,40,40,0.45)] backdrop-blur-[20px] saturate-[90%] border border-white/10 shadow-lg flex flex-col justify-between hover:border-white/20 transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#9A9A9A] font-semibold uppercase tracking-wider">
              Average days of cover
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#D5F737]/15 text-[#D5F737] border border-[#D5F737]/30">
              Runway
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#D5F737] font-mono tracking-tight flex items-center">
            <NumberTicker
              value={summary?.averageDaysOfCover ?? 0}
              decimalPlaces={1}
              className="text-[#D5F737]"
            />
            <span className="text-sm font-sans font-medium text-zinc-400 ml-2">Days</span>
          </div>
          <div className="text-[11px] text-[#9A9A9A] mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
            <span>Dead stock: ₹{(summary?.deadStockValue ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            <span className="text-zinc-500">Reset</span>
          </div>
        </div>
      </section>

      {/* 3. Filter Row: Search, Category, Risk Segmented Pills, Sort */}
      <section className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
        {/* Search & Category */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-[#9A9A9A] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search product name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#1C1C1C] border border-white/10 rounded-full pl-9 pr-4 py-2 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#D5F737]/60 focus:ring-2 focus:ring-[#D5F737]/20 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Select */}
          <div className="relative flex-shrink-0">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-[#1C1C1C] border border-white/10 rounded-full px-3.5 py-2 text-xs sm:text-sm text-zinc-300 hover:text-white focus:outline-none focus:border-[#D5F737]/60 focus:ring-2 focus:ring-[#D5F737]/20 transition-colors cursor-pointer"
            >
              <option value="all">All Categories</option>
              {availableCategories.map((c) => (
                <option key={c} value={c} className="bg-[#232323] text-white">
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Risk Segmented Pills & Sort Select */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Risk Segmented Pill Control */}
          <div className="flex items-center gap-1 bg-[#1C1C1C] p-1 rounded-full border border-white/10 overflow-x-auto max-w-full">
            {[
              { key: 'all', label: 'All' },
              { key: 'out', label: 'Out' },
              { key: 'critical', label: 'Critical' },
              { key: 'warning', label: 'Warning' },
              { key: 'healthy', label: 'Healthy' },
              { key: 'no_demand', label: 'Dead stock' },
              { key: 'no_data', label: 'No data' },
            ].map((pill) => {
              const active = riskFilter === pill.key;
              return (
                <button
                  key={pill.key}
                  onClick={() => {
                    setActiveKpiCard(null);
                    setRiskFilter(pill.key);
                  }}
                  className={`relative z-10 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737] ${
                    active ? 'text-black font-bold' : 'text-[#9A9A9A] hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="forecastRiskPill"
                      className="absolute inset-0 rounded-full -z-10 bg-[#D5F737] shadow-sm shadow-[#D5F737]/20"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span>{pill.label}</span>
                </button>
              );
            })}
          </div>

          {/* Sort Select */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-[#1C1C1C] border border-white/10 rounded-full px-3.5 py-1.5 text-xs text-zinc-300 hover:text-white focus:outline-none focus:border-[#D5F737]/60 focus:ring-2 focus:ring-[#D5F737]/20 transition-colors cursor-pointer"
          >
            <option value="daysLeft" className="bg-[#232323] text-white">
              Days left (fewest first)
            </option>
            <option value="demand" className="bg-[#232323] text-white">
              Daily demand (highest first)
            </option>
            <option value="suggestedOrderCost" className="bg-[#232323] text-white">
              Suggested order cost (highest first)
            </option>
          </select>
        </div>
      </section>

      {/* 4. Forecast Table (Glass Card) */}
      <section className="rounded-3xl bg-[rgba(40,40,40,0.45)] backdrop-blur-[20px] saturate-[90%] border border-white/10 shadow-xl overflow-hidden">
        {/* Table View (>= 640px) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            {/* Sticky Table Header */}
            <thead className="sticky top-0 z-10 bg-[#1C1C1C]/90 backdrop-blur-md border-b border-white/10 text-[#9A9A9A] font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Product</th>
                <th className="py-3.5 px-3 font-semibold text-right">Stock</th>
                <th className="py-3.5 px-3 font-semibold text-right">Daily Demand</th>
                <th className="py-3.5 px-3 font-semibold min-w-[130px]">Days Left</th>
                <th className="py-3.5 px-3 font-semibold">Stockout Date</th>
                <th className="py-3.5 px-3 font-semibold hidden lg:table-cell">Trend</th>
                <th className="py-3.5 px-3 font-semibold text-right">Suggested Order</th>
                <th className="py-3.5 px-3 font-semibold text-center">Risk</th>
                <th className="py-3.5 px-4 font-semibold text-center hidden lg:table-cell">Confidence</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-white/5 font-medium">
              {loading ? (
                // Skeleton Rows
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-4">
                      <div className="h-4 bg-white/10 rounded w-36 mb-1.5" />
                      <div className="h-3 bg-white/5 rounded w-20" />
                    </td>
                    <td className="py-4 px-3 text-right">
                      <div className="h-4 bg-white/10 rounded w-12 ml-auto" />
                    </td>
                    <td className="py-4 px-3 text-right">
                      <div className="h-4 bg-white/10 rounded w-14 ml-auto" />
                    </td>
                    <td className="py-4 px-3">
                      <div className="h-4 bg-white/10 rounded w-16 mb-1" />
                      <div className="h-1.5 bg-white/5 rounded w-full" />
                    </td>
                    <td className="py-4 px-3">
                      <div className="h-4 bg-white/10 rounded w-20" />
                    </td>
                    <td className="py-4 px-3 hidden lg:table-cell">
                      <div className="h-4 bg-white/10 rounded w-12" />
                    </td>
                    <td className="py-4 px-3 text-right">
                      <div className="h-4 bg-white/10 rounded w-16 ml-auto" />
                    </td>
                    <td className="py-4 px-3 text-center">
                      <div className="h-5 bg-white/10 rounded-full w-16 mx-auto" />
                    </td>
                    <td className="py-4 px-4 text-center hidden lg:table-cell">
                      <div className="h-4 bg-white/10 rounded w-12 mx-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredProducts.length === 0 ? (
                // Empty State
                <tr>
                  <td colSpan={9} className="py-16 px-4 text-center">
                    <div className="max-w-md mx-auto space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#D5F737]/10 border border-[#D5F737]/25 flex items-center justify-center mx-auto text-[#D5F737]">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">No forecast records match your filter</h3>
                        <p className="text-xs text-[#9A9A9A] mt-1 leading-relaxed">
                          Forecast algorithms analyze your real sales records over the past 60 days. Forecasts update automatically as new sales are recorded.
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-3 pt-2">
                        <Link
                          to="/sales"
                          className="px-4 py-2 rounded-full text-xs font-bold bg-[#D5F737] text-black hover:bg-[#D9F958] transition-all flex items-center gap-1.5 shadow-md shadow-[#D5F737]/20"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Record Sale</span>
                        </Link>
                        <Link
                          to="/sales"
                          className="px-4 py-2 rounded-full text-xs font-semibold bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all flex items-center gap-1.5"
                        >
                          <Upload className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Import sales CSV</span>
                        </Link>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod, idx) => {
                  const isNoData = prod.risk === 'no_data';
                  const isCritical = prod.risk === 'critical' || prod.risk === 'out';
                  const isWarning = prod.risk === 'warning';
                  const isHealthy = prod.risk === 'healthy';

                  // Days left bar color & width
                  let barColor = '#D5F737';
                  if (isCritical) barColor = '#F0506E';
                  else if (isWarning) barColor = '#F5A524';
                  else if (prod.risk === 'no_demand') barColor = '#6E727A';

                  const barWidth = prod.daysLeft !== null
                    ? `${Math.min(100, Math.max(4, (prod.daysLeft / 60) * 100))}%`
                    : '0%';

                  return (
                    <motion.tr
                      key={prod.productId || prod.id || prod.sku}
                      initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(0.2, idx * 0.02) }}
                      onClick={() => handleSelectProduct(prod)}
                      className="group hover:bg-white/[0.04] transition-colors cursor-pointer"
                    >
                      {/* Product Name & SKU chip */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white group-hover:text-[#D5F737] transition-colors">
                          {prod.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                            {prod.sku}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {prod.category}
                          </span>
                        </div>
                      </td>

                      {/* Stock */}
                      <td className="py-3.5 px-3 text-right font-mono text-white">
                        <span className="font-bold">{prod.stock}</span>
                        <span className="text-[10px] text-zinc-500 ml-1">units</span>
                      </td>

                      {/* Daily Demand */}
                      <td className="py-3.5 px-3 text-right font-mono">
                        {isNoData ? (
                          <span className="text-[11px] text-zinc-500 font-sans italic">
                            Not enough data
                          </span>
                        ) : (
                          <>
                            <span className="text-white font-bold">{prod.dailyDemand}</span>
                            <span className="text-[10px] text-zinc-500 ml-1">/day</span>
                          </>
                        )}
                      </td>

                      {/* Days Left */}
                      <td className="py-3.5 px-3">
                        {isNoData ? (
                          <span className="text-[11px] text-zinc-500 font-sans italic">
                            Pending history
                          </span>
                        ) : prod.daysLeft === null ? (
                          <span className="text-[11px] text-zinc-500 font-sans">
                            No demand
                          </span>
                        ) : (
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span
                                className={`font-mono font-bold ${
                                  isCritical
                                    ? 'text-[#F0506E]'
                                    : isWarning
                                    ? 'text-amber-400'
                                    : 'text-[#D5F737]'
                                }`}
                              >
                                {prod.daysLeft} days
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{ width: barWidth, backgroundColor: barColor }}
                              />
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Stockout Date */}
                      <td className="py-3.5 px-3 text-zinc-300 text-xs font-mono">
                        {isNoData ? (
                          <span className="text-[11px] text-zinc-500 font-sans italic">
                            -
                          </span>
                        ) : prod.stockoutDate ? (
                          new Intl.DateTimeFormat('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          }).format(new Date(prod.stockoutDate))
                        ) : (
                          <span className="text-zinc-500">None</span>
                        )}
                      </td>

                      {/* Trend (hidden < 1024px) */}
                      <td className="py-3.5 px-3 hidden lg:table-cell">
                        {isNoData ? (
                          <span className="text-[11px] text-zinc-500 font-sans italic">-</span>
                        ) : (
                          <div className="flex items-center gap-1 text-xs font-mono">
                            {prod.trend === 'up' ? (
                              <span className="text-[#D5F737] flex items-center gap-0.5">
                                <TrendingUp className="w-3.5 h-3.5" />
                                <span>+{prod.trendPercent}%</span>
                              </span>
                            ) : prod.trend === 'down' ? (
                              <span className="text-[#F0506E] flex items-center gap-0.5">
                                <TrendingDown className="w-3.5 h-3.5" />
                                <span>{prod.trendPercent}%</span>
                              </span>
                            ) : (
                              <span className="text-zinc-400 flex items-center gap-0.5">
                                <Minus className="w-3.5 h-3.5" />
                                <span>0%</span>
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Suggested Order Qty */}
                      <td className="py-3.5 px-3 text-right font-mono">
                        {isNoData ? (
                          <span className="text-[11px] text-zinc-500 font-sans italic">-</span>
                        ) : prod.suggestedOrderQty > 0 ? (
                          <div>
                            <span className="text-[#D5F737] font-bold">
                              +{prod.suggestedOrderQty}
                            </span>
                            <div className="text-[10px] text-zinc-400">
                              ₹{prod.suggestedOrderCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-zinc-500">0 units</span>
                        )}
                      </td>

                      {/* Risk Badge */}
                      <td className="py-3.5 px-3 text-center">
                        {prod.risk === 'out' && (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            Out
                          </span>
                        )}
                        {prod.risk === 'critical' && (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            Critical
                          </span>
                        )}
                        {prod.risk === 'warning' && (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            Warning
                          </span>
                        )}
                        {prod.risk === 'healthy' && (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#D5F737]/15 text-[#D5F737] border border-[#D5F737]/30">
                            Healthy
                          </span>
                        )}
                        {prod.risk === 'no_demand' && (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400 border border-white/10">
                            Dead Stock
                          </span>
                        )}
                        {prod.risk === 'no_data' && (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/5 text-zinc-400 border border-white/10">
                            No Data
                          </span>
                        )}
                      </td>

                      {/* Confidence Badge (hidden < 1024px) */}
                      <td className="py-3.5 px-4 text-center hidden lg:table-cell">
                        {prod.confidence === 'high' && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-[#D5F737]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D5F737]" />
                            <span>High</span>
                          </span>
                        )}
                        {prod.confidence === 'medium' && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-amber-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <span>Medium</span>
                          </span>
                        )}
                        {prod.confidence === 'low' && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                            <span>Low</span>
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Stacked Card View (< 640px) */}
        <div className="block sm:hidden divide-y divide-white/5">
          {loading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="p-4 space-y-2 animate-pulse">
                <div className="h-4 bg-white/10 rounded w-40" />
                <div className="h-3 bg-white/5 rounded w-24" />
                <div className="h-4 bg-white/10 rounded w-32" />
              </div>
            ))
          ) : filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400">
              No products found
            </div>
          ) : (
            filteredProducts.map((prod) => {
              const isNoData = prod.risk === 'no_data';
              return (
                <div
                  key={prod.productId || prod.id || prod.sku}
                  onClick={() => handleSelectProduct(prod)}
                  className="p-4 space-y-2.5 hover:bg-white/[0.04] cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-white">{prod.name}</div>
                      <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                        {prod.sku} • {prod.category}
                      </div>
                    </div>
                    {/* Risk Badge */}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        prod.risk === 'critical' || prod.risk === 'out'
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          : prod.risk === 'warning'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : prod.risk === 'healthy'
                          ? 'bg-[#D5F737]/15 text-[#D5F737] border border-[#D5F737]/30'
                          : 'bg-white/5 text-zinc-400 border border-white/10'
                      }`}
                    >
                      {prod.risk.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-xs">
                    <div>
                      <div className="text-[10px] text-zinc-500 uppercase font-semibold">Stock</div>
                      <div className="font-mono font-bold text-white mt-0.5">{prod.stock}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-500 uppercase font-semibold">Demand</div>
                      <div className="font-mono font-bold text-white mt-0.5">
                        {isNoData ? '-' : `${prod.dailyDemand}/d`}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-500 uppercase font-semibold">Days Left</div>
                      <div
                        className={`font-mono font-bold mt-0.5 ${
                          prod.daysLeft !== null && prod.daysLeft <= 7
                            ? 'text-[#F0506E]'
                            : 'text-[#D5F737]'
                        }`}
                      >
                        {isNoData ? '-' : prod.daysLeft !== null ? `${prod.daysLeft}d` : 'None'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Small Muted Note Under the Table */}
      <div className="text-center">
        <p className="text-xs text-[#9A9A9A] font-medium">
          Forecasts are estimates based on your past sales and improve as you record more data.
        </p>
      </div>

      {/* 5. Glass Side Drawer for Single Product Drilldown */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Drawer Container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative z-10 w-full max-w-lg h-full bg-[#1C1C1C]/95 backdrop-blur-[24px] border-l border-white/10 shadow-2xl p-6 overflow-y-auto space-y-6 flex flex-col justify-between"
            >
              <div className="space-y-6">
                {/* Drawer Header */}
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      {selectedProduct.name}
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                        {selectedProduct.sku}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {selectedProduct.category}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Risk and Confidence Badges */}
                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      selectedProduct.risk === 'critical' || selectedProduct.risk === 'out'
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        : selectedProduct.risk === 'warning'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : selectedProduct.risk === 'healthy'
                        ? 'bg-[#D5F737]/15 text-[#D5F737] border border-[#D5F737]/30'
                        : 'bg-white/5 text-zinc-400 border border-white/10'
                    }`}
                  >
                    {selectedProduct.risk.replace('_', ' ')}
                  </span>

                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-zinc-300 border border-white/10 flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        selectedProduct.confidence === 'high'
                          ? 'bg-[#D5F737]'
                          : selectedProduct.confidence === 'medium'
                          ? 'bg-amber-400'
                          : 'bg-zinc-500'
                      }`}
                    />
                    <span>{selectedProduct.confidence.toUpperCase()} Confidence</span>
                  </span>
                </div>

                {/* 4 Mini Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-[10px] text-[#9A9A9A] uppercase font-semibold">
                      Current Stock
                    </span>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                      {selectedProduct.stock} <span className="text-xs text-zinc-500">units</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-[10px] text-[#9A9A9A] uppercase font-semibold">
                      Daily Demand
                    </span>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                      {selectedProduct.risk === 'no_data' ? '-' : selectedProduct.dailyDemand}{' '}
                      <span className="text-xs text-zinc-500">/day</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-[10px] text-[#9A9A9A] uppercase font-semibold">
                      Days of Cover
                    </span>
                    <div
                      className={`text-xl font-bold font-mono mt-1 ${
                        selectedProduct.daysLeft !== null && selectedProduct.daysLeft <= 7
                          ? 'text-[#F0506E]'
                          : 'text-[#D5F737]'
                      }`}
                    >
                      {selectedProduct.risk === 'no_data'
                        ? '-'
                        : selectedProduct.daysLeft !== null
                        ? `${selectedProduct.daysLeft} d`
                        : 'No demand'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-[10px] text-[#9A9A9A] uppercase font-semibold">
                      Stockout Horizon
                    </span>
                    <div className="text-sm font-bold font-mono text-zinc-300 mt-2 truncate">
                      {selectedProduct.stockoutDate ? (
                        new Intl.DateTimeFormat('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        }).format(new Date(selectedProduct.stockoutDate))
                      ) : (
                        <span className="text-zinc-500">None projected</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Interactive Forecast Chart: 30d Sales Bars + 30d Stock Line */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white font-bold tracking-tight">
                      Runway Projection (30d Sales vs 30d Stock)
                    </span>
                    <span className="text-[10px] text-[#9A9A9A]">
                      Lead time: {selectedProduct.leadTimeDays}d
                    </span>
                  </div>

                  <div className="h-56 w-full p-2 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-center">
                    {drawerLoading ? (
                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <RefreshCw className="w-4 h-4 animate-spin text-[#D5F737]" />
                        <span>Rendering time series...</span>
                      </div>
                    ) : chartData.length === 0 ? (
                      <div className="text-xs text-zinc-500">No chart data available</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2D2D2D" vertical={false} />
                          <XAxis
                            dataKey="formattedDate"
                            stroke="#6E727A"
                            fontSize={10}
                            tickLine={false}
                            interval={14}
                          />
                          <YAxis stroke="#6E727A" fontSize={10} tickLine={false} />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const d = payload[0].payload;
                              return (
                                <div className="p-2.5 rounded-xl bg-[#232323]/95 backdrop-blur-md border border-white/15 text-xs shadow-xl space-y-1">
                                  <div className="font-semibold text-zinc-400">{d.date}</div>
                                  {d.sales !== null && (
                                    <div className="text-[#D5F737] font-mono">
                                      Actual Sales: {d.sales} units
                                    </div>
                                  )}
                                  {d.projectedStock !== null && (
                                    <div className="text-zinc-200 font-mono">
                                      Projected Stock: {d.projectedStock} units
                                    </div>
                                  )}
                                </div>
                              );
                            }}
                          />
                          {/* Reorder Point Reference Line */}
                          {selectedProduct.reorderPoint > 0 && (
                            <ReferenceLine
                              y={selectedProduct.reorderPoint}
                              stroke="#F0506E"
                              strokeDasharray="3 3"
                              label={{
                                value: `ROP: ${selectedProduct.reorderPoint}`,
                                fill: '#F0506E',
                                fontSize: 9,
                                position: 'insideTopRight'
                              }}
                            />
                          )}
                          {/* Lead Time Vertical Line */}
                          {leadTimeDateMarker && (
                            <ReferenceLine
                              x={new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(leadTimeDateMarker))}
                              stroke="#F5A524"
                              strokeDasharray="2 2"
                              label={{
                                value: 'Lead Time',
                                fill: '#F5A524',
                                fontSize: 9,
                                position: 'insideTopLeft'
                              }}
                            />
                          )}
                          {/* Actual Daily Sales (Lime Bars) */}
                          <Bar dataKey="sales" fill="#D5F737" radius={[2, 2, 0, 0]} maxBarSize={6} />
                          {/* Projected Stock Level (Descending Line) */}
                          <Line
                            type="monotone"
                            dataKey="projectedStock"
                            stroke="#A1A1AA"
                            strokeWidth={2}
                            dot={false}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* "Why this forecast" text box */}
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-[#D5F737]" />
                    <span>Why this forecast</span>
                  </div>
                  <p className="text-xs text-[#9A9A9A] leading-relaxed">
                    {selectedProduct.risk === 'no_data'
                      ? 'This product currently has fewer than 3 active sales days or less than 7 days of recorded history. Confidence will increase as new sales are logged.'
                      : `Based on ${selectedProduct.salesDays} sales days over the last ${selectedProduct.windowDays} days. Recent demand is ${selectedProduct.dailyDemand}/day, ${
                          selectedProduct.trend === 'up'
                            ? 'up'
                            : selectedProduct.trend === 'down'
                            ? 'down'
                            : 'stable at'
                        } ${Math.abs(selectedProduct.trendPercent)}% vs the previous two weeks. Lead time is ${
                          selectedProduct.leadTimeDays
                        } days, placing the reorder threshold at ${selectedProduct.reorderPoint} units.`}
                  </p>
                </div>

                {/* Reorder Box */}
                <div className="p-4 rounded-2xl bg-[#D5F737]/10 border border-[#D5F737]/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#D5F737] font-bold uppercase tracking-wider">
                      Procurement Recommendation
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">
                      ROP: {selectedProduct.reorderPoint}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-2xl font-extrabold text-white font-mono">
                        +{selectedProduct.suggestedOrderQty}{' '}
                        <span className="text-xs font-normal text-zinc-400">units</span>
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        Estimated cost:{' '}
                        <span className="text-[#D5F737] font-semibold">
                          ₹{selectedProduct.suggestedOrderCost.toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Stock In, Copy Note, Ask AI */}
              <div className="pt-4 border-t border-white/10 flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setStockInQty(selectedProduct.suggestedOrderQty || 10);
                    setIsStockInOpen(true);
                  }}
                  className="flex-1 min-w-[120px] px-4 py-2.5 rounded-full text-xs font-bold bg-[#D5F737] hover:bg-[#D9F958] text-black transition-all flex items-center justify-center gap-1.5 shadow-md shadow-[#D5F737]/20"
                >
                  <PackagePlus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Stock In</span>
                </button>

                <button
                  onClick={() => handleCopyReorderNote(selectedProduct)}
                  className="px-3.5 py-2.5 rounded-full text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Copy note</span>
                </button>

                <button
                  onClick={() => {
                    navigate('/assistant', {
                      state: {
                        initialPrompt: `Can you analyze the stock forecast and reorder strategy for ${selectedProduct.name} (${selectedProduct.sku})? Current stock is ${selectedProduct.stock} units and daily demand is ${selectedProduct.dailyDemand}/day.`
                      }
                    });
                  }}
                  className="px-3.5 py-2.5 rounded-full text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-[#D5F737] transition-all flex items-center gap-1.5"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Ask AI</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. AI Insights Modal */}
      <AnimatePresence>
        {isInsightsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsInsightsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative z-10 w-full max-w-2xl rounded-3xl bg-[#232323] border border-white/15 p-6 shadow-2xl space-y-5"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#D5F737]/15 border border-[#D5F737]/35 flex items-center justify-center text-[#D5F737]">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">AI Inventory Analyst Insights</h2>
                    <p className="text-xs text-[#9A9A9A]">Autonomous evaluation of stockout hazards & replenishment orders</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsInsightsOpen(false)}
                  className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="min-h-[220px] max-h-[60vh] overflow-y-auto space-y-4">
                {insightsLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-4 text-center">
                    <div className="w-12 h-12 rounded-full border-2 border-[#D5F737] border-t-transparent animate-spin" />
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-white animate-pulse">
                        Analyzing velocity & stockout horizons...
                      </div>
                      <div className="text-xs text-zinc-500">
                        Synthesizing 60-day demand curves and lead times
                      </div>
                    </div>
                  </div>
                ) : insightsError ? (
                  <div className="py-8 text-center space-y-3">
                    <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                    <div className="text-sm font-medium text-white">{insightsError}</div>
                    <button
                      onClick={fetchInsights}
                      className="px-4 py-2 rounded-full text-xs font-semibold bg-[#D5F737] text-black hover:bg-[#D9F958]"
                    >
                      Retry Analysis
                    </button>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3 text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-line font-['Outfit']">
                    {insightsText}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-[11px] text-[#9A9A9A]">
                  Powered by Gemini Inventory Intelligence
                </span>

                <div className="flex items-center gap-2">
                  <button
                    disabled={insightsLoading}
                    onClick={() => {
                      navigator.clipboard.writeText(insightsText);
                      showToast('Insights copied to clipboard!');
                    }}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Copy</span>
                  </button>

                  <button
                    disabled={insightsLoading}
                    onClick={fetchInsights}
                    className="px-4 py-1.5 rounded-full text-xs font-bold bg-[#D5F737] hover:bg-[#D9F958] text-black flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${insightsLoading ? 'animate-spin' : ''}`} />
                    <span>Regenerate</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. Quick Stock In Modal from Drawer */}
      <AnimatePresence>
        {isStockInOpen && selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsStockInOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-md rounded-3xl bg-[#232323] border border-white/15 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div>
                  <h3 className="text-base font-bold text-white">Stock In Replenishment</h3>
                  <p className="text-xs text-[#9A9A9A] font-mono mt-0.5">
                    {selectedProduct.name} ({selectedProduct.sku})
                  </p>
                </div>
                <button
                  onClick={() => setIsStockInOpen(false)}
                  className="p-1 rounded-full text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleStockInSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Quantity to Add
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={stockInQty}
                    onChange={(e) => setStockInQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#D5F737]"
                    required
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    Suggested reorder quantity was {selectedProduct.suggestedOrderQty} units
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsStockInOpen(false)}
                    className="px-4 py-2 rounded-full text-xs font-semibold text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={stockInSubmitting}
                    className="px-5 py-2 rounded-full text-xs font-bold bg-[#D5F737] hover:bg-[#D9F958] text-black shadow-md shadow-[#D5F737]/20 disabled:opacity-50"
                  >
                    {stockInSubmitting ? 'Recording...' : 'Confirm Stock In'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ForecastPage;
