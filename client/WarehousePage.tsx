import React, { useState, useEffect } from 'react';
import { apiFetch } from './apiClient';

export interface Bin {
  binCode: string;
  maxVolumeCubicMeters: number;
  currentVolumeUsed: number;
  maxWeightKg: number;
  currentWeightUsed: number;
  isLocked: boolean;
  status: 'EMPTY' | 'PARTIAL' | 'FULL' | 'QUARANTINE';
}

export interface Zone {
  zoneCode: string;
  name: string;
  type: 'RECEIVING' | 'STORAGE' | 'PICKING' | 'COLD_STORAGE' | 'QUARANTINE' | 'DISPATCH';
  tempControlCelsius?: number;
  aisles?: any[];
}

export interface Warehouse {
  _id: string;
  code: string;
  name: string;
  type: 'DISTRIBUTION_CENTER' | 'REGIONAL_HUB' | 'RETAIL_STORE' | 'COLD_STORAGE';
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  totalCapacityVolume: number;
  totalCapacityWeight: number;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  zones: Zone[];
}

export interface WarehouseAnalytics {
  occupancyRatePercentage: number;
  weightLoadPercentage: number;
  binSummary: {
    totalBins: number;
    emptyBins: number;
    partialBins: number;
    fullBins: number;
  };
  capacity: {
    totalVolumeCapacityM3: number;
    totalVolumeUsedM3: number;
    totalWeightCapacityKg: number;
    totalWeightUsedKg: number;
  };
  zoneBreakdown: Array<{
    zoneCode: string;
    zoneName: string;
    type: string;
    totalBins: number;
    volumeUsedM3: number;
  }>;
}

