import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  CheckCircle2,
  CheckCircle,
  ArrowRight,
  BarChart3,
  PieChart as PieChartIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { motion, useReducedMotion } from 'framer-motion';
import { NumberTicker } from '@/components/ui/number-ticker';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/axios';

// Curated palette: Lime, Olive #5A632B, Teal, and Greys
const DONUT_COLORS = [
  '#D5F737', // Accent Lime
  '#5A632B', // Olive
  '#2BB4A0', // Emerald Teal
  '#6E727A', // Cool Grey
  '#4A4D52', // Mid Grey
  '#36393E', // Dim Grey
];

interface DashboardData {
  kpis: {
    totalProducts: number;
    stockValue: number;
    lowStock: number;
    outOfStock: number;
    stockHealth: number;
  };
  sales?: {
    revenue: number;
    profit: number;
    marginPercent: number;
    costOfGoods?: number;
    unitsSold?: number;
    salesCount?: number;
  };
  categoryDistribution: {
    name: string;
    value: number;
    stockValue?: number;
    count?: number;
  }[];
  monthlyMovement: {
    month: string;
    in: number;
    out: number;
    total: number;
  }[];
  recentActivity: {
    _id: string;
    movementType: string;
    productName: string;
    sku: string;
    quantity: number;
    referenceDocId?: string;
    reason?: string;
    createdAt: string;
  }[];
  stockHealth: number;
}

// Fallback baseline data if API is loading or fails
const DEFAULT_DATA: DashboardData = {
  kpis: {
    totalProducts: 0,
    stockValue: 0,
    lowStock: 0,
    outOfStock: 0,
    stockHealth: 100,
  },
  sales: {
    revenue: 0,
    profit: 0,
    marginPercent: 0,
    costOfGoods: 0,
    unitsSold: 0,
    salesCount: 0,
  },
  categoryDistribution: [],
  monthlyMovement: [
    { month: 'May', in: 0, out: 0, total: 0 },
    { month: 'Jun', in: 0, out: 0, total: 0 },
    { month: 'Jul', in: 0, out: 0, total: 0 },
    { month: 'Aug', in: 0, out: 0, total: 0 },
    { month: 'Sep', in: 0, out: 0, total: 0 },
    { month: 'Oct', in: 0, out: 0, total: 0 },
  ],
  recentActivity: [],
  stockHealth: 100,
};

