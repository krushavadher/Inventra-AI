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
    <div style={{ backgroundColor: '#09090B', color: '#F4F4F5', minHeight: '100vh', padding: '24px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* HEADER BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#FFF' }}>Warehouse Management (WMS)</h1>
            <span style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#818CF8', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
              2D SPATIAL DENSITY ENGINE
            </span>
          </div>
          <p style={{ color: '#A1A1AA', fontSize: '13px', margin: '4px 0 0 0' }}>
            Multi-tier facility layout, 4-level storage hierarchy (Zone $\rightarrow$ Aisle $\rightarrow$ Rack $\rightarrow$ Shelf $\rightarrow$ Bin), and volume density heatmap.
          </p>
        </div>

        <button
          onClick={() => setIsAddWhModalOpen(true)}
          style={{ backgroundColor: '#6366F1', color: '#FFF', padding: '10px 18px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          ➕ Add Warehouse Facility
        </button>
      </div>

      {/* KPI OVERVIEW CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#A1A1AA', fontWeight: 600 }}>🏢 Active Facilities</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#FFF', margin: '6px 0 2px 0' }}>{warehouses.length}</div>
          <div style={{ fontSize: '11px', color: '#34D399', fontWeight: 600 }}>Global WMS Nodes</div>
        </div>

        <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#A1A1AA', fontWeight: 600 }}>📊 Occupancy Rate</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: (analytics?.occupancyRatePercentage || 0) > 85 ? '#F43F5E' : '#34D399', margin: '6px 0 2px 0' }}>
            {analytics?.occupancyRatePercentage || 0}%
          </div>
          <div style={{ fontSize: '11px', color: '#A1A1AA', fontWeight: 500 }}>
            {analytics?.capacity?.totalVolumeUsedM3 || 0} / {analytics?.capacity?.totalVolumeCapacityM3 || 10000} m³ Used
          </div>
        </div>

        <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#A1A1AA', fontWeight: 600 }}>📦 Active Storage Bins</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#818CF8', margin: '6px 0 2px 0' }}>
            {analytics?.binSummary?.totalBins || 0}
          </div>
          <div style={{ fontSize: '11px', color: '#A1A1AA' }}>
            🟢 {analytics?.binSummary?.emptyBins || 0} Empty | 🔴 {analytics?.binSummary?.fullBins || 0} Full
          </div>
        </div>

        <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#A1A1AA', fontWeight: 600 }}>❄️ Temp Controlled Zones</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#38BDF8', margin: '6px 0 2px 0' }}>
            {selectedWarehouse?.zones?.filter(z => z.type === 'COLD_STORAGE').length || 0}
          </div>
          <div style={{ fontSize: '11px', color: '#38BDF8', fontWeight: 600 }}>Active Cold Chain</div>
        </div>
      </div>

      {/* MAIN LAYOUT GRID */}
      {loading ? (
        <div style={{ backgroundColor: '#18181B', padding: '40px', borderRadius: '12px', textAlign: 'center', color: '#A1A1AA' }}>
          Loading warehouse WMS facilities...
        </div>
      ) : warehouses.length === 0 ? (
        /* CLEAN EMPTY STATE WHEN DB IS EMPTY */
        <div style={{ backgroundColor: '#18181B', border: '1px border #27272A', padding: '50px', borderRadius: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '42px', marginBottom: '12px' }}>🏬</div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#FFF', margin: '0 0 8px 0' }}>No Warehouse Facilities Found</h2>
          <p style={{ color: '#A1A1AA', fontSize: '14px', maxWidth: '480px', margin: '0 auto 20px auto' }}>
            Your warehouse database is clean. Create your first facility to configure storage zones, aisles, racks, and 2D spatial heatmap monitoring.
          </p>
          <button
            onClick={() => setIsAddWhModalOpen(true)}
            style={{ backgroundColor: '#6366F1', color: '#FFF', padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: 800, fontSize: '14px', cursor: 'pointer' }}
          >
            ➕ Create First Warehouse Facility
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '300px minmax(0, 1fr)', gap: '20px' }}>
          
          {/* LEFT SIDEBAR: FACILITIES LIST */}
          <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ fontSize: '12px', color: '#A1A1AA', textTransform: 'uppercase', fontWeight: 800 }}>FACILITIES ({warehouses.length})</div>
              <button onClick={() => setIsAddWhModalOpen(true)} style={{ backgroundColor: '#27272A', color: '#34D399', border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>+ New</button>
            </div>

            {warehouses.map((wh) => {
              const isSelected = selectedWarehouse?._id === wh._id;
              return (
                <div
                  key={wh._id}
                  onClick={() => handleSelectWarehouse(wh)}
                  style={{
                    backgroundColor: isSelected ? '#27272A' : '#09090B',
                    border: '1px solid #27272A',
                    borderRadius: '10px',
                    padding: '14px',
                    cursor: 'pointer',
                    borderLeft: isSelected ? '4px solid #6366F1' : '4px solid transparent',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <div style={{ fontWeight: 800, fontSize: '14px', color: '#FFF' }}>{wh.name}</div>
                    <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34D399', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>
                      {wh.status || 'ACTIVE'}
                    </span>
                  </div>

                  <div style={{ fontSize: '11px', color: '#818CF8', fontFamily: 'monospace', fontWeight: 700, marginBottom: '6px' }}>
                    {wh.code} • {wh.type?.replace('_', ' ')}
                  </div>

                  <div style={{ fontSize: '11px', color: '#71717A' }}>
                    📍 {wh.address?.city || 'Boston'}, {wh.address?.country || 'USA'}
                  </div>

                  <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#A1A1AA' }}>{wh.zones?.length || 0} Zones Configured</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteWarehouse(wh._id, wh.name); }}
                      style={{ backgroundColor: 'transparent', color: '#F43F5E', border: 'none', cursor: 'pointer', fontSize: '11px' }}
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
              <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '12px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#818CF8', fontWeight: 800, fontFamily: 'monospace' }}>{selectedWarehouse.code}</span>
                  <h2 style={{ margin: '2px 0 4px 0', fontSize: '20px', fontWeight: 800, color: '#FFF' }}>{selectedWarehouse.name}</h2>
                  <div style={{ fontSize: '12px', color: '#A1A1AA' }}>
                    Address: {selectedWarehouse.address?.street}, {selectedWarehouse.address?.city}, {selectedWarehouse.address?.state} {selectedWarehouse.address?.postalCode}
                  </div>
                </div>

                <button
                  onClick={() => setIsAddZoneModalOpen(true)}
                  style={{ backgroundColor: '#10B981', color: '#FFF', padding: '9px 16px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                >
                  ⚡ Add Zone & Generate Bins
                </button>
              </div>

              {/* 2D SPATIAL HEATMAP GRID */}
              <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#FFF' }}>2D Storage Bin Density & Utilization Heatmap</h3>
                  <div style={{ display: 'flex', gap: '14px', fontSize: '11px' }}>
                    <span style={{ color: '#34D399', fontWeight: 700 }}>● Empty / Low (&lt;30%)</span>
                    <span style={{ color: '#F59E0B', fontWeight: 700 }}>● Medium (30-80%)</span>
                    <span style={{ color: '#F43F5E', fontWeight: 700 }}>● Full / High (&gt;80%)</span>
                  </div>
                </div>

                {/* ZONE BREAKDOWN HEATMAP TILES */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {selectedWarehouse.zones?.map((zone) => (
                    <div key={zone.zoneCode} style={{ backgroundColor: '#09090B', border: '1px solid #27272A', borderRadius: '10px', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ backgroundColor: '#6366F1', color: '#FFF', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, fontFamily: 'monospace' }}>
                            {zone.zoneCode}
                          </span>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: '#FFF' }}>{zone.name}</span>
                          <span style={{ fontSize: '11px', color: '#A1A1AA', backgroundColor: '#27272A', padding: '2px 8px', borderRadius: '4px' }}>
                            {zone.type}
                          </span>
                        </div>
                        {zone.tempControlCelsius !== undefined && (
                          <span style={{ color: '#38BDF8', fontSize: '12px', fontWeight: 700 }}>
                            ❄️ {zone.tempControlCelsius}°C
                          </span>
                        )}
                      </div>

                      {/* BINS GRID */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '10px' }}>
                        {zone.aisles?.flatMap(aisle => aisle.racks?.flatMap((rack: any) => rack.shelves?.flatMap((shelf: any) => shelf.bins || [])) || []).map((bin: Bin, idx: number) => {
                          const util = bin.maxVolumeCubicMeters > 0 ? (bin.currentVolumeUsed / bin.maxVolumeCubicMeters) * 100 : 0;
                          const color = util > 80 ? '#F43F5E' : util > 30 ? '#F59E0B' : '#34D399';

                          return (
                            <div
                              key={idx}
                              style={{
                                backgroundColor: '#18181B',
                                border: `1px solid ${color}`,
                                padding: '10px',
                                borderRadius: '8px',
                                textAlign: 'center'
                              }}
                            >
                              <div style={{ fontSize: '10px', color: '#818CF8', fontFamily: 'monospace', fontWeight: 700 }}>{bin.binCode}</div>
                              <div style={{ fontSize: '15px', fontWeight: 800, color, margin: '2px 0' }}>{Math.round(util)}%</div>
                              <div style={{ fontSize: '10px', color: '#71717A' }}>
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '16px', padding: '24px', width: '480px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 800, color: '#FFF' }}>➕ Add New Warehouse Facility</h3>
            <form onSubmit={handleCreateWarehouseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#A1A1AA' }}>Facility Name</label>
                <input required type="text" placeholder="e.g. East Coast Main DC" value={whForm.name} onChange={(e) => setWhForm({ ...whForm, name: e.target.value })} style={{ width: '100%', padding: '8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '6px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#A1A1AA' }}>Facility Code</label>
                  <input required type="text" placeholder="e.g. WH-EAST-01" value={whForm.code} onChange={(e) => setWhForm({ ...whForm, code: e.target.value })} style={{ width: '100%', padding: '8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#A1A1AA' }}>Facility Type</label>
                  <select value={whForm.type} onChange={(e: any) => setWhForm({ ...whForm, type: e.target.value })} style={{ width: '100%', padding: '8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '6px' }}>
                    <option value="DISTRIBUTION_CENTER">Distribution Center</option>
                    <option value="REGIONAL_HUB">Regional Hub</option>
                    <option value="RETAIL_STORE">Retail Store</option>
                    <option value="COLD_STORAGE">Cold Storage</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#A1A1AA' }}>Street Address</label>
                <input type="text" value={whForm.street} onChange={(e) => setWhForm({ ...whForm, street: e.target.value })} style={{ width: '100%', padding: '8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '6px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#A1A1AA' }}>City</label>
                  <input type="text" value={whForm.city} onChange={(e) => setWhForm({ ...whForm, city: e.target.value })} style={{ width: '100%', padding: '8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#A1A1AA' }}>State</label>
                  <input type="text" value={whForm.state} onChange={(e) => setWhForm({ ...whForm, state: e.target.value })} style={{ width: '100%', padding: '8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#A1A1AA' }}>Postal Code</label>
                  <input type="text" value={whForm.postalCode} onChange={(e) => setWhForm({ ...whForm, postalCode: e.target.value })} style={{ width: '100%', padding: '8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setIsAddWhModalOpen(false)} style={{ padding: '8px 16px', backgroundColor: '#27272A', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#6366F1', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>Create Facility</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD ZONE & GENERATE BINS */}
      {isAddZoneModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '16px', padding: '24px', width: '480px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 800, color: '#FFF' }}>⚡ Add Zone & Generate Storage Hierarchy</h3>
            <form onSubmit={handleAddZoneSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#A1A1AA' }}>Zone Code</label>
                  <input required type="text" placeholder="e.g. ZONE-C" value={zoneForm.zoneCode} onChange={(e) => setZoneForm({ ...zoneForm, zoneCode: e.target.value })} style={{ width: '100%', padding: '8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#A1A1AA' }}>Zone Name</label>
                  <input required type="text" placeholder="e.g. Cold Vault C" value={zoneForm.name} onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })} style={{ width: '100%', padding: '8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#A1A1AA' }}>Zone Type</label>
                <select value={zoneForm.type} onChange={(e: any) => setZoneForm({ ...zoneForm, type: e.target.value })} style={{ width: '100%', padding: '8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '6px' }}>
                  <option value="STORAGE">High-Density Storage</option>
                  <option value="RECEIVING">Inbound Receiving Dock</option>
                  <option value="PICKING">Fast Picking Zone</option>
                  <option value="COLD_STORAGE">Cold Storage (-18°C)</option>
                  <option value="QUARANTINE">Quarantine & Quality Hold</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#A1A1AA' }}>Aisles Count</label>
                  <input type="number" min={1} value={zoneForm.aislesCount} onChange={(e) => setZoneForm({ ...zoneForm, aislesCount: Number(e.target.value) })} style={{ width: '100%', padding: '8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#A1A1AA' }}>Bins per Shelf</label>
                  <input type="number" min={1} value={zoneForm.binsPerShelf} onChange={(e) => setZoneForm({ ...zoneForm, binsPerShelf: Number(e.target.value) })} style={{ width: '100%', padding: '8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setIsAddZoneModalOpen(false)} style={{ padding: '8px 16px', backgroundColor: '#27272A', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#10B981', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>Generate Bins</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default WarehousePage;