export const WarehousePage: React.FC = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [analytics, setAnalytics] = useState<WarehouseAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Modals
  const [isAddWhModalOpen, setIsAddWhModalOpen] = useState(false);
  const [isAddZoneModalOpen, setIsAddZoneModalOpen] = useState(false);

  // Create Warehouse Form State
  const [whForm, setWhForm] = useState({
    code: '',
    name: '',
    type: 'DISTRIBUTION_CENTER' as const,
    street: '100 Industrial Pkwy',
    city: 'Boston',
    state: 'MA',
    country: 'USA',
    postalCode: '02108',
    totalCapacityVolume: 50000,
    totalCapacityWeight: 100000
  });

  // Create Zone Form State
  const [zoneForm, setZoneForm] = useState({
    zoneCode: 'ZONE-C',
    name: 'Cold Storage Vault',
    type: 'COLD_STORAGE' as const,
    tempControlCelsius: -18,
    aislesCount: 2,
    racksPerAisle: 2,
    shelvesPerRack: 3,
    binsPerShelf: 4
  });

  // Fetch All Warehouses
  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/warehouses');
      if (res.data) {
        setWarehouses(res.data);
        if (res.data.length > 0) {
          const firstWh = res.data[0];
          setSelectedWarehouse(firstWh);
          fetchAnalytics(firstWh._id);
        } else {
          setSelectedWarehouse(null);
          setAnalytics(null);
        }
      }
    } catch (err) {
      console.warn('Warehouse API fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Analytics for Selected Warehouse
  const fetchAnalytics = async (whId: string) => {
    try {
      const res = await apiFetch(`/warehouses/${whId}/analytics`);
      if (res.data) setAnalytics(res.data);
    } catch (err) {
      console.warn('Analytics fetch error:', err);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleSelectWarehouse = (wh: Warehouse) => {
    setSelectedWarehouse(wh);
    fetchAnalytics(wh._id);
  };

  // Submit Create Warehouse
  const handleCreateWarehouseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = {
        code: whForm.code.toUpperCase() || `WH-${Date.now().toString().slice(-4)}`,
        name: whForm.name,
        type: whForm.type,
        address: {
          street: whForm.street,
          city: whForm.city,
          state: whForm.state,
          country: whForm.country,
          postalCode: whForm.postalCode
        },
        totalCapacityVolume: Number(whForm.totalCapacityVolume),
        totalCapacityWeight: Number(whForm.totalCapacityWeight)
      };

      await apiFetch('/warehouses', {
        method: 'POST',
        body: JSON.stringify(body)
      });

      setIsAddWhModalOpen(false);
      setWhForm({ code: '', name: '', type: 'DISTRIBUTION_CENTER', street: '100 Industrial Pkwy', city: 'Boston', state: 'MA', country: 'USA', postalCode: '02108', totalCapacityVolume: 50000, totalCapacityWeight: 100000 });
      fetchWarehouses();
      alert('Warehouse Facility created successfully in MongoDB!');
    } catch (err: any) {
      alert(err.message || 'Error creating warehouse');
    }
  };

  // Submit Add Zone
  const handleAddZoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarehouse) return;

    try {
      await apiFetch(`/warehouses/${selectedWarehouse._id}/zones`, {
        method: 'POST',
        body: JSON.stringify({
          zoneCode: zoneForm.zoneCode.toUpperCase(),
          name: zoneForm.name,
          type: zoneForm.type,
          tempControlCelsius: zoneForm.tempControlCelsius,
          aislesCount: Number(zoneForm.aislesCount),
          racksPerAisle: Number(zoneForm.racksPerAisle),
          shelvesPerRack: Number(zoneForm.shelvesPerRack),
          binsPerShelf: Number(zoneForm.binsPerShelf)
        })
      });

      setIsAddZoneModalOpen(false);
      fetchWarehouses();
      alert(`Zone '${zoneForm.zoneCode}' & storage bins generated!`);
    } catch (err: any) {
      alert(err.message || 'Error adding zone');
    }
  };

  // Delete Warehouse
  const handleDeleteWarehouse = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove '${name}' facility?`)) return;
    try {
      await apiFetch(`/warehouses/${id}`, { method: 'DELETE' });
      fetchWarehouses();
    } catch (err: any) {
      alert(err.message || 'Facility deleted');
      fetchWarehouses();
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)', minHeight: '100vh', padding: '32px 40px' }}>
      
      {/* HEADER BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 className="page-title">Warehouse Management (WMS)</h1>
            <span className="badge badge-info">
              2D SPATIAL DENSITY ENGINE
            </span>
          </div>
          <p className="subtext-muted" style={{ marginTop: '4px' }}>
            Multi-tier facility layout, 4-level storage hierarchy (Zone &rarr; Aisle &rarr; Rack &rarr; Shelf &rarr; Bin), and volume density heatmap.
          </p>
        </div>

        <button
          onClick={() => setIsAddWhModalOpen(true)}
          className="btn-primary"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Warehouse Facility
        </button>
      </div>

      {/* KPI OVERVIEW CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div className="panel-bordered" style={{ padding: '20px' }}>
          <div className="kpi-label">Active Facilities</div>
          <div className="kpi-value">{warehouses.length}</div>
          <div className="subtext-muted" style={{ marginTop: '6px' }}>Global WMS Nodes</div>
        </div>

        <div className="panel-bordered" style={{ padding: '20px' }}>
          <div className="kpi-label">Occupancy Rate</div>
          <div className="kpi-value" style={{ color: (analytics?.occupancyRatePercentage || 0) > 85 ? 'var(--accent-risk)' : 'var(--accent-cool)' }}>
            {analytics?.occupancyRatePercentage || 0}%
          </div>
          <div className="subtext-muted" style={{ marginTop: '6px' }}>
            {analytics?.capacity?.totalVolumeUsedM3 || 0} / {analytics?.capacity?.totalVolumeCapacityM3 || 10000} m³ Used
          </div>
        </div>

        <div className="panel-bordered" style={{ padding: '20px' }}>
          <div className="kpi-label">Active Storage Bins</div>
          <div className="kpi-value" style={{ color: 'var(--text-primary)' }}>
            {analytics?.binSummary?.totalBins || 0}
          </div>
          <div style={{ marginTop: '6px', display: 'flex', gap: '6px' }}>
            <span className="badge" style={{ color: 'var(--accent-cool)', backgroundColor: 'rgba(43, 180, 160, 0.15)' }}>{analytics?.binSummary?.emptyBins || 0} Empty</span>
            <span className="badge" style={{ color: 'var(--accent-risk)', backgroundColor: 'rgba(229, 83, 75, 0.15)' }}>{analytics?.binSummary?.fullBins || 0} Full</span>
          </div>
        </div>

        <div className="panel-bordered" style={{ padding: '20px' }}>
          <div className="kpi-label">Temp Controlled Zones</div>
          <div className="kpi-value" style={{ color: 'var(--text-primary)' }}>
            {selectedWarehouse?.zones?.filter(z => z.type === 'COLD_STORAGE').length || 0}
          </div>
          <div style={{ marginTop: '6px' }}>
            <span className="badge badge-info">Active Cold Chain</span>
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT GRID */}
      {loading ? (
        <div style={{ color: 'var(--text-muted)' }}>
          Loading warehouse WMS facilities...
        </div>
      ) : warehouses.length === 0 ? (
        /* CLEAN EMPTY STATE WHEN DB IS EMPTY */
        <div className="empty-state-box">
          <div className="empty-state-icon">🏬</div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>No Warehouse Facilities Found</h2>
          <p className="subtext-muted" style={{ maxWidth: '480px', margin: '0 auto 20px auto' }}>
            Your warehouse database is clean. Create your first facility to configure storage zones, aisles, racks, and 2D spatial heatmap monitoring.
          </p>
          <button
            onClick={() => setIsAddWhModalOpen(true)}
            className="btn-primary"
          >
            ➕ Create First Warehouse Facility
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '300px minmax(0, 1fr)', gap: '20px' }}>
          
          {/* LEFT SIDEBAR: FACILITIES LIST */}
          <div className="panel-bordered" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div className="kpi-label">FACILITIES ({warehouses.length})</div>
              <button onClick={() => setIsAddWhModalOpen(true)} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>+ New</button>
            </div>

            {warehouses.map((wh) => {
              const isSelected = selectedWarehouse?._id === wh._id;
              return (
                <div
                  key={wh._id}
                  onClick={() => handleSelectWarehouse(wh)}
                  className="panel-bordered"
                  style={{
                    backgroundColor: isSelected ? 'var(--bg-surface)' : 'transparent',
                    padding: '14px',
                    cursor: 'pointer',
                    borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{wh.name}</div>
                    <span style={{ backgroundColor: 'rgba(43, 180, 160, 0.2)', color: 'var(--accent-cool)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>
                      {wh.status || 'ACTIVE'}
                    </span>
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-primary)', fontFamily: 'monospace', fontWeight: 500, marginBottom: '6px' }}>
                    {wh.code} • {wh.type?.replace('_', ' ')}
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    📍 {wh.address?.city || 'Boston'}, {wh.address?.country || 'USA'}
                  </div>

                  <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{wh.zones?.length || 0} Zones Configured</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteWarehouse(wh._id, wh.name); }}
                      style={{ backgroundColor: 'transparent', color: 'var(--accent-risk)', border: 'none', cursor: 'pointer', fontSize: '11px' }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT CANVAS: 2D HEATMAP & ZONE HIERARCHY */}
          {selectedWarehouse && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* FACILITY OVERVIEW HEADER CARD */}
              <div className="panel-bordered" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>{selectedWarehouse.code}</span>
                  <h2 style={{ margin: '2px 0 4px 0', fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedWarehouse.name}</h2>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Address: {selectedWarehouse.address?.street}, {selectedWarehouse.address?.city}, {selectedWarehouse.address?.state} {selectedWarehouse.address?.postalCode}
                  </div>
                </div>

                <button
                  onClick={() => setIsAddZoneModalOpen(true)}
                  className="btn-primary"
                  style={{ backgroundColor: 'var(--accent-cool)', color: '#000' }}
                >
                  ⚡ Add Zone & Generate Bins
                </button>
              </div>

              {/* 2D SPATIAL HEATMAP GRID */}
              <div className="panel-bordered" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>2D Storage Bin Density & Utilization Heatmap</h3>
                  <div style={{ display: 'flex', gap: '14px', fontSize: '11px' }}>
                    <span style={{ color: 'var(--accent-cool)', fontWeight: 600 }}>● Empty / Low (&lt;30%)</span>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>● Medium (30-80%)</span>
                    <span style={{ color: 'var(--accent-risk)', fontWeight: 600 }}>● Full / High (&gt;80%)</span>
                  </div>
                </div>

                {/* ZONE BREAKDOWN HEATMAP TILES */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {selectedWarehouse.zones?.map((zone) => (
                    <div key={zone.zoneCode} className="panel-bordered" style={{ backgroundColor: 'var(--bg-base)', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                            {zone.zoneCode}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{zone.name}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-surface)', padding: '2px 8px', borderRadius: '4px' }}>
                            {zone.type}
                          </span>
                        </div>
                        {zone.tempControlCelsius !== undefined && (
                          <span style={{ color: 'var(--accent-cool)', fontSize: '12px', fontWeight: 600 }}>
                            ❄️ {zone.tempControlCelsius}°C
                          </span>
                        )}
                      </div>

                      {/* BINS GRID */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '10px' }}>
                        {zone.aisles?.flatMap(aisle => aisle.racks?.flatMap((rack: any) => rack.shelves?.flatMap((shelf: any) => shelf.bins || [])) || []).map((bin: Bin, idx: number) => {
                          const util = bin.maxVolumeCubicMeters > 0 ? (bin.currentVolumeUsed / bin.maxVolumeCubicMeters) * 100 : 0;
                          const color = util > 80 ? 'var(--accent-risk)' : util > 30 ? 'var(--accent-primary)' : 'var(--accent-cool)';

                          return (
                            <div
                              key={idx}
                              style={{
                                backgroundColor: 'var(--bg-surface)',
                                border: `1px solid ${color}`,
                                padding: '10px',
                                borderRadius: '4px',
                                textAlign: 'center'
                              }}
                            >
                              <div style={{ fontSize: '10px', color: 'var(--text-primary)', fontWeight: 600 }}>{bin.binCode}</div>
                              <div className="tabular-nums" style={{ fontSize: '15px', fontWeight: 700, color, margin: '2px 0' }}>{Math.round(util)}%</div>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                {bin.status || 'AVAILABLE'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* MODAL 1: CREATE WAREHOUSE */}
      {isAddWhModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(13, 17, 23, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div className="panel-bordered" style={{ padding: '24px', width: '480px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>➕ Add New Warehouse Facility</h3>
            <form onSubmit={handleCreateWarehouseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="kpi-label" style={{ marginBottom: '4px', display: 'block' }}>Facility Name</label>
                <input required type="text" placeholder="e.g. East Coast Main DC" value={whForm.name} onChange={(e) => setWhForm({ ...whForm, name: e.target.value })} className="input-dark" style={{ width: '100%' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="kpi-label" style={{ marginBottom: '4px', display: 'block' }}>Facility Code</label>
                  <input required type="text" placeholder="e.g. WH-EAST-01" value={whForm.code} onChange={(e) => setWhForm({ ...whForm, code: e.target.value })} className="input-dark" style={{ width: '100%' }} />
                </div>
                <div>
                  <label className="kpi-label" style={{ marginBottom: '4px', display: 'block' }}>Facility Type</label>
                  <select value={whForm.type} onChange={(e: any) => setWhForm({ ...whForm, type: e.target.value })} className="input-dark" style={{ width: '100%' }}>
                    <option value="DISTRIBUTION_CENTER">Distribution Center</option>
                    <option value="REGIONAL_HUB">Regional Hub</option>
                    <option value="RETAIL_STORE">Retail Store</option>
                    <option value="COLD_STORAGE">Cold Storage</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="kpi-label" style={{ marginBottom: '4px', display: 'block' }}>Street Address</label>
                <input type="text" value={whForm.street} onChange={(e) => setWhForm({ ...whForm, street: e.target.value })} className="input-dark" style={{ width: '100%' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="kpi-label" style={{ marginBottom: '4px', display: 'block' }}>City</label>
                  <input type="text" value={whForm.city} onChange={(e) => setWhForm({ ...whForm, city: e.target.value })} className="input-dark" style={{ width: '100%' }} />
                </div>
                <div>
                  <label className="kpi-label" style={{ marginBottom: '4px', display: 'block' }}>State</label>
                  <input type="text" value={whForm.state} onChange={(e) => setWhForm({ ...whForm, state: e.target.value })} className="input-dark" style={{ width: '100%' }} />
                </div>
                <div>
                  <label className="kpi-label" style={{ marginBottom: '4px', display: 'block' }}>Postal Code</label>
                  <input type="text" value={whForm.postalCode} onChange={(e) => setWhForm({ ...whForm, postalCode: e.target.value })} className="input-dark" style={{ width: '100%' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setIsAddWhModalOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create Facility</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD ZONE & GENERATE BINS */}
      {isAddZoneModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(13, 17, 23, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div className="panel-bordered" style={{ padding: '24px', width: '480px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>⚡ Add Zone & Generate Storage Hierarchy</h3>
            <form onSubmit={handleAddZoneSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="kpi-label" style={{ marginBottom: '4px', display: 'block' }}>Zone Code</label>
                  <input required type="text" placeholder="e.g. ZONE-C" value={zoneForm.zoneCode} onChange={(e) => setZoneForm({ ...zoneForm, zoneCode: e.target.value })} className="input-dark" style={{ width: '100%' }} />
                </div>
                <div>
                  <label className="kpi-label" style={{ marginBottom: '4px', display: 'block' }}>Zone Name</label>
                  <input required type="text" placeholder="e.g. Cold Vault C" value={zoneForm.name} onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })} className="input-dark" style={{ width: '100%' }} />
                </div>
              </div>

              <div>
                <label className="kpi-label" style={{ marginBottom: '4px', display: 'block' }}>Zone Type</label>
                <select value={zoneForm.type} onChange={(e: any) => setZoneForm({ ...zoneForm, type: e.target.value })} className="input-dark" style={{ width: '100%' }}>
                  <option value="STORAGE">High-Density Storage</option>
                  <option value="RECEIVING">Inbound Receiving Dock</option>
                  <option value="PICKING">Fast Picking Zone</option>
                  <option value="COLD_STORAGE">Cold Storage (-18°C)</option>
                  <option value="QUARANTINE">Quarantine & Quality Hold</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="kpi-label" style={{ marginBottom: '4px', display: 'block' }}>Aisles Count</label>
                  <input type="number" min={1} value={zoneForm.aislesCount} onChange={(e) => setZoneForm({ ...zoneForm, aislesCount: Number(e.target.value) })} className="input-dark" style={{ width: '100%' }} />
                </div>
                <div>
                  <label className="kpi-label" style={{ marginBottom: '4px', display: 'block' }}>Bins per Shelf</label>
                  <input type="number" min={1} value={zoneForm.binsPerShelf} onChange={(e) => setZoneForm({ ...zoneForm, binsPerShelf: Number(e.target.value) })} className="input-dark" style={{ width: '100%' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setIsAddZoneModalOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary" style={{ backgroundColor: 'var(--accent-cool)', color: '#000' }}>Generate Bins</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default WarehousePage;
