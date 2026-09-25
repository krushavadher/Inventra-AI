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
    <div style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)', minHeight: '100vh', padding: '32px 40px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 className="page-title">Executive Command Center</h1>
          <p className="subtext-muted" style={{ marginTop: '4px' }}>Real-time inventory valuation in Indian Rupees (₹), AI demand trajectory, and warehouse analytics.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={fetchDashboardSummary}
            className="btn-secondary"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
            Refresh Metrics
          </button>
          <button
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            className="btn-primary"
            style={{ position: 'relative' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            Alerts
            <span className="badge badge-danger" style={{ padding: '1px 6px', fontSize: '10px', marginLeft: '4px' }}>{lowStockAlerts}</span>
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="glass-card" style={{ padding: '20px', height: '110px' }}>
              <div className="skeleton-box" style={{ width: '40%', height: '12px', marginBottom: '12px' }} />
              <div className="skeleton-box" style={{ width: '70%', height: '28px', marginBottom: '8px' }} />
              <div className="skeleton-box" style={{ width: '50%', height: '10px' }} />
            </div>
          ))}
        </div>
      ) : (
        /* KPI Metric Cards Grid - No chrome/borders */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '32px', marginBottom: '40px' }}>
          {/* Revenue Card (Hero Metric 1) */}
          <div>
            <div className="kpi-label">Total YTD Revenue (INR)</div>
            <div className="kpi-value-hero" style={{ marginTop: '6px' }}>₹{totalRevenue.toLocaleString('en-IN')}</div>
            <div style={{ marginTop: '8px' }}>
              <span className="badge badge-success">● Real-Time Sales</span>
            </div>
          </div>

          {/* Inventory Value Card */}
          <div>
            <div className="kpi-label">Working Capital Inv. Value</div>
            <div className="kpi-value" style={{ marginTop: '6px' }}>₹{totalInvValue.toLocaleString('en-IN')}</div>
            <div className="subtext-muted" style={{ marginTop: '8px' }}>{totalOnHand.toLocaleString('en-IN')} units on hand</div>
          </div>

          {/* Orders Card (Hero Metric 2) */}
          <div>
            <div className="kpi-label">Active Omnichannel Orders</div>
            <div className="kpi-value-hero" style={{ marginTop: '6px' }}>{activeOrders}</div>
            <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
              <span className="badge badge-warning">{pendingPOs} POs Pending</span>
            </div>
          </div>

          {/* Warehouse Capacity Card */}
          <div>
            <div className="kpi-label">Warehouse Occupancy</div>
            <div className="kpi-value" style={{ color: whCapacity > 85 ? 'var(--accent-risk)' : 'var(--accent-primary)', marginTop: '6px' }}>{whCapacity}%</div>
            {/* Minimal Progress Bar */}
            <div style={{ width: '100%', backgroundColor: 'var(--border)', height: '4px', borderRadius: '2px', marginTop: '10px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, whCapacity)}%`, backgroundColor: whCapacity > 85 ? 'var(--accent-risk)' : 'var(--accent-primary)', height: '100%', transition: 'width 0.4s ease' }} />
            </div>
          </div>

          {/* Supplier Rating Card */}
          <div>
            <div className="kpi-label">Avg Supplier OTIF Rating</div>
            <div className="kpi-value" style={{ color: 'var(--accent-cool)', marginTop: '6px' }}>{otifRating}%</div>
            <div style={{ marginTop: '8px' }}>
              <span className="badge badge-success">On-Time In-Full Score</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Charts & Activity Split View */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Left Column: AI Demand & Forecast Chart */}
        <div className="panel-bordered">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h3 className="section-title">Demand & Inventory Trajectory</h3>
              <p className="subtext-muted" style={{ marginTop: '2px' }}>Ensemble ML predicted demand vs actual historical sales (₹ Thousands).</p>
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
              {/* Legend kept as backup, but labels will be drawn on chart too */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: 'var(--accent-cool)' }} /> Actual Sales
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '2px', border: '2px dashed var(--accent-primary)', backgroundColor: 'transparent' }} /> AI Forecast
              </div>
            </div>
          </div>

          {/* SVG Multi-Series Line Chart with Refined Gridlines */}
          <div style={{ height: '250px', width: '100%', position: 'relative' }}>
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

              const actualCurve = curve.filter(d => (d.actual || 0) > 0);
              const pointsActual = actualCurve
                .map((d, i) => {
                  const x = (i / Math.max(1, curve.length - 1)) * 600 + 20; // Correct scale to match full width
                  const y = 210 - Math.min(180, Math.max(10, ((d.actual || 0) / maxVal) * 180));
                  return `${x},${y}`;
                })
                .join(' ');

              const pointsForecast = curve
                .map((d, i) => {
                  const x = (i / Math.max(1, curve.length - 1)) * 600 + 20;
                  const y = 210 - Math.min(180, Math.max(10, ((d.forecast || 0) / maxVal) * 180));
                  return `${x},${y}`;
                })
                .join(' ');

              return (
                <svg viewBox="0 0 640 230" style={{ width: '100%', height: '100%', overflow: 'visible', fontFamily: 'Inter, monospace' }}>
                  {/* Refined Grid Lines - Minimal */}
                  <line x1="0" y1="210" x2="100%" y2="210" stroke="var(--border)" strokeWidth="1" />
                  <line x1="0" y1="110" x2="100%" y2="110" stroke="var(--border)" strokeWidth="1" strokeDasharray="4" />
                  <line x1="0" y1="10" x2="100%" y2="10" stroke="var(--border)" strokeWidth="1" strokeDasharray="4" />

                  {/* Lines */}
                  {pointsForecast && (
                    <polyline
                      fill="none"
                      stroke="var(--accent-primary)"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      points={pointsForecast}
                    />
                  )}

                  {pointsActual && (
                    <polyline
                      fill="none"
                      stroke="var(--accent-cool)"
                      strokeWidth="2.5"
                      points={pointsActual}
                    />
                  )}
                  
                  {/* Direct Chart Labels */}
                  <text x="560" y="30" fill="var(--accent-primary)" fontSize="11" fontWeight="600">Forecast</text>
                  <text x="320" y="100" fill="var(--accent-cool)" fontSize="11" fontWeight="600">Actual</text>
                </svg>
              );
            })()}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '11px', marginTop: '12px', padding: '0 8px' }}>
              {forecastCurve.map((d, i) => (
                <span key={i} style={{ width: '30px', textAlign: 'center', opacity: i % 2 === 0 ? 1 : 0.5 }}>{d.date.replace(' ', '\n')}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity Feed */}
        <div className="panel-bordered">
          <h3 className="section-title" style={{ marginBottom: '16px' }}>Real-Time Activity Audit</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activityLogs.map((act) => (
              <div key={act._id} style={{ display: 'flex', gap: '12px', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <span className={`badge ${act.movementType === 'STOCK_IN' ? 'badge-success' : 'badge-danger'}`} style={{ width: '42px', justifyContent: 'center' }}>
                  {act.movementType === 'STOCK_IN' ? 'IN' : 'OUT'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{act.productId?.name || 'Inventory Movement'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>
                    {act.movementType === 'STOCK_IN' ? `+${act.quantity}` : `-${act.quantity}`} units • <span>{act.warehouseId?.code || 'WH-EAST-01'}</span>
                  </div>
                </div>
                <div className="tabular-nums" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            ))}
            {activityLogs.length === 0 && (
              <div className="empty-state-box" style={{ padding: '32px 16px', border: 'none' }}>
                <div className="empty-state-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <div style={{ fontWeight: 500, fontSize: '14px', color: 'var(--text-primary)' }}>No Stock Movements Logged</div>
                <div className="subtext-muted" style={{ marginTop: '4px', maxWidth: '240px' }}>Record inventory movements in Inventory Control to populate audit logs.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notifications Drawer */}
      {isNotificationOpen && (
        <div className="panel-bordered" style={{ position: 'fixed', top: '75px', right: '28px', width: '380px', padding: '20px', boxShadow: '0 12px 32px rgba(0,0,0,0.6)', zIndex: 100 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>System Alerts & Action Items</h4>
            <button onClick={() => setIsNotificationOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}>✕</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ padding: '12px', backgroundColor: 'rgba(229, 83, 75, 0.08)', borderLeft: '3px solid var(--accent-risk)', borderRadius: '6px', fontSize: '12px' }}>
              <strong style={{ color: 'var(--accent-risk)', display: 'block', marginBottom: '2px' }}>Critical Stockout Warning</strong>
              <div style={{ color: 'var(--text-muted)' }}>{lowStockAlerts} items currently below safety stock limits.</div>
            </div>
            <div style={{ padding: '12px', backgroundColor: 'rgba(229, 83, 75, 0.08)', borderLeft: '3px solid var(--accent-risk)', borderRadius: '6px', fontSize: '12px' }}>
              <strong style={{ color: 'var(--accent-risk)', display: 'block', marginBottom: '2px' }}>Pending Sign-Off Required</strong>
              <div style={{ color: 'var(--text-muted)' }}>{pendingPOs} Purchase Orders awaiting executive approval.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