// Lightweight SVG Sparkline Component
const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  if (!data || data.length < 2 || data.every((val) => val === 0)) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 54;
  const height = 14;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible opacity-85 flex-shrink-0">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  const [data, setData] = useState<DashboardData>(DEFAULT_DATA);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [stockoutRisks, setStockoutRisks] = useState<any[]>([]);

  // Hover states for interactive charts
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [activeDonutIndex, setActiveDonutIndex] = useState<number | null>(null);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/api/dashboard/summary');
      const payload = res.data.data || res.data;
      if (payload && payload.kpis) {
        setData({
          kpis: {
            totalProducts:
              payload.kpis.totalProducts ?? payload.kpis.totalProductsCount ?? 0,
            stockValue:
              payload.kpis.stockValue ??
              payload.kpis.stockValueINR ??
              payload.kpis.totalInventoryValueINR ??
              0,
            lowStock:
              payload.kpis.lowStock ?? payload.kpis.lowStockCount ?? 0,
            outOfStock:
              payload.kpis.outOfStock ?? payload.kpis.outOfStockCount ?? 0,
            stockHealth:
              payload.kpis.stockHealth ?? payload.stockHealth ?? 100,
          },
          sales: payload.sales || DEFAULT_DATA.sales,
          categoryDistribution:
            payload.categoryDistribution || DEFAULT_DATA.categoryDistribution,
          monthlyMovement:
            payload.monthlyMovement || DEFAULT_DATA.monthlyMovement,
          recentActivity:
            payload.recentActivity || DEFAULT_DATA.recentActivity,
          stockHealth:
            payload.stockHealth ?? payload.kpis.stockHealth ?? 100,
        });
      }

      // Fetch forecast for Stockout Risk card
      try {
        const forecastRes = await api.get('/api/forecast?sort=daysLeft');
        const fList = forecastRes.data.forecasts || forecastRes.data.data || [];
        const nearest = fList
          .filter(
            (item: any) =>
              item.stock > 0 &&
              (item.risk === 'critical' || item.risk === 'warning') &&
              item.daysLeft !== null &&
              item.daysLeft > 0 &&
              item.daysLeft <= 90
          )
          .slice(0, 3);
        setStockoutRisks(nearest);
      } catch (fErr) {
        console.warn('Failed to load forecast for stockout risk card:', fErr);
      }
    } catch (err) {
      console.warn('Dashboard summary fetch failed, using fallback:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const { kpis, sales, categoryDistribution, monthlyMovement, recentActivity, stockHealth } = data;

  // Time-of-day greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Today's formatted date
  const todayFormatted = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date());
  }, []);

  const firstName = useMemo(() => {
    if (user?.name) {
      return user.name.trim().split(' ')[0];
    }
    if (user?.firstName) {
      return user.firstName;
    }
    return 'Admin';
  }, [user]);

  // Sparkline data series from monthly movement
  const movementSparkline = useMemo(() => {
    return monthlyMovement.map((m) => m.in + m.out);
  }, [monthlyMovement]);

  const stockInSparkline = useMemo(() => {
    return monthlyMovement.map((m) => m.in);
  }, [monthlyMovement]);

  const stockOutSparkline = useMemo(() => {
    return monthlyMovement.map((m) => m.out);
  }, [monthlyMovement]);

  const lowStockSparkline = useMemo(() => {
    return monthlyMovement.map(() => kpis.lowStock);
  }, [monthlyMovement, kpis.lowStock]);

  const hasMovementData = useMemo(() => {
    return monthlyMovement.some((m) => (m.in || 0) > 0 || (m.out || 0) > 0);
  }, [monthlyMovement]);

  const hasCategoryData = useMemo(() => {
    return categoryDistribution.length > 0 && categoryDistribution.some((c) => (c.value || 0) > 0);
  }, [categoryDistribution]);

  const displayStockHealth = kpis.totalProducts > 0 ? stockHealth : 0;
  // Stock health circular progress math
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (circumference * Math.min(100, Math.max(0, displayStockHealth))) / 100;

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Just now';
    const diffHours = Math.round((Date.now() - new Date(dateStr).getTime()) / 3600000);
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Cursor spotlight handler for KPI glass cards
  const handleCardMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  return (
    <div className="min-h-full w-full max-w-full p-4 sm:p-6 space-y-6 text-white font-['Outfit',sans-serif] pb-14">
      {/* 1. HERO STRIP (COMPACT) */}
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-1">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white">
              {greeting},{' '}
              <span className="bg-gradient-to-r from-[#D5F737] to-[#7BE0A5] bg-clip-text text-transparent">
                {firstName}
              </span>
            </h1>

          </div>
          <p className="text-xs text-[#9A9A9A] mt-1 font-medium">
            {todayFormatted} • Welcome to your inventory overview
          </p>
        </div>

        {/* Lime Pill Button "Ask AI" */}
        <Link
          to="/assistant"
          className="btn-lime-pill inline-flex items-center gap-2 self-start sm:self-auto px-5 py-2.5 sm:px-6 sm:py-2.5 rounded-full bg-[#D5F737] text-black font-bold text-sm sm:text-base transition-all duration-200 ease-out shadow-sm shadow-[#D5F737]/25 hover:scale-[1.03] active:scale-[0.97] hover:shadow-[0_0_24px_rgba(213,247,55,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737] focus-visible:ring-offset-2 focus-visible:ring-offset-[#181818]"
        >
          <span>Ask AI</span>
        </Link>
      </section>

      {/* 2. KPI CARDS (INCLUDING SALES & PROFIT) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3">
        {/* KPI 1: Total Products */}
        <div
          onMouseMove={handleCardMouseMove}
          className="group relative p-2.5 sm:p-3 rounded-2xl bg-[rgba(40,40,40,0.45)] backdrop-blur-[20px] saturate-[90%] border border-white/10 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:border-[#D5F737]/35 hover:shadow-[0_8px_20px_-8px_rgba(0,0,0,0.6),0_0_12px_rgba(213,247,55,0.12)] overflow-hidden"
        >
          <div
            className="absolute inset-0 pointer-events-none rounded-2xl transition-opacity duration-300 opacity-0 group-hover:opacity-100"
            style={{
              background:
                'radial-gradient(120px circle at var(--mouse-x, -500px) var(--mouse-y, -500px), rgba(213, 247, 55, 0.12), transparent 75%)',
            }}
          />
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[#9A9A9A] font-semibold uppercase tracking-wider">
                Total Products
              </span>
            </div>

            <div className="text-lg sm:text-xl font-bold text-white tracking-tight mb-1">
              <NumberTicker value={kpis.totalProducts} className="text-white" />
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span className="text-[9px] sm:text-[10px] text-[#D5F737] font-medium flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" /> Catalog Active
              </span>
              <Sparkline data={movementSparkline} color="#D5F737" />
            </div>
          </div>
        </div>

        {/* KPI 2: Stock Value */}
        <div
          onMouseMove={handleCardMouseMove}
          className="group relative p-2.5 sm:p-3 rounded-2xl bg-[rgba(40,40,40,0.45)] backdrop-blur-[20px] saturate-[90%] border border-white/10 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:border-[#D5F737]/35 hover:shadow-[0_8px_20px_-8px_rgba(0,0,0,0.6),0_0_12px_rgba(213,247,55,0.12)] overflow-hidden"
        >
          <div
            className="absolute inset-0 pointer-events-none rounded-2xl transition-opacity duration-300 opacity-0 group-hover:opacity-100"
            style={{
              background:
                'radial-gradient(120px circle at var(--mouse-x, -500px) var(--mouse-y, -500px), rgba(213, 247, 55, 0.12), transparent 75%)',
            }}
          />
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[#9A9A9A] font-semibold uppercase tracking-wider">
                Stock Value
              </span>
            </div>

            <div className="text-lg sm:text-xl font-bold text-white tracking-tight mb-1 flex items-center">
              <span>₹</span>
              <NumberTicker value={kpis.stockValue} className="text-white" />
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span className="text-[9px] sm:text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                <TrendingUp className="w-2.5 h-2.5" /> Net Inventory
              </span>
              <Sparkline data={stockInSparkline} color="#34D399" />
            </div>
          </div>
        </div>

        {/* KPI 3: Low Stock */}
        <div
          onMouseMove={handleCardMouseMove}
          className="group relative p-2.5 sm:p-3 rounded-2xl bg-[rgba(40,40,40,0.45)] backdrop-blur-[20px] saturate-[90%] border border-white/10 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:border-[#D5F737]/35 hover:shadow-[0_8px_20px_-8px_rgba(0,0,0,0.6),0_0_12px_rgba(213,247,55,0.12)] overflow-hidden"
        >
          <div
            className="absolute inset-0 pointer-events-none rounded-2xl transition-opacity duration-300 opacity-0 group-hover:opacity-100"
            style={{
              background:
                'radial-gradient(120px circle at var(--mouse-x, -500px) var(--mouse-y, -500px), rgba(213, 247, 55, 0.12), transparent 75%)',
            }}
          />
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[#9A9A9A] font-semibold uppercase tracking-wider">
                Low Stock
              </span>
            </div>

            <div className="text-lg sm:text-xl font-bold text-amber-400 tracking-tight mb-1">
              <NumberTicker value={kpis.lowStock} className="text-amber-400" />
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span className="text-[9px] sm:text-[10px] text-amber-400 font-medium flex items-center gap-1">
                <AlertTriangle className="w-2.5 h-2.5" /> Reorder Triggered
              </span>
              <Sparkline data={lowStockSparkline} color="#FBBF24" />
            </div>
          </div>
        </div>

        {/* KPI 4: Out of Stock */}
        <div
          onMouseMove={handleCardMouseMove}
          className="group relative p-2.5 sm:p-3 rounded-2xl bg-[rgba(40,40,40,0.45)] backdrop-blur-[20px] saturate-[90%] border border-white/10 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:border-[#D5F737]/35 hover:shadow-[0_8px_20px_-8px_rgba(0,0,0,0.6),0_0_12px_rgba(213,247,55,0.12)] overflow-hidden"
        >
          <div
            className="absolute inset-0 pointer-events-none rounded-2xl transition-opacity duration-300 opacity-0 group-hover:opacity-100"
            style={{
              background:
                'radial-gradient(120px circle at var(--mouse-x, -500px) var(--mouse-y, -500px), rgba(213, 247, 55, 0.12), transparent 75%)',
            }}
          />
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[#9A9A9A] font-semibold uppercase tracking-wider">
                Out of Stock
              </span>
            </div>

            <div className="text-lg sm:text-xl font-bold text-red-400 tracking-tight mb-1">
              <NumberTicker value={kpis.outOfStock} className="text-red-400" />
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span className="text-[9px] sm:text-[10px] text-red-400 font-medium flex items-center gap-1">
                <AlertCircle className="w-2.5 h-2.5" /> Immediate Action
              </span>
              <Sparkline data={stockOutSparkline} color="#F87171" />
            </div>
          </div>
        </div>

        {/* KPI 5: Revenue (this month) */}
        <Link
          to="/sales"
          onMouseMove={handleCardMouseMove}
          className="group relative p-2.5 sm:p-3 rounded-2xl bg-[rgba(40,40,40,0.45)] backdrop-blur-[20px] saturate-[90%] border border-white/10 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:border-[#D5F737]/35 hover:shadow-[0_8px_20px_-8px_rgba(0,0,0,0.6),0_0_12px_rgba(213,247,55,0.12)] overflow-hidden flex flex-col justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
        >
          <div
            className="absolute inset-0 pointer-events-none rounded-2xl transition-opacity duration-300 opacity-0 group-hover:opacity-100"
            style={{
              background:
                'radial-gradient(120px circle at var(--mouse-x, -500px) var(--mouse-y, -500px), rgba(213, 247, 55, 0.12), transparent 75%)',
            }}
          />
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[#9A9A9A] font-semibold uppercase tracking-wider">
                Revenue (this month)
              </span>
              <ArrowUpRight className="w-3 h-3 text-[#9A9A9A] group-hover:text-[#D5F737] transition-colors" />
            </div>

            <div className="text-lg sm:text-xl font-bold text-white tracking-tight mb-1 flex items-center">
              <span>₹</span>
              <NumberTicker value={sales?.revenue ?? 0} decimalPlaces={2} className="text-white" />
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span className="text-[9px] sm:text-[10px] text-[#D5F737] font-medium flex items-center gap-1">
                <TrendingUp className="w-2.5 h-2.5" /> {sales?.salesCount ?? 0} sales
              </span>
              <span className="text-[9px] sm:text-[10px] text-[#9A9A9A]">
                {sales?.unitsSold ?? 0} units
              </span>
            </div>
          </div>
        </Link>

        {/* KPI 6: Profit (this month) */}
        <Link
          to="/sales"
          onMouseMove={handleCardMouseMove}
          className="group relative p-2.5 sm:p-3 rounded-2xl bg-[rgba(40,40,40,0.45)] backdrop-blur-[20px] saturate-[90%] border border-white/10 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:border-[#D5F737]/35 hover:shadow-[0_8px_20px_-8px_rgba(0,0,0,0.6),0_0_12px_rgba(213,247,55,0.12)] overflow-hidden flex flex-col justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
        >
          <div
            className="absolute inset-0 pointer-events-none rounded-2xl transition-opacity duration-300 opacity-0 group-hover:opacity-100"
            style={{
              background:
                'radial-gradient(120px circle at var(--mouse-x, -500px) var(--mouse-y, -500px), rgba(213, 247, 55, 0.12), transparent 75%)',
            }}
          />
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[#9A9A9A] font-semibold uppercase tracking-wider">
                Profit (this month)
              </span>
              <ArrowUpRight className="w-3 h-3 text-[#9A9A9A] group-hover:text-[#D5F737] transition-colors" />
            </div>

            <div
              className={`text-lg sm:text-xl font-bold tracking-tight mb-1 flex items-center ${
                (sales?.profit ?? 0) >= 0 ? 'text-[#D5F737]' : 'text-[#F0506E]'
              }`}
            >
              <span>{(sales?.profit ?? 0) < 0 ? '-₹' : '₹'}</span>
              <NumberTicker
                value={Math.abs(sales?.profit ?? 0)}
                decimalPlaces={2}
                className={(sales?.profit ?? 0) >= 0 ? 'text-[#D5F737]' : 'text-[#F0506E]'}
              />
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span
                className={`text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  (sales?.marginPercent ?? 0) >= 0
                    ? 'bg-[#D5F737]/15 text-[#D5F737]'
                    : 'bg-[#F0506E]/15 text-[#F0506E]'
                }`}
              >
                {(sales?.marginPercent ?? 0).toFixed(1)}% margin
              </span>
              <span className="text-[9px] sm:text-[10px] text-[#9A9A9A]">
                Cost: ₹{Number(sales?.costOfGoods ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </Link>
      </section>

      {/* 3. ROW: STOCK MOVEMENT CHART (~60%) & INVENTORY BY CATEGORY DONUT (~40%) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Card: Stock Movement Bar Chart (lg:col-span-7) */}
        <div className="lg:col-span-7 p-5 sm:p-6 rounded-[24px] bg-[rgba(40,40,40,0.45)] backdrop-blur-[20px] saturate-[90%] border border-white/10 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-[#D5F737]/35 hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.6),0_0_20px_rgba(213,247,55,0.12)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                Stock Movement
              </h2>
              <p className="text-xs text-[#9A9A9A] mt-0.5">
                Monthly stock inflow & outflow
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#D5F737]" />
                <span className="text-white">Stock In</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#5A5A5A]" />
                <span className="text-[#9A9A9A]">Stock Out</span>
              </div>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full flex items-center justify-center">
            {hasMovementData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyMovement}
                  margin={{ top: 12, right: 10, left: -20, bottom: 0 }}
                  onMouseMove={(state) => {
                    if (state && state.activeTooltipIndex !== undefined) {
                      setHoveredBarIndex(state.activeTooltipIndex);
                    }
                  }}
                  onMouseLeave={() => setHoveredBarIndex(null)}
                >
                  {/* Light dashed gridlines */}
                  <CartesianGrid
                    strokeDasharray="4 4"
                    stroke="rgba(255,255,255,0.06)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    stroke="#9A9A9A"
                    tick={{ fill: '#9A9A9A', fontSize: 11, fontFamily: 'Outfit' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#9A9A9A"
                    tick={{ fill: '#9A9A9A', fontSize: 11, fontFamily: 'Outfit' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="p-3 rounded-2xl bg-[rgba(35,35,35,0.92)] backdrop-blur-[20px] saturate-[90%] border border-white/10 shadow-2xl text-xs space-y-1.5 min-w-[120px]">
                            <div className="font-semibold text-[#D5F737]">{label}</div>
                            {payload.map((entry, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between gap-3 text-white"
                              >
                                <span className="text-[#9A9A9A]">{entry.name}:</span>
                                <span className="font-semibold">{entry.value} units</span>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {/* Stock In: thin rounded bars in lime */}
                  <Bar
                    dataKey="in"
                    name="Stock In"
                    radius={[6, 6, 0, 0]}
                    barSize={14}
                    isAnimationActive={!prefersReducedMotion}
                    animationDuration={1000}
                    animationEasing="ease-out"
                  >
                    {monthlyMovement.map((_, index) => (
                      <Cell
                        key={`cell-in-${index}`}
                        fill="#D5F737"
                        fillOpacity={
                          hoveredBarIndex === null || hoveredBarIndex === index ? 1 : 0.35
                        }
                        className="transition-opacity duration-200"
                      />
                    ))}
                  </Bar>
                  {/* Stock Out: thin rounded bars in #5A5A5A */}
                  <Bar
                    dataKey="out"
                    name="Stock Out"
                    radius={[6, 6, 0, 0]}
                    barSize={14}
                    isAnimationActive={!prefersReducedMotion}
                    animationDuration={1000}
                    animationEasing="ease-out"
                  >
                    {monthlyMovement.map((_, index) => (
                      <Cell
                        key={`cell-out-${index}`}
                        fill="#5A5A5A"
                        fillOpacity={
                          hoveredBarIndex === null || hoveredBarIndex === index ? 1 : 0.35
                        }
                        className="transition-opacity duration-200"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-[#1C1C1C]/40 rounded-2xl border border-white/5">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#9A9A9A] mb-3">
                  <BarChart3 className="w-5 h-5 text-[#9A9A9A]" />
                </div>
                <div className="text-sm font-semibold text-white">No stock movements recorded</div>
                <p className="text-xs text-[#9A9A9A] max-w-xs mt-1">
                  Inflow and outflow graph will appear here once inventory adjustments or transactions take place.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Card: Inventory by Category Donut (lg:col-span-5) */}
        <div className="lg:col-span-5 p-5 sm:p-6 rounded-[24px] bg-[rgba(40,40,40,0.45)] backdrop-blur-[20px] saturate-[90%] border border-white/10 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-[#D5F737]/35 hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.6),0_0_20px_rgba(213,247,55,0.12)] flex flex-col justify-between">
          <div className="mb-4">
            <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">
              Inventory by Category
            </h2>
            <p className="text-xs text-[#9A9A9A] mt-0.5">
              Stock distribution across classes
            </p>
          </div>

          <div className="flex-1 flex flex-col sm:flex-row items-center justify-between gap-6">
            {hasCategoryData ? (
              <>
                {/* Donut Chart with total classes in center */}
                <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius="62%"
                        outerRadius="86%"
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                        isAnimationActive={!prefersReducedMotion}
                        animationDuration={1100}
                        animationEasing="ease-out"
                      >
                        {categoryDistribution.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                            fillOpacity={
                              activeDonutIndex === null || activeDonutIndex === index
                                ? 1
                                : 0.25
                            }
                            stroke="#181818"
                            strokeWidth={2}
                            className="transition-opacity duration-200 cursor-pointer"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const item = payload[0];
                            return (
                              <div className="p-2.5 rounded-xl bg-[rgba(35,35,35,0.92)] backdrop-blur-[16px] border border-white/10 shadow-xl text-xs">
                                <span className="font-semibold text-white">{item.name}</span>: {item.value} units
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Total classes in center */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl sm:text-2xl font-extrabold text-white">
                      {categoryDistribution.length}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-[#9A9A9A] font-semibold">
                      Classes
                    </span>
                  </div>
                </div>

                {/* Interactive Legend: Hovering a legend item highlights its segment */}
                <div className="w-full sm:flex-1 space-y-2">
                  {categoryDistribution.slice(0, 6).map((cat, idx) => {
                    const isHovered = activeDonutIndex === idx;
                    return (
                      <div
                        key={cat.name}
                        onMouseEnter={() => setActiveDonutIndex(idx)}
                        onMouseLeave={() => setActiveDonutIndex(null)}
                        className={`flex items-center justify-between p-1.5 px-2.5 rounded-xl transition-all cursor-pointer ${isHovered
                            ? 'bg-white/[0.08] text-white scale-[1.02]'
                            : 'text-[#9A9A9A] hover:bg-white/[0.04]'
                          }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-transform"
                            style={{
                              backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length],
                              transform: isHovered ? 'scale(1.2)' : 'scale(1)',
                            }}
                          />
                          <span className="text-xs truncate">{cat.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-white flex-shrink-0">
                          {cat.value}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="w-full h-48 sm:h-52 flex flex-col items-center justify-center text-center p-6 bg-[#1C1C1C]/40 rounded-2xl border border-white/5">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#9A9A9A] mb-3">
                  <PieChartIcon className="w-5 h-5 text-[#9A9A9A]" />
                </div>
                <div className="text-sm font-semibold text-white">No categories to display</div>
                <p className="text-xs text-[#9A9A9A] max-w-xs mt-1">
                  Category breakdown will appear here once items are created in the inventory catalog.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. ROW: RECENT ACTIVITY (~42%), STOCKOUT RISK (~33%) & STOCK HEALTH % (~25%) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Card: Recent Activity (lg:col-span-5) */}
        <div className="lg:col-span-5 p-5 sm:p-6 rounded-[24px] bg-[rgba(40,40,40,0.45)] backdrop-blur-[20px] saturate-[90%] border border-white/10 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-[#D5F737]/35 hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.6),0_0_20px_rgba(213,247,55,0.12)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                Recent Activity
              </h2>
              <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-white/[0.06] text-[#9A9A9A] border border-white/10">
                Latest 5
              </span>
            </div>

            {/* Refresh button */}
            <button
              onClick={fetchDashboardData}
              disabled={refreshing}
              className="text-[#9A9A9A] hover:text-[#D5F737] p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
              title="Refresh activity data"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#D5F737]' : ''}`}
              />
            </button>
          </div>

          {/* 5 Movements rendered in full without inner scroll, with stagger and hover highlight */}
          <div className="space-y-2.5">
            {recentActivity.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#9A9A9A] bg-[#1C1C1C]/40 rounded-2xl border border-white/5">
                No recent inventory movements recorded yet.
              </div>
            ) : (
              recentActivity.slice(0, 5).map((act, index) => {
                const isIn =
                  act.movementType === 'STOCK_IN' || act.movementType === 'ADJUSTMENT_ADD';
                return (
                  <motion.div
                    key={act._id}
                    initial={{ opacity: 0, x: prefersReducedMotion ? 0 : -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.3,
                      delay: prefersReducedMotion ? 0 : index * 0.06,
                      ease: 'easeOut',
                    }}
                    className="flex items-center justify-between p-3 rounded-2xl bg-[#1C1C1C] border border-white/5 hover:border-white/15 hover:bg-white/[0.04] transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      {/* Colored in/out icon */}
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${isIn
                            ? 'bg-[#D5F737]/15 text-[#D5F737] border border-[#D5F737]/30'
                            : 'bg-[#5A5A5A]/25 text-[#9A9A9A] border border-white/10'
                          }`}
                      >
                        {isIn ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-[#D5F737] transition-colors">
                          {act.productName}
                        </div>
                        <div className="text-[10px] text-[#9A9A9A] truncate mt-0.5">
                          {act.sku} • {act.referenceDocId || 'LOG'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 pl-2">
                      <div
                        className={`text-xs sm:text-sm font-bold ${isIn ? 'text-[#D5F737]' : 'text-[#9A9A9A]'
                          }`}
                      >
                        {isIn ? `+${act.quantity}` : `-${act.quantity}`} units
                      </div>
                      <div className="text-[10px] text-[#9A9A9A] mt-0.5">
                        {formatTimeAgo(act.createdAt)}
                      </div>
                    </div>
                  </motion.div>
                );
              }))}
          </div>
        </div>

        {/* Middle Card: Stockout Risk (lg:col-span-4) */}
        <div className="lg:col-span-4 p-5 sm:p-6 rounded-[24px] bg-[rgba(40,40,40,0.45)] backdrop-blur-[20px] saturate-[90%] border border-white/10 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-[#D5F737]/35 hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.6),0_0_20px_rgba(213,247,55,0.12)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Stockout Risk
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Forecast
              </span>
            </div>
            <Link
              to="/forecast"
              className="text-xs text-[#D5F737] hover:underline flex items-center gap-1 font-medium transition-colors"
            >
              View forecast
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5 flex-1 flex flex-col justify-center">
            {stockoutRisks.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#9A9A9A] bg-[#1C1C1C]/40 rounded-2xl border border-white/5 flex flex-col items-center justify-center gap-1.5 flex-1">
                <CheckCircle className="w-5 h-5 text-emerald-400/80 mb-0.5" />
                <span>No forecast data or imminent stockouts</span>
                <span className="text-[10px] text-[#7A7A7A]">All products have healthy inventory cover</span>
              </div>
            ) : (
              stockoutRisks.slice(0, 3).map((item: any) => {
                const days = item.daysLeft ?? 0;
                const barPercent = Math.min(100, Math.max(8, (days / 30) * 100));
                const isCritical = days <= 3 || item.risk === 'critical';
                const barColor = isCritical ? 'bg-rose-500' : 'bg-amber-400';
                const badgeColor = isCritical
                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30';

                return (
                  <div
                    key={item.productId || item.sku}
                    className="p-3 rounded-2xl bg-[#1C1C1C] border border-white/5 hover:border-white/15 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="min-w-0 pr-2">
                        <div className="text-xs sm:text-sm font-semibold text-white truncate">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-[#9A9A9A] truncate">
                          {item.sku} • {item.stock} in stock
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${badgeColor}`}>
                        ~{days}d left
                      </span>
                    </div>
                    {/* Days-left progress bar */}
                    <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${barPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Card: Stock Health % (lg:col-span-3) */}
        <div className="lg:col-span-3 p-5 sm:p-6 rounded-[24px] bg-[rgba(40,40,40,0.45)] backdrop-blur-[20px] saturate-[90%] border border-white/10 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-[#D5F737]/35 hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.6),0_0_20px_rgba(213,247,55,0.12)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                Stock Health
              </h2>
              <p className="text-xs text-[#9A9A9A] mt-0.5">
                Catalog reliability
              </p>
            </div>
            {/* Optimal Target Label */}
            <span className="text-[10px] font-semibold text-[#D5F737] bg-[#D5F737]/10 px-2.5 py-1 rounded-full border border-[#D5F737]/25">
              Target 85%
            </span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-2 text-center">
            {/* Animated Ring */}
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Track */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className="text-white/10"
                  strokeWidth="8"
                  stroke="currentColor"
                  fill="transparent"
                />
                {/* Animated Progress Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  stroke="#D5F737"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>

              {/* Number counts up in the center */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-white tracking-tight">
                  <NumberTicker value={displayStockHealth} className="text-white" />%
                </span>
                <span className="text-[9px] uppercase tracking-wider text-[#9A9A9A] font-semibold">
                  Health
                </span>
              </div>
            </div>

            {/* Target description and status */}
            <div className="flex flex-col justify-center space-y-1.5 text-center">
              <div className="text-xs font-semibold text-white">
                Buffer Ratio
              </div>
              <p className="text-[11px] text-[#9A9A9A] leading-relaxed max-w-[200px]">
                {kpis.totalProducts > 0
                  ? `${kpis.totalProducts - kpis.lowStock - kpis.outOfStock} of ${kpis.totalProducts} products in safe buffer.`
                  : 'No active products in catalog.'}
              </p>
              <div className="inline-flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-medium pt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {kpis.totalProducts > 0 ? 'Fulfillment Stable' : 'Catalog Ready'}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
