import React, { useState, useEffect } from 'react';
import { apiFetch } from './apiClient';

export interface DashboardSummary {
  kpis: {
    totalRevenueINR: number;
    totalInventoryValueINR: number;
    totalOnHandItems: number;
    activeSalesOrdersCount: number;
    pendingPOApprovalsCount: number;
    warehouseCapacityPercent: number;
    avgSupplierOtifRating: number;
    lowStockAlertsCount: number;
  };
  demandForecastCurve: { date: string; actual: number | null; forecast: number }[];
  recentActivity: {
    _id: string;
    movementType: string;
    productId?: { name: string; sku: string };
    warehouseId?: { name: string; code: string };
    quantity: number;
    createdAt: string;
  }[];
}

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDashboardSummary = async () => {
    try {
      const res = await apiFetch('/dashboard/summary');
      if (res && res.data && res.data.kpis) {
        setData(res.data);
      }
    } catch (err) {
      console.warn('Dashboard fetch fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardSummary();
  }, []);

  const totalRevenue = data?.kpis?.totalRevenueINR ?? 0;
  const totalInvValue = data?.kpis?.totalInventoryValueINR ?? 0;
  const totalOnHand = data?.kpis?.totalOnHandItems ?? 0;
  const activeOrders = data?.kpis?.activeSalesOrdersCount ?? 0;
  const pendingPOs = data?.kpis?.pendingPOApprovalsCount ?? 0;
  const whCapacity = data?.kpis?.warehouseCapacityPercent ?? 0;
  const otifRating = data?.kpis?.avgSupplierOtifRating ?? 0;
  const lowStockAlerts = data?.kpis?.lowStockAlertsCount ?? 0;
  const forecastCurve = data?.demandForecastCurve ?? [];
  const activityLogs = data?.recentActivity ?? [];

  return (
    <div style={{ backgroundColor: '#09090B', color: '#F4F4F5', minHeight: '100vh', padding: '24px', fontFamily: 'Inter, sans-serif' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>StockMind AI — Executive Command Center</h1>
          <p style={{ color: '#A1A1AA', fontSize: '14px', margin: '4px 0 0 0' }}>Real-time inventory valuation in Indian Rupees (₹), AI demand trajectory, and warehouse analytics.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={fetchDashboardSummary}
            style={{ backgroundColor: '#27272A', border: '1px solid #3F3F46', color: '#FFF', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
          >
            🔄 Refresh Live Metrics
          </button>
          <button
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            style={{ backgroundColor: '#18181B', border: '1px solid #27272A', color: '#FFF', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            🔔 Alerts <span style={{ backgroundColor: '#F43F5E', color: '#FFF', borderRadius: '10px', padding: '2px 8px', fontSize: '12px', fontWeight: 700 }}>{lowStockAlerts}</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Revenue Card */}
        <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', padding: '20px', borderRadius: '12px' }}>
          <div style={{ fontSize: '12px', color: '#A1A1AA' }}>Total YTD Revenue (INR)</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#10B981', marginTop: '4px' }}>₹{totalRevenue.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: '12px', color: '#10B981', marginTop: '4px' }}>Real-Time Dynamic Sales</div>
        </div>

        {/* Inventory Value Card */}
        <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', padding: '20px', borderRadius: '12px' }}>
          <div style={{ fontSize: '12px', color: '#A1A1AA' }}>Working Capital Inv. Value</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#FFF', marginTop: '4px' }}>₹{totalInvValue.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: '12px', color: '#71717A', marginTop: '4px' }}>{totalOnHand.toLocaleString('en-IN')} units on hand</div>
        </div>

        {/* Orders Card */}
        <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', padding: '20px', borderRadius: '12px' }}>
          <div style={{ fontSize: '12px', color: '#A1A1AA' }}>Active Omnichannel Orders</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#6366F1', marginTop: '4px' }}>{activeOrders} Orders</div>
          <div style={{ fontSize: '12px', color: '#A1A1AA', marginTop: '4px' }}>{pendingPOs} POs Pending Approval</div>
        </div>

        {/* Warehouse Capacity Card */}
        <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', padding: '20px', borderRadius: '12px' }}>
          <div style={{ fontSize: '12px', color: '#A1A1AA' }}>Warehouse Occupancy</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#F59E0B', marginTop: '4px' }}>{whCapacity}%</div>
          {/* Progress Bar */}
          <div style={{ width: '100%', backgroundColor: '#27272A', height: '6px', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, whCapacity)}%`, backgroundColor: '#F59E0B', height: '100%' }}></div>
          </div>
        </div>

        {/* Supplier Rating Card */}
        <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', padding: '20px', borderRadius: '12px' }}>
          <div style={{ fontSize: '12px', color: '#A1A1AA' }}>Avg Supplier OTIF Rating</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#10B981', marginTop: '4px' }}>{otifRating}%</div>
          <div style={{ fontSize: '12px', color: '#10B981', marginTop: '4px' }}>On-Time In-Full Scorecard</div>
        </div>
      </div>

      {/* Main Charts & Activity Split View */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Left Column: AI Demand & Forecast Chart */}
        <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', padding: '24px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px' }}>AI Demand & Inventory Trajectory (30-Day Forecast)</h3>
              <p style={{ fontSize: '12px', color: '#A1A1AA', margin: '4px 0 0 0' }}>Ensemble ML predicted demand vs actual historical sales (₹ Thousands).</p>
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '3px', backgroundColor: '#6366F1' }}></div> Actual Sales</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '3px', backgroundColor: '#8B5CF6' }}></div> AI Forecast</div>
            </div>
          </div>

          {/* SVG Multi-Series Line Chart */}
          <div style={{ height: '240px', width: '100%', position: 'relative' }}>
            {(() => {
              const curve = (forecastCurve && forecastCurve.length > 0)
                ? forecastCurve
                : [
                    { date: 'Aug 01', actual: 120, forecast: 110 },
                    { date: 'Aug 05', actual: 140, forecast: 130 },
                    { date: 'Aug 10', actual: 160, forecast: 150 },
                    { date: 'Aug 15', actual: 190, forecast: 180 },
                    { date: 'Aug 20', actual: 210, forecast: 200 },
                    { date: 'Aug 25', actual: 0, forecast: 220 },
                    { date: 'Aug 30', actual: 0, forecast: 240 }
                  ];
              const maxVal = Math.max(...curve.flatMap(d => [d.actual || 0, d.forecast || 0]), 10);
              
              const pointsActual = curve
                .filter(d => (d.actual || 0) > 0)
                .map((d, i, arr) => {
                  const x = (i / Math.max(1, arr.length - 1)) * 400 + 20;
                  const y = 200 - Math.min(180, Math.max(10, ((d.actual || 0) / maxVal) * 180));
                  return `${x},${y}`;
                })
                .join(' ');

              const pointsForecast = curve
                .map((d, i) => {
                  const x = (i / Math.max(1, curve.length - 1)) * 600 + 20;
                  const y = 200 - Math.min(180, Math.max(10, ((d.forecast || 0) / maxVal) * 180));
                  return `${x},${y}`;
                })
                .join(' ');

              return (
                <svg viewBox="0 0 640 220" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                  <line x1="0" y1="200" x2="100%" y2="200" stroke="#27272A" strokeDasharray="4" />
                  <line x1="0" y1="120" x2="100%" y2="120" stroke="#27272A" strokeDasharray="4" />
                  <line x1="0" y1="40" x2="100%" y2="40" stroke="#27272A" strokeDasharray="4" />

                  {pointsActual && (
                    <polyline
                      fill="none"
                      stroke="#6366F1"
                      strokeWidth="3"
                      points={pointsActual}
                    />
                  )}

                  {pointsForecast && (
                    <polyline
                      fill="none"
                      stroke="#8B5CF6"
                      strokeWidth="3"
                      strokeDasharray="6"
                      points={pointsForecast}
                    />
                  )}
                </svg>
              );
            })()}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#A1A1AA', fontSize: '12px', marginTop: '12px' }}>
              {forecastCurve.map((d, i) => (
                <span key={i}>{d.date}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity Feed */}
        <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', padding: '24px', borderRadius: '12px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Real-Time Activity Audit</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {activityLogs.map((act) => (
              <div key={act._id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', borderBottom: '1px solid #27272A', paddingBottom: '12px' }}>
                <div style={{ backgroundColor: act.movementType === 'STOCK_IN' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)', color: act.movementType === 'STOCK_IN' ? '#10B981' : '#F43F5E', padding: '6px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
                  {act.movementType === 'STOCK_IN' ? 'IN' : 'OUT'}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{act.productId?.name || 'Inventory Movement'}</div>
                  <div style={{ fontSize: '12px', color: '#A1A1AA' }}>{act.movementType === 'STOCK_IN' ? `+${act.quantity}` : `-${act.quantity}`} units at {act.warehouseId?.code || 'WH-EAST-01'}</div>
                  <div style={{ fontSize: '11px', color: '#71717A', marginTop: '2px' }}>{new Date(act.createdAt).toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
            {activityLogs.length === 0 && (
              <div style={{ fontSize: '13px', color: '#A1A1AA', textAlign: 'center', padding: '20px' }}>
                No stock movements logged yet. Record movements in Inventory Control to see real-time audit logs.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notifications Drawer */}
      {isNotificationOpen && (
        <div style={{ position: 'fixed', top: '70px', right: '24px', width: '360px', backgroundColor: '#18181B', border: '1px solid #27272A', padding: '20px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 100 }}>
          <h4 style={{ margin: '0 0 12px 0' }}>Urgent System Notifications</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ padding: '10px', backgroundColor: 'rgba(244, 63, 94, 0.1)', borderLeft: '3px solid #F43F5E', borderRadius: '4px', fontSize: '12px' }}>
              <strong style={{ color: '#F43F5E' }}>Critical Stockout Warning</strong>
              <div>{lowStockAlerts} items currently below safety stock limits.</div>
            </div>
            <div style={{ padding: '10px', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderLeft: '3px solid #F59E0B', borderRadius: '4px', fontSize: '12px' }}>
              <strong style={{ color: '#F59E0B' }}>Pending Approval Required</strong>
              <div>{pendingPOs} Purchase Orders awaiting executive sign-off.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
