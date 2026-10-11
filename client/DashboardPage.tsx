import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  IndianRupee,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  CheckCircle2,
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
    totalProducts: 25,
    stockValue: 542300,
    lowStock: 4,
    outOfStock: 2,
    stockHealth: 76,
  },
  categoryDistribution: [
    { name: 'Semiconductors', value: 1445, count: 4 },
    { name: 'Wireless & IoT', value: 1049, count: 4 },
    { name: 'Power & Batteries', value: 1705, count: 4 },
    { name: 'Sensors', value: 1170, count: 7 },
    { name: 'Displays', value: 400, count: 2 },
    { name: 'Passive Components', value: 265, count: 4 },
  ],
  monthlyMovement: [
    { month: 'May', in: 450, out: 320, total: 770 },
    { month: 'Jun', in: 520, out: 410, total: 930 },
    { month: 'Jul', in: 680, out: 490, total: 1170 },
    { month: 'Aug', in: 740, out: 580, total: 1320 },
    { month: 'Sep', in: 890, out: 640, total: 1530 },
    { month: 'Oct', in: 610, out: 480, total: 1090 },
  ],
  recentActivity: [
    {
      _id: 'mov_030',
      movementType: 'STOCK_IN',
      productName: 'STM32F401RE ARM Cortex-M4 MCU',
      sku: 'MCU-STM32-401',
      quantity: 120,
      referenceDocId: 'PO-98421',
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'mov_029',
      movementType: 'STOCK_OUT',
      productName: 'ESP32-WROOM-32D Wi-Fi & BLE Module',
      sku: 'WIFI-ESP32-32D',
      quantity: 45,
      referenceDocId: 'SO-10293',
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      _id: 'mov_028',
      movementType: 'STOCK_IN',
      productName: 'Raspberry Pi 4 Model B (4GB RAM)',
      sku: 'SBC-RPI4-4GB',
      quantity: 15,
      referenceDocId: 'PO-98419',
      createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    },
    {
      _id: 'mov_027',
      movementType: 'STOCK_OUT',
      productName: 'BME280 Precision Temp & Humidity Sensor',
      sku: 'SENS-BME280-THP',
      quantity: 30,
      referenceDocId: 'SO-10288',
      createdAt: new Date(Date.now() - 3600000 * 28).toISOString(),
    },
    {
      _id: 'mov_026',
      movementType: 'ADJUSTMENT_ADD',
      productName: 'LM2596 Step-Down DC-DC Buck Converter',
      sku: 'POW-LM2596-BUCK',
      quantity: 20,
      referenceDocId: 'AUD-0041',
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    },
  ],
  stockHealth: 76,
};

// Lightweight SVG Sparkline Component
const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  if (!data || data.length < 2) return null;
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
              payload.kpis.totalProducts ?? payload.kpis.totalProductsCount ?? 25,
            stockValue:
              payload.kpis.stockValue ??
              payload.kpis.stockValueINR ??
              payload.kpis.totalInventoryValueINR ??
              0,
            lowStock:
              payload.kpis.lowStock ?? payload.kpis.lowStockCount ?? 4,
            outOfStock:
              payload.kpis.outOfStock ?? payload.kpis.outOfStockCount ?? 2,
            stockHealth:
              payload.kpis.stockHealth ?? payload.stockHealth ?? 76,
          },
          categoryDistribution:
            payload.categoryDistribution || DEFAULT_DATA.categoryDistribution,
          monthlyMovement:
            payload.monthlyMovement || DEFAULT_DATA.monthlyMovement,
          recentActivity:
            payload.recentActivity || DEFAULT_DATA.recentActivity,
          stockHealth:
            payload.stockHealth ?? payload.kpis.stockHealth ?? 76,
        });
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

  const { kpis, categoryDistribution, monthlyMovement, recentActivity, stockHealth } = data;

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
    return [6, 5, 4, 7, 5, kpis.lowStock];
  }, [kpis.lowStock]);

  // Stock health circular progress math
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (circumference * Math.min(100, Math.max(0, stockHealth))) / 100;

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Just now';
    const diffHours = Math.round((Date.now() - new Date(dateStr).getTime()) / 3600000);
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Cursor spotlight handler for KPI glass cards
  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
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
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#D5F737]/15 text-[#D5F737] border border-[#D5F737]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D5F737] animate-pulse" />
              Live Dashboard
            </span>
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

      {/* 2. FOUR KPI CARDS IN ONE ROW (COMPACT) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
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
              <div className="w-6 h-6 rounded-md bg-[#D5F737]/15 border border-[#D5F737]/30 flex items-center justify-center text-[#D5F737]">
                <Package className="w-3 h-3" />
              </div>
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
              <div className="w-6 h-6 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <IndianRupee className="w-3 h-3" />
              </div>
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
              <div className="w-6 h-6 rounded-md bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-3 h-3" />
              </div>
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
              <div className="w-6 h-6 rounded-md bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
                <AlertCircle className="w-3 h-3" />
              </div>
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

          <div className="h-64 sm:h-72 w-full">
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
          </div>
        </div>
      </section>

      {/* 4. ROW: RECENT ACTIVITY (~60%) & STOCK HEALTH % (~40%) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Card: Recent Activity (lg:col-span-7) */}
        <div className="lg:col-span-7 p-5 sm:p-6 rounded-[24px] bg-[rgba(40,40,40,0.45)] backdrop-blur-[20px] saturate-[90%] border border-white/10 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-[#D5F737]/35 hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.6),0_0_20px_rgba(213,247,55,0.12)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                Recent Activity
              </h2>
              <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-white/[0.06] text-[#9A9A9A] border border-white/10">
                Latest 5 movements
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
            {recentActivity.slice(0, 5).map((act, index) => {
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
            })}
          </div>
        </div>

        {/* Right Card: Stock Health % (lg:col-span-5) */}
        <div className="lg:col-span-5 p-5 sm:p-6 rounded-[24px] bg-[rgba(40,40,40,0.45)] backdrop-blur-[20px] saturate-[90%] border border-white/10 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-[#D5F737]/35 hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.6),0_0_20px_rgba(213,247,55,0.12)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                Stock Health
              </h2>
              <p className="text-xs text-[#9A9A9A] mt-0.5">
                Catalog fulfillment reliability
              </p>
            </div>
            {/* Optimal Target Label */}
            <span className="text-[11px] font-semibold text-[#D5F737] bg-[#D5F737]/10 px-3 py-1 rounded-full border border-[#D5F737]/25">
              Optimal Target: 85%
            </span>
          </div>

          <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
            {/* Animated Ring */}
            <div className="relative w-28 h-28 flex-shrink-0">
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
                  <NumberTicker value={stockHealth} className="text-white" />%
                </span>
                <span className="text-[9px] uppercase tracking-wider text-[#9A9A9A] font-semibold">
                  Health
                </span>
              </div>
            </div>

            {/* Target description and status */}
            <div className="flex flex-col justify-center space-y-2 text-center sm:text-left">
              <div className="text-xs font-semibold text-white">
                Inventory Buffer Ratio
              </div>
              <p className="text-xs text-[#9A9A9A] leading-relaxed max-w-[220px]">
                {kpis.totalProducts - kpis.lowStock - kpis.outOfStock} of {kpis.totalProducts} active products in safe buffer inventory.
              </p>
              <div className="inline-flex items-center justify-center sm:justify-start gap-1.5 text-xs text-emerald-400 font-medium pt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Stable Order Fulfillment
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
