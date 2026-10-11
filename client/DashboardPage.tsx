import React, { useState, useEffect } from 'react';
import {
  Package,
  IndianRupee,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  SlidersHorizontal,
  CheckCircle2
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
  Cell
} from 'recharts';
import { GlassCard } from '@/components/ui/GlassCard';
import { NumberTicker } from '@/components/ui/number-ticker';
import { BlurFade } from '@/components/ui/blur-fade';
import api from '@/lib/axios';

// Curated lime, olive and dim bar palette for Charts
const LIME_GREEN_PALETTE = [
  '#D5F737', // Accent Lime
  '#5A632B', // Olive
  '#404040', // Dim bar
  '#84CC16', // Olive Lime
  '#2BB4A0', // Emerald Teal
  '#A3E635', // Apple Lime
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

// Fallback baseline data if API is loading
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

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData>(DEFAULT_DATA);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/api/dashboard/summary');
      const payload = res.data.data || res.data;
      if (payload && payload.kpis) {
        setData({
          kpis: {
            totalProducts: payload.kpis.totalProducts ?? payload.kpis.totalProductsCount ?? 25,
            stockValue: payload.kpis.stockValue ?? payload.kpis.stockValueINR ?? payload.kpis.totalInventoryValueINR ?? 0,
            lowStock: payload.kpis.lowStock ?? payload.kpis.lowStockCount ?? 4,
            outOfStock: payload.kpis.outOfStock ?? payload.kpis.outOfStockCount ?? 2,
            stockHealth: payload.kpis.stockHealth ?? payload.stockHealth ?? 76,
          },
          categoryDistribution: payload.categoryDistribution || DEFAULT_DATA.categoryDistribution,
          monthlyMovement: payload.monthlyMovement || DEFAULT_DATA.monthlyMovement,
          recentActivity: payload.recentActivity || DEFAULT_DATA.recentActivity,
          stockHealth: payload.stockHealth ?? payload.kpis.stockHealth ?? 76,
        });
      }
    } catch (err) {
      console.warn('Dashboard summary fetch failed, using realistic fallback:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const { kpis, categoryDistribution, monthlyMovement, recentActivity, stockHealth } = data;

  // Circular progress math
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * Math.min(100, Math.max(0, stockHealth))) / 100;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Just now';
    const diffHours = Math.round((Date.now() - new Date(dateStr).getTime()) / 3600000);
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="h-full max-h-full w-full overflow-hidden flex flex-col p-3.5 sm:p-4 md:p-5 gap-3 sm:gap-3.5 bg-[#181818] text-white font-['Outfit',sans-serif]">
      {/* TOP ROW: 4 KPI GLASSCARDS USING NUMBER TICKER */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 flex-shrink-0">
        {/* KPI 1: Total Products */}
        <BlurFade delay={0.04} inView>
          <GlassCard className="p-3.5 sm:p-4 flex items-center justify-between shadow-lg h-full">
            <div>
              <span className="text-[10px] sm:text-xs text-[#9A9A9A] font-medium uppercase tracking-wider block">
                Total Products
              </span>
              <div className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
                <NumberTicker value={kpis.totalProducts} className="text-white" />
              </div>
              <span className="text-[10px] text-[#D5F737] font-medium mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Catalog Active
              </span>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#D5F737]/15 border border-[#D5F737]/25 flex items-center justify-center text-[#D5F737] flex-shrink-0">
              <Package className="w-5 h-5" />
            </div>
          </GlassCard>
        </BlurFade>

        {/* KPI 2: Stock Value (₹) */}
        <BlurFade delay={0.08} inView>
          <GlassCard className="p-3.5 sm:p-4 border border-white/10 bg-white/[0.06] backdrop-blur-[16px] rounded-[20px] flex items-center justify-between shadow-lg h-full">
            <div>
              <span className="text-[10px] sm:text-xs text-[#9A9A9A] font-medium uppercase tracking-wider block">
                Stock Value (₹)
              </span>
              <div className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1 flex items-center">
                <span>₹</span>
                <NumberTicker value={kpis.stockValue} className="text-white" />
              </div>
              <span className="text-[10px] text-emerald-400 font-medium mt-0.5 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Net Inventory
              </span>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <IndianRupee className="w-5 h-5" />
            </div>
          </GlassCard>
        </BlurFade>

        {/* KPI 3: Low Stock */}
        <BlurFade delay={0.12} inView>
          <GlassCard className="p-3.5 sm:p-4 border border-white/10 bg-white/[0.06] backdrop-blur-[16px] rounded-[20px] flex items-center justify-between shadow-lg h-full">
            <div>
              <span className="text-[10px] sm:text-xs text-[#9A9A9A] font-medium uppercase tracking-wider block">
                Low Stock
              </span>
              <div className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
                <NumberTicker value={kpis.lowStock} className="text-white" />
              </div>
              <span className="text-[10px] text-amber-400 font-medium mt-0.5 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Reorder Triggered
              </span>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </GlassCard>
        </BlurFade>

        {/* KPI 4: Out of Stock */}
        <BlurFade delay={0.16} inView>
          <GlassCard className="p-3.5 sm:p-4 border border-white/10 bg-white/[0.06] backdrop-blur-[16px] rounded-[20px] flex items-center justify-between shadow-lg h-full">
            <div>
              <span className="text-[10px] sm:text-xs text-[#9A9A9A] font-medium uppercase tracking-wider block">
                Out of Stock
              </span>
              <div className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
                <NumberTicker value={kpis.outOfStock} className="text-white" />
              </div>
              <span className="text-[10px] text-rose-400 font-medium mt-0.5 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> 0 Units Left
              </span>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center text-rose-400 flex-shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
          </GlassCard>
        </BlurFade>
      </div>

      {/* MIDDLE ROW: CHARTS (STOCK MOVEMENT BAR CHART + CATEGORY DONUT CHART) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-3.5 flex-1 min-h-0 overflow-hidden">
        {/* Middle Left: Bar Chart "Stock Movement" with lime bars (Recharts, last 6 months) */}
        <div className="lg:col-span-7 h-full min-h-0">
          <BlurFade delay={0.2} inView className="h-full">
            <GlassCard className="h-full p-3.5 sm:p-4 border border-white/10 bg-white/[0.06] backdrop-blur-[16px] rounded-[20px] flex flex-col justify-between shadow-lg overflow-hidden">
              <div className="flex items-center justify-between mb-2 flex-shrink-0">
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-white tracking-tight">Stock Movement</h3>
                  <p className="text-[10px] sm:text-[11px] text-[#9A9A9A]">Last 6 months inflow & outflow</p>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#D5F737]" />
                    <span className="text-white">Stock In</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#404040]" />
                    <span className="text-[#9A9A9A]">Stock Out</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyMovement} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                      dataKey="month"
                      stroke="#9A9A9A"
                      tick={{ fill: '#9A9A9A', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#9A9A9A"
                      tick={{ fill: '#9A9A9A', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#232323',
                        borderColor: 'rgba(255,255,255,0.10)',
                        borderRadius: '12px',
                        fontSize: '11px',
                        color: '#FFFFFF',
                      }}
                      itemStyle={{ color: '#FFFFFF' }}
                      labelStyle={{ color: '#D5F737', fontWeight: 600 }}
                    />
                    <Bar dataKey="in" name="Stock In" fill="#D5F737" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="out" name="Stock Out" fill="#404040" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </BlurFade>
        </div>

        {/* Middle Right: Donut Chart "Inventory by Category" with lime and green shades */}
        <div className="lg:col-span-5 h-full min-h-0">
          <BlurFade delay={0.24} inView className="h-full">
            <GlassCard className="h-full p-3.5 sm:p-4 border border-white/10 bg-white/[0.06] backdrop-blur-[16px] rounded-[20px] flex flex-col justify-between shadow-lg overflow-hidden">
              <div className="flex items-center justify-between mb-1 flex-shrink-0">
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-white tracking-tight">Inventory by Category</h3>
                  <p className="text-[10px] sm:text-[11px] text-[#9A9A9A]">Volume distribution across product classes</p>
                </div>
              </div>

              <div className="flex-1 w-full min-h-0 flex items-center justify-between">
                {/* Donut Chart */}
                <div className="w-1/2 h-full min-h-0 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius="55%"
                        outerRadius="80%"
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                      >
                        {categoryDistribution.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={LIME_GREEN_PALETTE[index % LIME_GREEN_PALETTE.length]}
                            stroke="#232323"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#232323',
                          borderColor: 'rgba(255,255,255,0.10)',
                          borderRadius: '12px',
                          fontSize: '11px',
                          color: '#FFFFFF',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Stat */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs sm:text-sm font-bold text-white">{categoryDistribution.length}</span>
                    <span className="text-[8px] sm:text-[9px] text-[#9A9A9A] uppercase tracking-wider">Classes</span>
                  </div>
                </div>

                {/* Legend List */}
                <div className="w-1/2 pl-3 space-y-1.5 overflow-y-auto max-h-full">
                  {categoryDistribution.slice(0, 5).map((cat, idx) => (
                    <div key={cat.name} className="flex items-center justify-between text-[10px] sm:text-[11px]">
                      <div className="flex items-center gap-1.5 truncate pr-1">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: LIME_GREEN_PALETTE[idx % LIME_GREEN_PALETTE.length] }}
                        />
                        <span className="text-[#9A9A9A] truncate">{cat.name}</span>
                      </div>
                      <span className="font-semibold text-white flex-shrink-0">{cat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </BlurFade>
        </div>
      </div>

      {/* BOTTOM ROW: RECENT ACTIVITY LIST (LAST 5) + CIRCULAR PROGRESS "STOCK HEALTH %" */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-3.5 h-[175px] sm:h-[185px] flex-shrink-0 overflow-hidden">
        {/* Bottom Left: Recent Activity list (last 5 stock movements) */}
        <div className="lg:col-span-8 h-full min-h-0">
          <BlurFade delay={0.28} inView className="h-full">
            <GlassCard className="h-full p-3.5 sm:p-4 border border-white/10 bg-white/[0.06] backdrop-blur-[16px] rounded-[20px] flex flex-col shadow-lg overflow-hidden">
              <div className="flex items-center justify-between mb-2 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-semibold text-white tracking-tight">Recent Activity</h3>
                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.05] text-[#9A9A9A] border border-white/10">
                    Latest 5 movements
                  </span>
                </div>
                <button
                  onClick={fetchDashboardData}
                  disabled={refreshing}
                  className="text-[#9A9A9A] hover:text-[#D5F737] transition-colors p-1"
                  title="Refresh activity logs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Activity Rows */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {recentActivity.map((act) => {
                  const isIn = act.movementType === 'STOCK_IN' || act.movementType === 'ADJUSTMENT_ADD';
                  return (
                    <div
                      key={act._id}
                      className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-colors"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            isIn
                              ? 'bg-[#D5F737]/15 text-[#D5F737] border border-[#D5F737]/30'
                              : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                          }`}
                        >
                          {isIn ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-medium text-white truncate">{act.productName}</div>
                          <div className="text-[9px] text-[#9A9A9A]">{act.sku} • {act.referenceDocId || 'LOG'}</div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 pl-2">
                        <div className={`text-xs font-semibold ${isIn ? 'text-[#D5F737]' : 'text-cyan-400'}`}>
                          {isIn ? `+${act.quantity}` : `-${act.quantity}`} units
                        </div>
                        <div className="text-[9px] text-[#9A9A9A]">{formatTimeAgo(act.createdAt)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </BlurFade>
        </div>

        {/* Bottom Right: Circular progress "Stock Health %" */}
        <div className="lg:col-span-4 h-full min-h-0">
          <BlurFade delay={0.32} inView className="h-full">
            <GlassCard className="h-full p-3.5 sm:p-4 flex flex-col justify-between shadow-lg overflow-hidden">
              <div className="flex items-center justify-between flex-shrink-0">
                <span className="text-xs font-semibold text-white tracking-tight">Stock Health %</span>
                <span className="text-[10px] font-semibold text-[#D5F737] bg-[#D5F737]/10 px-2 py-0.5 rounded-full border border-[#D5F737]/25">
                  Optimal Target: 85%
                </span>
              </div>

              {/* Circular Progress Ring */}
              <div className="flex-1 flex items-center justify-center gap-4 min-h-0">
                <div className="relative w-20 h-20 flex-shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 90 90">
                    {/* Track */}
                    <circle
                      cx="45"
                      cy="45"
                      r={radius}
                      className="text-white/10"
                      strokeWidth="8"
                      stroke="currentColor"
                      fill="transparent"
                    />
                    {/* Progress Indicator */}
                    <circle
                      cx="45"
                      cy="45"
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
                  {/* Inside Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-base sm:text-lg font-extrabold text-white">
                      <NumberTicker value={stockHealth} className="text-white" />%
                    </span>
                  </div>
                </div>

                <div className="flex flex-col justify-center">
                  <div className="text-xs font-semibold text-white">Ratio Quality</div>
                  <div className="text-[10px] text-[#9A9A9A] leading-tight mt-0.5">
                    {kpis.totalProducts - kpis.lowStock - kpis.outOfStock} of {kpis.totalProducts} products in safe buffer inventory
                  </div>
                  <div className="text-[10px] text-emerald-400 font-medium mt-1">
                    ● Stable fulfillment
                  </div>
                </div>
              </div>
            </GlassCard>
          </BlurFade>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
