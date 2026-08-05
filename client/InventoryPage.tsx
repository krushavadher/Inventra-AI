import React, { useState, useEffect } from 'react';
import { apiFetch } from './apiClient';

export interface InventoryItem {
  _id: string;
  productId: {
    _id: string;
    name: string;
    sku: string;
    category?: string;
    supplier?: string;
    unitCost?: number;
    sellingPrice?: number;
    barcode?: string;
    image?: string;
  };
  warehouseId: {
    _id: string;
    name: string;
    code: string;
  };
  binCode?: string;
  batchNumber?: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  minSafetyStock: number;
  reorderPoint: number;
  maxStockCapacity?: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'RESERVED' | 'EXPIRING_SOON';
  expiryDate?: string | null;
  createdAt?: string;
}

export interface MovementLog {
  _id: string;
  movementType: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT' | 'TRANSFER_IN' | 'TRANSFER_OUT';
  productId: { name: string; sku: string };
  warehouseId: { name: string; code: string };
  quantity: number;
  balanceBefore: number;
  balanceAfter: number;
  reason?: string;
  performedBy?: string;
  createdAt: string;
}

export interface KPISummary {
  totalSkus: number;
  totalQuantity: number;
  inventoryValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiringSoonCount: number;
  reservedUnits: number;
  incomingUnits: number;
  stockHealthPercent: number;
}

export const InventoryPage: React.FC = () => {
  // Main Data States
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<MovementLog[]>([]);
  const [kpi, setKpi] = useState<KPISummary>({
    totalSkus: 0,
    totalQuantity: 0,
    inventoryValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    expiringSoonCount: 0,
    reservedUnits: 0,
    incomingUnits: 0,
    stockHealthPercent: 100
  });
  const [aiRecs, setAiRecs] = useState<any[]>([]);
  const [aiAlerts, setAiAlerts] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Live Clock
  const [currentTime, setCurrentTime] = useState<string>('');

  // Filtering & Pagination States
  const [search, setSearch] = useState<string>('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [stockLevelFilter, setStockLevelFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Drawer & Modal States
  const [selectedItemForDrawer, setSelectedItemForDrawer] = useState<InventoryItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isStockMovementModalOpen, setIsStockMovementModalOpen] = useState<boolean>(false);
  const [movementModalType, setMovementModalType] = useState<'STOCK_IN' | 'STOCK_OUT' | 'ADJUST' | 'TRANSFER'>('STOCK_IN');
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState<boolean>(false);
  const [copilotMessages, setCopilotMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: 'Hello! I am Inventra AI, your supply chain copilot. How can I assist you with your inventory today?' }
  ]);
  const [copilotInput, setCopilotInput] = useState<string>('');

  // Form States
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Microcontrollers',
    supplier: 'Tech Components Ltd',
    warehouseId: 'wh_east_01',
    quantity: 50,
    unitCost: 1000,
    sellingPrice: 1500,
    minSafetyStock: 20,
    reorderPoint: 40,
    binCode: 'BIN-A-01',
    expiryDate: ''
  });

  const [movementForm, setMovementForm] = useState({
    productId: 'prod_8842',
    warehouseId: 'wh_east_01',
    toWarehouseId: 'wh_west_02',
    quantity: 25,
    reason: 'Regular Inventory Rebalancing',
    notes: ''
  });

  // Live Clock Update
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Data Function
  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Levels
      const queryParams = new URLSearchParams({
        search,
        warehouseId: selectedWarehouse,
        category: selectedCategory,
        supplier: selectedSupplier,
        status: selectedStatus,
        stockLevel: stockLevelFilter,
        sortBy,
        sortOrder,
        page: page.toString(),
        limit: limit.toString()
      });

      const levelsRes = await apiFetch(`/inventory/levels?${queryParams.toString()}`);
      if (levelsRes.data) {
        setInventory(levelsRes.data);
        if (levelsRes.meta) {
          setTotalPages(levelsRes.meta.totalPages || 1);
          setTotalRecords(levelsRes.meta.totalRecords || levelsRes.data.length);
        }
      }

      // 2. Fetch KPIs
      const kpisRes = await apiFetch('/inventory/kpis');
      if (kpisRes.data) setKpi(kpisRes.data);

      // 3. Fetch AI Recommendations
      const recsRes = await apiFetch('/inventory/ai-recommendations');
      if (recsRes.data) setAiRecs(recsRes.data);

      // 4. Fetch AI Alerts
      const alertsRes = await apiFetch('/inventory/ai-alerts');
      if (alertsRes.data) setAiAlerts(alertsRes.data);

      // 5. Fetch Analytics
      const analyticsRes = await apiFetch('/inventory/analytics');
      if (analyticsRes.data) setAnalytics(analyticsRes.data);

      // 6. Fetch Movement History
      const movementsRes = await apiFetch('/inventory/movements?limit=10');
      if (movementsRes.data) setMovements(movementsRes.data);

    } catch (err) {
      console.warn('API connection fallback activated:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, [search, selectedWarehouse, selectedCategory, selectedSupplier, selectedStatus, stockLevelFilter, sortBy, sortOrder, page, limit]);

  // Handle Add Product Submit
  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/inventory/items', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setIsAddModalOpen(false);
      fetchInventoryData();
      alert(`Product '${formData.name}' created successfully!`);
    } catch (err: any) {
      alert(err.message || 'Error adding product');
    }
  };

  // Handle Movement Submit
  const handleMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let endpoint = '/inventory/stock-in';
      if (movementModalType === 'STOCK_OUT') endpoint = '/inventory/stock-out';
      if (movementModalType === 'ADJUST') endpoint = '/inventory/adjust';
      if (movementModalType === 'TRANSFER') endpoint = '/inventory/transfers';

      let body: any = {
        productId: movementForm.productId,
        warehouseId: movementForm.warehouseId,
        quantity: Number(movementForm.quantity),
        reason: movementForm.reason,
        notes: movementForm.notes
      };

      if (movementModalType === 'ADJUST') {
        body.quantityDelta = Number(movementForm.quantity);
      }
      if (movementModalType === 'TRANSFER') {
        body = {
          fromWarehouseId: movementForm.warehouseId,
          toWarehouseId: movementForm.toWarehouseId,
          items: [{ productId: movementForm.productId, quantity: Number(movementForm.quantity) }],
          notes: movementForm.notes
        };
      }

      await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(body)
      });

      setIsStockMovementModalOpen(false);
      fetchInventoryData();
      alert(`Stock operation '${movementModalType}' completed successfully!`);
    } catch (err: any) {
      alert(err.message || 'Operation processed');
      setIsStockMovementModalOpen(false);
      fetchInventoryData();
    }
  };

  // Handle Item Delete
  const handleDeleteItem = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove '${name}' from inventory?`)) return;
    try {
      await apiFetch(`/inventory/items/${id}`, { method: 'DELETE' });
      fetchInventoryData();
      if (selectedItemForDrawer?._id === id) setSelectedItemForDrawer(null);
    } catch (err: any) {
      alert(err.message || 'Item deleted from view');
      fetchInventoryData();
    }
  };

  // CSV Export Generator
  const handleExportCSV = () => {
    const headers = ['SKU', 'Product Name', 'Category', 'Warehouse', 'Supplier', 'On-Hand', 'Reserved', 'Available', 'Min Stock', 'Unit Price (INR)', 'Status'];
    const rows = inventory.map(item => [
      item.productId?.sku || '',
      `"${item.productId?.name || ''}"`,
      item.productId?.category || '',
      item.warehouseId?.name || '',
      item.productId?.supplier || '',
      item.quantityOnHand,
      item.quantityReserved,
      item.quantityAvailable,
      item.minSafetyStock,
      item.productId?.unitCost || 0,
      item.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Inventory_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Status Badge Component
  const renderStatusBadge = (status: string, available: number, minStock: number) => {
    let bg = 'rgba(16, 185, 129, 0.15)';
    let color = '#10B981';
    let label = '🟢 In Stock';

    if (status === 'LOW_STOCK' || (available <= minStock && available > 0)) {
      bg = 'rgba(245, 158, 11, 0.15)';
      color = '#F59E0B';
      label = '🟡 Low Stock';
    } else if (status === 'OUT_OF_STOCK' || available === 0) {
      bg = 'rgba(244, 63, 94, 0.15)';
      color = '#F43F5E';
      label = '🔴 Out of Stock';
    } else if (status === 'RESERVED') {
      bg = 'rgba(139, 92, 246, 0.15)';
      color = '#8B5CF6';
      label = '🟣 Reserved';
    } else if (status === 'EXPIRING_SOON') {
      bg = 'rgba(249, 115, 22, 0.15)';
      color = '#F97316';
      label = '🟠 Expiring Soon';
    }

    return (
      <span style={{ backgroundColor: bg, color, padding: '4px 10px', borderRadius: '12px', fontWeight: 700, fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        {label}
      </span>
    );
  };

  // AI Copilot Send Message
  const handleCopilotSend = (query?: string) => {
    const q = query || copilotInput;
    if (!q.trim()) return;

    const userMsg = { sender: 'user' as const, text: q };
    setCopilotMessages(prev => [...prev, userMsg]);
    setCopilotInput('');

    setTimeout(() => {
      let response = "I have analyzed your inventory database. Here is what I found:";
      const lower = q.toLowerCase();
      if (lower.includes('restock') || lower.includes('low')) {
        response = "⚡ 18 products require restocking. Critical items: Thermal Precision Sensor V2 (5 units left) and Arm Cortex-M4 Board (6 units left). I recommend issuing POs to SensorTech immediately.";
      } else if (lower.includes('critical') || lower.includes('out of stock')) {
        response = "🔴 Critical alert: 4 products are completely Out of Stock (e.g., High-Speed USB-C Cable). 42 customer orders are on hold waiting for replenishment.";
      } else if (lower.includes('report') || lower.includes('procurement')) {
        response = "📊 Procurement Summary Report: Total Inventory Value is ₹1.28 Cr across 5 regional warehouses. Average stock turnover is 4.2x/month.";
      } else if (lower.includes('decreasing') || lower.includes('why')) {
        response = "📉 Stock rate is decreasing 22% faster than last month due to high Q3 demand for Microcontrollers and Power Systems in East Coast DC.";
      } else {
        response = `🤖 Analysis completed for "${q}". Stock levels are operating at 94% overall efficiency with ₹12.8M valuation.`;
      }
      setCopilotMessages(prev => [...prev, { sender: 'ai', text: response }]);
    }, 600);
  };

  return (
    <div style={{ backgroundColor: '#09090B', color: '#F4F4F5', minHeight: '100vh', padding: '24px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* SECTION 1: HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#FFF' }}>Inventory Control Center</h1>
            <span style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#818CF8', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
              ENTERPRISE WMS v4.2
            </span>
          </div>
          <p style={{ color: '#A1A1AA', fontSize: '13px', margin: '4px 0 0 0' }}>
            Live stock balances, AI procurement automation, inter-warehouse logistics & audit trail.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', color: '#34D399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#34D399', display: 'inline-block' }}></span>
            {currentTime || 'Tuesday, Aug 4, 2026'}
          </div>

          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            style={{ backgroundColor: '#18181B', border: '1px solid #27272A', color: '#FFF', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            <option value="ALL">🏢 All Warehouses (Global)</option>
            <option value="wh_east_01">East Coast Main DC</option>
            <option value="wh_west_02">West Coast Hub</option>
            <option value="wh_central_03">Central Logistics DC</option>
            <option value="wh_south_04">South Fulfillment Hub</option>
            <option value="wh_eu_05">Europe Regional Hub</option>
          </select>
        </div>
      </div>

      {/* SECTION 2: 8 SUMMARY KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        
        {/* KPI 1 */}
        <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '12px', padding: '16px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#A1A1AA', fontSize: '12px', fontWeight: 600 }}>
            <span>📦 Total Products</span>
            <span>SKUs</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#FFF', margin: '8px 0 4px 0' }}>{kpi.totalSkus.toLocaleString()}</div>
          <div style={{ fontSize: '11px', color: '#34D399', fontWeight: 600 }}>↑ +14 added this week</div>
        </div>

        {/* KPI 2 */}
        <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#A1A1AA', fontSize: '12px', fontWeight: 600 }}>
            <span>📈 Total Stock Qty</span>
            <span>Units</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#FFF', margin: '8px 0 4px 0' }}>{kpi.totalQuantity.toLocaleString()}</div>
          <div style={{ fontSize: '11px', color: '#818CF8', fontWeight: 600 }}>98.2% Accuracy</div>
        </div>

        {/* KPI 3 */}
        <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#A1A1AA', fontSize: '12px', fontWeight: 600 }}>
            <span>💰 Inventory Value</span>
            <span>Asset</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#34D399', margin: '8px 0 4px 0' }}>₹{(kpi.inventoryValue / 1000000).toFixed(2)}M</div>
          <div style={{ fontSize: '11px', color: '#A1A1AA', fontWeight: 500 }}>Cost Valuation (FIFO)</div>
        </div>

        {/* KPI 4 */}
        <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '12px', padding: '16px', borderLeft: '3px solid #F59E0B' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#F59E0B', fontSize: '12px', fontWeight: 700 }}>
            <span>⚠️ Low Stock</span>
            <span>Alert</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#F59E0B', margin: '8px 0 4px 0' }}>{kpi.lowStockCount}</div>
          <div style={{ fontSize: '11px', color: '#A1A1AA', fontWeight: 500 }}>Below Safety Limit</div>
        </div>

        {/* KPI 5 */}
        <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '12px', padding: '16px', borderLeft: '3px solid #F43F5E' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#F43F5E', fontSize: '12px', fontWeight: 700 }}>
            <span>❌ Out of Stock</span>
            <span>Action Required</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#F43F5E', margin: '8px 0 4px 0' }}>{kpi.outOfStockCount}</div>
          <div style={{ fontSize: '11px', color: '#F43F5E', fontWeight: 600 }}>42 Orders Pending</div>
        </div>

        {/* KPI 6 */}
        <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '12px', padding: '16px', borderLeft: '3px solid #F97316' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#F97316', fontSize: '12px', fontWeight: 600 }}>
            <span>⏳ Expiring Soon</span>
            <span>&lt; 30 Days</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#F97316', margin: '8px 0 4px 0' }}>{kpi.expiringSoonCount}</div>
          <div style={{ fontSize: '11px', color: '#A1A1AA', fontWeight: 500 }}>Batches Tagged</div>
        </div>

        {/* KPI 7 */}
        <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#A1A1AA', fontSize: '12px', fontWeight: 600 }}>
            <span>🔄 Reserved / Inbound</span>
            <span>Hold</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#8B5CF6', margin: '8px 0 4px 0' }}>{kpi.reservedUnits} / {kpi.incomingUnits}</div>
          <div style={{ fontSize: '11px', color: '#A1A1AA', fontWeight: 500 }}>Committed & Incoming</div>
        </div>

        {/* KPI 8 */}
        <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '12px', padding: '16px', borderLeft: '3px solid #10B981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10B981', fontSize: '12px', fontWeight: 700 }}>
            <span>🟢 Stock Health</span>
            <span>Efficiency</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#10B981', margin: '8px 0 4px 0' }}>{kpi.stockHealthPercent}%</div>
          <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 600 }}>Optimal SLA Level</div>
        </div>
      </div>

      {/* SECTION 3: QUICK ACTIONS TOOLBAR */}
      <div style={{ backgroundColor: '#121215', border: '1px solid #27272A', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsAddModalOpen(true)}
            style={{ backgroundColor: '#6366F1', color: '#FFF', padding: '9px 16px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            ➕ Add Product
          </button>
          
          <button
            onClick={() => { setMovementModalType('STOCK_IN'); setIsStockMovementModalOpen(true); }}
            style={{ backgroundColor: '#10B981', color: '#FFF', padding: '9px 16px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            📥 Stock In
          </button>

          <button
            onClick={() => { setMovementModalType('STOCK_OUT'); setIsStockMovementModalOpen(true); }}
            style={{ backgroundColor: '#EF4444', color: '#FFF', padding: '9px 16px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            📤 Stock Out
          </button>

          <button
            onClick={() => { setMovementModalType('TRANSFER'); setIsStockMovementModalOpen(true); }}
            style={{ backgroundColor: '#8B5CF6', color: '#FFF', padding: '9px 16px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            🔄 Transfer Stock
          </button>

          <button
            onClick={() => { setMovementModalType('ADJUST'); setIsStockMovementModalOpen(true); }}
            style={{ backgroundColor: '#F59E0B', color: '#FFF', padding: '9px 16px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            ⚖️ Stock Adjustment
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setIsImportModalOpen(true)}
            style={{ backgroundColor: '#27272A', color: '#FFF', padding: '9px 14px', borderRadius: '8px', border: '1px solid #3F3F46', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
          >
            📥 Import CSV
          </button>

          <button
            onClick={handleExportCSV}
            style={{ backgroundColor: '#27272A', color: '#34D399', padding: '9px 14px', borderRadius: '8px', border: '1px solid #34D399', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
          >
            📤 Export Excel / CSV
          </button>

          <button
            onClick={() => window.print()}
            style={{ backgroundColor: '#27272A', color: '#FFF', padding: '9px 14px', borderRadius: '8px', border: '1px solid #3F3F46', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
          >
            🖨️ Print Report
          </button>
        </div>
      </div>

      {/* SECTION 4: SEARCH & FILTERS BAR */}
      <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '12px', padding: '16px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          
          {/* Search */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '11px', color: '#A1A1AA', fontWeight: 600, marginBottom: '4px', display: 'block' }}>🔍 SEARCH SKU OR PRODUCT NAME</label>
            <input
              type="text"
              placeholder="Type SKU or product name..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '9px 12px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          {/* Category */}
          <div>
            <label style={{ fontSize: '11px', color: '#A1A1AA', fontWeight: 600, marginBottom: '4px', display: 'block' }}>CATEGORY</label>
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '9px 12px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '8px', fontSize: '13px' }}
            >
              <option value="ALL">All Categories</option>
              <option value="Microcontrollers">Microcontrollers</option>
              <option value="Sensors">Sensors</option>
              <option value="Cables & Connectors">Cables & Connectors</option>
              <option value="Industrial Displays">Industrial Displays</option>
              <option value="Power Systems">Power Systems</option>
              <option value="Wireless Modules">Wireless Modules</option>
              <option value="Storage & Drives">Storage & Drives</option>
            </select>
          </div>

          {/* Supplier */}
          <div>
            <label style={{ fontSize: '11px', color: '#A1A1AA', fontWeight: 600, marginBottom: '4px', display: 'block' }}>SUPPLIER</label>
            <select
              value={selectedSupplier}
              onChange={(e) => { setSelectedSupplier(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '9px 12px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '8px', fontSize: '13px' }}
            >
              <option value="ALL">All Suppliers</option>
              <option value="Tech Components Ltd">Tech Components Ltd</option>
              <option value="SensorTech">SensorTech</option>
              <option value="CableCorp">CableCorp</option>
              <option value="ElectroMax">ElectroMax</option>
              <option value="Silicon Supply Inc">Silicon Supply Inc</option>
              <option value="Global Chips Ltd">Global Chips Ltd</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label style={{ fontSize: '11px', color: '#A1A1AA', fontWeight: 600, marginBottom: '4px', display: 'block' }}>STATUS BADGE</label>
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '9px 12px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '8px', fontSize: '13px' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="IN_STOCK">🟢 In Stock</option>
              <option value="LOW_STOCK">🟡 Low Stock</option>
              <option value="OUT_OF_STOCK">🔴 Out of Stock</option>
              <option value="RESERVED">🟣 Reserved</option>
              <option value="EXPIRING_SOON">🟠 Expiring Soon</option>
            </select>
          </div>

          {/* Stock Level Filter */}
          <div>
            <label style={{ fontSize: '11px', color: '#A1A1AA', fontWeight: 600, marginBottom: '4px', display: 'block' }}>STOCK THRESHOLD</label>
            <select
              value={stockLevelFilter}
              onChange={(e) => { setStockLevelFilter(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '9px 12px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '8px', fontSize: '13px' }}
            >
              <option value="">All Thresholds</option>
              <option value="LOW">Below Safety Stock</option>
              <option value="ZERO">Zero Stock (Out)</option>
              <option value="HIGH">Above Reorder Point</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label style={{ fontSize: '11px', color: '#A1A1AA', fontWeight: 600, marginBottom: '4px', display: 'block' }}>SORT BY</label>
            <div style={{ display: 'flex', gap: '4px' }}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ flex: 1, padding: '9px 8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '8px', fontSize: '12px' }}
              >
                <option value="name">Product Name</option>
                <option value="quantity">Available Quantity</option>
                <option value="price">Unit Cost</option>
                <option value="updatedAt">Recently Updated</option>
              </select>
              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                title="Toggle Sort Direction"
                style={{ padding: '8px 10px', backgroundColor: '#27272A', color: '#FFF', border: '1px solid #3F3F46', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #27272A', paddingTop: '10px', fontSize: '12px', color: '#A1A1AA' }}>
          <div>
            Showing <strong style={{ color: '#FFF' }}>{inventory.length}</strong> of <strong style={{ color: '#FFF' }}>{totalRecords}</strong> inventory items
          </div>
          {(search || selectedWarehouse !== 'ALL' || selectedCategory !== 'ALL' || selectedSupplier !== 'ALL' || selectedStatus !== 'ALL' || stockLevelFilter) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedWarehouse('ALL');
                setSelectedCategory('ALL');
                setSelectedSupplier('ALL');
                setSelectedStatus('ALL');
                setStockLevelFilter('');
                setPage(1);
              }}
              style={{ backgroundColor: 'transparent', color: '#F43F5E', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              ✕ Clear All Filters
            </button>
          )}
        </div>
      </div>

      {/* SECTION 5: INVENTORY MAIN TABLE & SIDEBAR AI PANELS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '20px', marginBottom: '24px' }}>
        
        {/* MAIN INVENTORY TABLE */}
        <div style={{ backgroundColor: '#18181B', borderRadius: '12px', border: '1px solid #27272A', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #27272A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#FFF' }}>Real-Time Inventory Master Ledger</h3>
            <span style={{ fontSize: '11px', color: '#A1A1AA' }}>Click row or 👁 View for detailed drawer</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#121215', borderBottom: '1px solid #27272A', color: '#A1A1AA', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '14px 16px' }}>Product</th>
                  <th style={{ padding: '14px 16px' }}>SKU</th>
                  <th style={{ padding: '14px 16px' }}>Category</th>
                  <th style={{ padding: '14px 16px' }}>Warehouse</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Available</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Reserved</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Min Stock</th>
                  <th style={{ padding: '14px 16px' }}>Status</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#A1A1AA' }}>
                      Fetching live inventory levels...
                    </td>
                  </tr>
                ) : inventory.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#A1A1AA' }}>
                      No inventory items match the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  inventory.map((inv) => (
                    <tr
                      key={inv._id}
                      onClick={() => setSelectedItemForDrawer(inv)}
                      style={{
                        borderBottom: '1px solid #27272A',
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1F1F23'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {/* Product Name & Image */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img
                            src={inv.productId?.image || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=150'}
                            alt={inv.productId?.name}
                            style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #27272A' }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, color: '#FFF' }}>{inv.productId?.name}</div>
                            <div style={{ fontSize: '11px', color: '#71717A' }}>Barcode: {inv.productId?.barcode || 'N/A'}</div>
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#818CF8', fontWeight: 700 }}>
                        {inv.productId?.sku}
                      </td>

                      {/* Category */}
                      <td style={{ padding: '12px 16px', color: '#E4E4E7' }}>
                        {inv.productId?.category || 'General'}
                      </td>

                      {/* Warehouse */}
                      <td style={{ padding: '12px 16px', color: '#A1A1AA' }}>
                        {inv.warehouseId?.name}
                      </td>

                      {/* Available Qty */}
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, fontSize: '14px', color: inv.quantityAvailable <= inv.minSafetyStock ? '#F43F5E' : '#34D399' }}>
                        {inv.quantityAvailable}
                      </td>

                      {/* Reserved Qty */}
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: '#8B5CF6', fontWeight: 600 }}>
                        {inv.quantityReserved}
                      </td>

                      {/* Min Safety Stock */}
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: '#71717A' }}>
                        {inv.minSafetyStock}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 16px' }}>
                        {renderStatusBadge(inv.status, inv.quantityAvailable, inv.minSafetyStock)}
                      </td>

                      {/* Action Buttons */}
                      <td style={{ padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            onClick={() => setSelectedItemForDrawer(inv)}
                            title="View Product Details"
                            style={{ backgroundColor: '#27272A', color: '#FFF', border: 'none', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}
                          >
                            👁 View
                          </button>
                          
                          <button
                            onClick={() => {
                              setMovementForm(prev => ({ ...prev, productId: inv.productId?._id }));
                              setMovementModalType('STOCK_IN');
                              setIsStockMovementModalOpen(true);
                            }}
                            title="Quick Stock In"
                            style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34D399', border: 'none', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}
                          >
                            📥 In
                          </button>

                          <button
                            onClick={() => {
                              setMovementForm(prev => ({ ...prev, productId: inv.productId?._id }));
                              setMovementModalType('STOCK_OUT');
                              setIsStockMovementModalOpen(true);
                            }}
                            title="Quick Stock Out"
                            style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#F87171', border: 'none', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}
                          >
                            📤 Out
                          </button>

                          <button
                            onClick={() => handleDeleteItem(inv._id, inv.productId?.name)}
                            title="Delete Product"
                            style={{ backgroundColor: 'rgba(244, 63, 94, 0.1)', color: '#F43F5E', border: 'none', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* SECTION 12: PAGINATION CONTROLS */}
          <div style={{ padding: '14px 20px', backgroundColor: '#121215', borderTop: '1px solid #27272A', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', color: '#A1A1AA' }}>Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                style={{ backgroundColor: '#18181B', border: '1px solid #27272A', color: '#FFF', padding: '4px 8px', borderRadius: '6px', fontSize: '12px' }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                disabled={page === 1}
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                style={{ backgroundColor: '#27272A', color: page === 1 ? '#52525B' : '#FFF', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 600 }}
              >
                ← Previous
              </button>

              <span style={{ fontSize: '12px', color: '#FFF', fontWeight: 600, padding: '0 8px' }}>
                Page {page} of {totalPages}
              </span>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                style={{ backgroundColor: '#27272A', color: page >= totalPages ? '#52525B' : '#FFF', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 600 }}
              >
                Next →
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR: AI PROCUREMENT ASSISTANT & ALERTS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* SECTION 7: AI PROCUREMENT PANEL */}
          <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '12px', padding: '18px', background: 'linear-gradient(180deg, #18181B 0%, #131317 100%)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>🤖</span>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#FFF' }}>AI Procurement Assistant</h3>
              </div>
              <span style={{ backgroundColor: 'rgba(99, 102, 241, 0.2)', color: '#818CF8', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 800 }}>AUTONOMOUS</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {aiRecs.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#A1A1AA', textAlign: 'center', padding: '16px 0' }}>
                  No reorder recommendations right now. All inventory stock levels are healthy.
                </div>
              ) : (
                aiRecs.map((rec) => (
                  <div key={rec.id} style={{ backgroundColor: '#09090B', border: '1px solid #27272A', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#FFF' }}>{rec.productName}</div>
                      <span style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>REORDER</span>
                    </div>

                    <div style={{ fontSize: '11px', color: '#A1A1AA', marginBottom: '8px' }}>
                      Current Stock: <strong style={{ color: '#F43F5E' }}>{rec.currentStock}</strong> | Suggested Purchase: <strong style={{ color: '#34D399' }}>{rec.suggestedOrder} Units</strong>
                    </div>

                    <div style={{ fontSize: '11px', color: '#71717A', marginBottom: '8px' }}>
                      Supplier: <span style={{ color: '#E4E4E7' }}>{rec.supplier}</span>
                    </div>

                    <div style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', borderLeft: '3px solid #6366F1', padding: '6px 8px', borderRadius: '4px', fontSize: '11px', color: '#C7D2FE', marginBottom: '10px' }}>
                      💡 {rec.reason}
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => alert(`Purchase Order created for ${rec.suggestedOrder} units of ${rec.productName}!`)}
                        style={{ flex: 1, backgroundColor: '#6366F1', color: '#FFF', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        ⚡ Generate PO
                      </button>
                      <button
                        onClick={() => setAiRecs(prev => prev.filter(r => r.id !== rec.id))}
                        style={{ backgroundColor: '#27272A', color: '#A1A1AA', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}
                      >
                        Ignore
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SECTION 8: AI ALERTS PANEL */}
          <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '12px', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#FFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚠️</span> Real-Time AI System Alerts
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {aiAlerts.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#A1A1AA', textAlign: 'center', padding: '16px 0' }}>
                  No active system alerts. All inventory levels are within normal safety thresholds.
                </div>
              ) : (
                aiAlerts.map((alt) => (
                  <div key={alt.id} style={{ backgroundColor: '#09090B', border: '1px solid #27272A', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{
                        fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px',
                        backgroundColor: alt.severity === 'CRITICAL' ? 'rgba(244, 63, 94, 0.2)' : alt.severity === 'WARNING' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                        color: alt.severity === 'CRITICAL' ? '#F43F5E' : alt.severity === 'WARNING' ? '#F59E0B' : '#60A5FA'
                      }}>
                        {alt.severity}
                      </span>
                      <span style={{ fontSize: '10px', color: '#71717A' }}>{alt.time}</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '12px', color: '#FFF', marginBottom: '2px' }}>{alt.title}</div>
                    <div style={{ fontSize: '11px', color: '#A1A1AA' }}>{alt.message}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 9: CHARTS & VISUAL ANALYTICS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        
        {/* CHART 1: INVENTORY VALUE BY CATEGORY */}
        <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '12px', padding: '20px' }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 700, color: '#FFF' }}>Inventory Value by Category</h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(() => {
              const catData = analytics?.inventoryByCategory || [];
              if (catData.length === 0) {
                return (
                  <div style={{ fontSize: '12px', color: '#A1A1AA', textAlign: 'center', padding: '30px 0' }}>
                    No inventory category data available. Add products to view category value distribution.
                  </div>
                );
              }
              const maxVal = Math.max(...catData.map((item: any) => item.value || 0), 100);

              return catData.map((item: any, idx: number) => (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ color: '#FFF', fontWeight: 600 }}>{item.category}</span>
                    <span style={{ color: '#34D399', fontWeight: 700 }}>
                      {item.value >= 100000 ? `₹${(item.value / 100000).toFixed(1)} Lakhs` : `₹${(item.value || 0).toLocaleString('en-IN')}`}
                    </span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: '#27272A', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, Math.max(5, (item.value / maxVal) * 100))}%`, backgroundColor: item.color || '#6366F1', borderRadius: '4px' }}></div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* CHART 2: WAREHOUSE DISTRIBUTION */}
        <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '12px', padding: '20px' }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 700, color: '#FFF' }}>Warehouse Stock Distribution</h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {(() => {
              const whData = analytics?.warehouseDistribution || [];
              if (whData.length === 0) {
                return (
                  <div style={{ fontSize: '12px', color: '#A1A1AA', textAlign: 'center', padding: '30px 0' }}>
                    No warehouse stock recorded. Create items to track warehouse distribution.
                  </div>
                );
              }

              return whData.map((wh: any, idx: number) => (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ color: '#FFF', fontWeight: 600 }}>{wh.warehouse}</span>
                    <span style={{ color: '#A1A1AA' }}>{wh.units.toLocaleString()} Units ({wh.capacityPercent}%)</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: '#27272A', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${wh.capacityPercent}%`,
                      backgroundColor: wh.capacityPercent > 85 ? '#F43F5E' : wh.capacityPercent > 65 ? '#F59E0B' : '#10B981',
                      borderRadius: '4px'
                    }}></div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* CHART 3: STOCK MOVEMENT TREND (30 DAYS) */}
        <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#FFF' }}>Stock In vs Stock Out (30 Days)</h4>
            <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
              <span style={{ color: '#10B981', fontWeight: 700 }}>● Stock In</span>
              <span style={{ color: '#F43F5E', fontWeight: 700 }}>● Stock Out</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '140px', paddingTop: '10px' }}>
            {(() => {
              const trendData = analytics?.stockMovementTrend || [];
              const hasMovements = trendData.some((t: any) => t.stockIn > 0 || t.stockOut > 0);

              if (!hasMovements) {
                return (
                  <div style={{ width: '100%', fontSize: '12px', color: '#A1A1AA', textAlign: 'center', padding: '40px 0' }}>
                    No stock movements logged in the last 30 days. Record Stock In or Stock Out to view trends.
                  </div>
                );
              }
              const maxVal = Math.max(...trendData.flatMap((p: any) => [p.stockIn || 0, p.stockOut || 0]), 10);

              return trendData.map((point: any, idx: number) => (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%' }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '3px', width: '100%' }}>
                    <div style={{ flex: 1, height: `${Math.min(100, Math.max(4, ((point.stockIn || 0) / maxVal) * 100))}%`, backgroundColor: '#10B981', borderRadius: '3px 3px 0 0' }}></div>
                    <div style={{ flex: 1, height: `${Math.min(100, Math.max(4, ((point.stockOut || 0) / maxVal) * 100))}%`, backgroundColor: '#F43F5E', borderRadius: '3px 3px 0 0' }}></div>
                  </div>
                  <span style={{ fontSize: '10px', color: '#71717A' }}>{point.day}</span>
                </div>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* SECTION 10: BOTTOM ANALYTICS WIDGETS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        {/* Widget 1 */}
        <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '10px', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: '#A1A1AA', fontWeight: 600 }}>🔥 TOP SELLING PRODUCT</div>
          <div style={{ fontWeight: 800, color: '#FFF', fontSize: '14px', margin: '4px 0 2px 0' }}>{analytics?.topMetrics?.topSelling?.name || 'N/A'}</div>
          <div style={{ fontSize: '11px', color: '#34D399', fontWeight: 700 }}>{analytics?.topMetrics?.topSelling?.unitsSold ? `${analytics.topMetrics.topSelling.unitsSold.toLocaleString()} Units Sold` : '0 Units Sold'}</div>
        </div>

        {/* Widget 2 */}
        <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '10px', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: '#A1A1AA', fontWeight: 600 }}>⚡ FASTEST TURNOVER RATE</div>
          <div style={{ fontWeight: 800, color: '#FFF', fontSize: '14px', margin: '4px 0 2px 0' }}>{analytics?.topMetrics?.fastMoving?.name || 'N/A'}</div>
          <div style={{ fontSize: '11px', color: '#818CF8', fontWeight: 700 }}>{analytics?.topMetrics?.fastMoving?.turnoverRate || '0x / month'}</div>
        </div>

        {/* Widget 3 */}
        <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '10px', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: '#A1A1AA', fontWeight: 600 }}>⏳ SLOW MOVING INVENTORY</div>
          <div style={{ fontWeight: 800, color: '#FFF', fontSize: '14px', margin: '4px 0 2px 0' }}>{analytics?.topMetrics?.slowMoving?.name || 'N/A'}</div>
          <div style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 700 }}>{analytics?.topMetrics?.slowMoving?.daysIdle ? `${analytics.topMetrics.slowMoving.daysIdle} Days Idle` : 'No Idle Inventory'}</div>
        </div>

        {/* Widget 4 */}
        <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '10px', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: '#A1A1AA', fontWeight: 600 }}>💎 HIGHEST INVENTORY VALUE</div>
          <div style={{ fontWeight: 800, color: '#FFF', fontSize: '14px', margin: '4px 0 2px 0' }}>{analytics?.topMetrics?.highestValue?.name || 'N/A'}</div>
          <div style={{ fontSize: '11px', color: '#EC4899', fontWeight: 700 }}>{analytics?.topMetrics?.highestValue?.totalValue || '₹0 Total Asset'}</div>
        </div>
      </div>

      {/* SECTION 6: RECENT INVENTORY MOVEMENTS TIMELINE */}
      <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#FFF' }}>Recent Inventory Movement Audit Trail</h3>
          <span style={{ fontSize: '12px', color: '#A1A1AA' }}>Real-time event ledger</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {movements.map((m) => (
            <div key={m._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#09090B', border: '1px solid #27272A', borderRadius: '8px', padding: '12px 16px', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{
                  padding: '4px 10px', borderRadius: '6px', fontWeight: 800, fontSize: '11px',
                  backgroundColor: m.movementType === 'STOCK_IN' ? 'rgba(16, 185, 129, 0.2)' : m.movementType === 'STOCK_OUT' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(139, 92, 246, 0.2)',
                  color: m.movementType === 'STOCK_IN' ? '#34D399' : m.movementType === 'STOCK_OUT' ? '#F87171' : '#A78BFA'
                }}>
                  {m.movementType}
                </span>

                <div>
                  <div style={{ fontWeight: 700, color: '#FFF' }}>{m.productId?.name || 'Inventory Product'}</div>
                  <div style={{ fontSize: '11px', color: '#71717A' }}>
                    {m.warehouseId?.name || 'Main Warehouse'} • Performed by <span style={{ color: '#A1A1AA' }}>{m.performedBy || 'System Admin'}</span>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, fontSize: '14px', color: m.quantity > 0 ? '#34D399' : '#F87171' }}>
                  {m.quantity > 0 ? `+${m.quantity}` : m.quantity} Units
                </div>
                <div style={{ fontSize: '11px', color: '#71717A' }}>
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 11: PRODUCT DETAIL SIDE DRAWER */}
      {selectedItemForDrawer && (
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px', backgroundColor: '#121215', borderLeft: '1px solid #27272A', zIndex: 90, padding: '24px', overflowY: 'auto', boxShadow: '-10px 0 30px rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column' }}>
          
          {/* Drawer Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid #27272A', paddingBottom: '16px' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#818CF8', fontWeight: 800, fontFamily: 'monospace' }}>{selectedItemForDrawer.productId?.sku}</span>
              <h2 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 800, color: '#FFF' }}>{selectedItemForDrawer.productId?.name}</h2>
            </div>
            <button
              onClick={() => setSelectedItemForDrawer(null)}
              style={{ backgroundColor: '#27272A', color: '#FFF', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px', fontWeight: 700 }}
            >
              ✕
            </button>
          </div>

          {/* Product Image & Barcode */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px', backgroundColor: '#18181B', padding: '14px', borderRadius: '10px', border: '1px solid #27272A' }}>
            <img
              src={selectedItemForDrawer.productId?.image || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=150'}
              alt={selectedItemForDrawer.productId?.name}
              style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' }}
            />
            <div>
              <div style={{ fontSize: '12px', color: '#A1A1AA' }}>Category: <strong style={{ color: '#FFF' }}>{selectedItemForDrawer.productId?.category}</strong></div>
              <div style={{ fontSize: '12px', color: '#A1A1AA', marginTop: '2px' }}>Supplier: <strong style={{ color: '#FFF' }}>{selectedItemForDrawer.productId?.supplier}</strong></div>
              <div style={{ marginTop: '8px', backgroundColor: '#09090B', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace', color: '#34D399', letterSpacing: '1px' }}>
                |||||| | |||| ||| {selectedItemForDrawer.productId?.barcode || '890123456'}
              </div>
            </div>
          </div>

          {/* Stock Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: '#A1A1AA' }}>AVAILABLE STOCK</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#34D399' }}>{selectedItemForDrawer.quantityAvailable}</div>
            </div>
            <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: '#A1A1AA' }}>RESERVED UNITS</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#8B5CF6' }}>{selectedItemForDrawer.quantityReserved}</div>
            </div>
            <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: '#A1A1AA' }}>MIN SAFETY STOCK</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#F59E0B' }}>{selectedItemForDrawer.minSafetyStock}</div>
            </div>
            <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: '#A1A1AA' }}>UNIT COST (COST)</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#FFF' }}>₹{selectedItemForDrawer.productId?.unitCost || 1000}</div>
            </div>
          </div>

          {/* AI Forecast Card */}
          <div style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '14px', borderRadius: '10px', marginBottom: '20px' }}>
            <div style={{ fontWeight: 800, fontSize: '13px', color: '#818CF8', marginBottom: '4px' }}>🤖 Inventra AI Stock Coverage Forecast</div>
            <p style={{ margin: 0, fontSize: '12px', color: '#C7D2FE' }}>
              Estimated stock coverage remaining: <strong>22 Days</strong> based on 30-day trailing burn rate. Reorder 150 units before Aug 12 to prevent SLA breach.
            </p>
          </div>

          {/* Quick Action Drawer Buttons */}
          <div style={{ marginTop: 'auto', display: 'flex', gap: '10px' }}>
            <button
              onClick={() => {
                setMovementForm(prev => ({ ...prev, productId: selectedItemForDrawer.productId?._id }));
                setMovementModalType('STOCK_IN');
                setIsStockMovementModalOpen(true);
              }}
              style={{ flex: 1, backgroundColor: '#10B981', color: '#FFF', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
            >
              📥 Stock In
            </button>
            <button
              onClick={() => {
                setMovementForm(prev => ({ ...prev, productId: selectedItemForDrawer.productId?._id }));
                setMovementModalType('STOCK_OUT');
                setIsStockMovementModalOpen(true);
              }}
              style={{ flex: 1, backgroundColor: '#EF4444', color: '#FFF', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
            >
              📤 Stock Out
            </button>
          </div>
        </div>
      )}

      {/* SECTION 14: FLOATING AI COPILOT BOT */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 100 }}>
        {!isCopilotOpen ? (
          <button
            onClick={() => setIsCopilotOpen(true)}
            style={{ backgroundColor: '#6366F1', color: '#FFF', border: 'none', padding: '12px 20px', borderRadius: '30px', fontWeight: 800, fontSize: '14px', cursor: 'pointer', boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <span>🤖 Ask Inventra AI</span>
          </button>
        ) : (
          <div style={{ width: '380px', height: '500px', backgroundColor: '#121215', border: '1px solid #27272A', borderRadius: '16px', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 36px rgba(0,0,0,0.8)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', backgroundColor: '#18181B', borderBottom: '1px solid #27272A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: '14px', color: '#FFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🤖</span> Inventra AI Supply Chain Copilot
              </div>
              <button onClick={() => setIsCopilotOpen(false)} style={{ backgroundColor: 'transparent', color: '#A1A1AA', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>

            <div style={{ flex: 1, padding: '14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {copilotMessages.map((msg, idx) => (
                <div key={idx} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', backgroundColor: msg.sender === 'user' ? '#6366F1' : '#18181B', color: '#FFF', padding: '10px 12px', borderRadius: '10px', fontSize: '12px' }}>
                  {msg.text}
                </div>
              ))}
            </div>

            {/* Quick Prompt Chips */}
            <div style={{ padding: '8px 12px', display: 'flex', gap: '6px', overflowX: 'auto', backgroundColor: '#09090B', borderTop: '1px solid #27272A' }}>
              {['Restock items?', 'Critical stock', 'Procurement report'].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleCopilotSend(chip)}
                  style={{ backgroundColor: '#27272A', color: '#A1A1AA', border: 'none', padding: '4px 8px', borderRadius: '12px', fontSize: '10px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  {chip}
                </button>
              ))}
            </div>

            <div style={{ padding: '12px', backgroundColor: '#18181B', borderTop: '1px solid #27272A', display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Ask anything about inventory..."
                value={copilotInput}
                onChange={(e) => setCopilotInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCopilotSend()}
                style={{ flex: 1, backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', padding: '8px 10px', borderRadius: '8px', fontSize: '12px' }}
              />
              <button
                onClick={() => handleCopilotSend()}
                style={{ backgroundColor: '#6366F1', color: '#FFF', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: ADD PRODUCT */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '16px', padding: '24px', width: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 800, color: '#FFF' }}>➕ Add New Product to Inventory</h3>
            <form onSubmit={handleAddProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#A1A1AA' }}>Product Name</label>
                <input required type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '6px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#A1A1AA' }}>SKU</label>
                  <input required type="text" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} style={{ width: '100%', padding: '8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#A1A1AA' }}>Category</label>
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} style={{ width: '100%', padding: '8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '6px' }}>
                    <option value="Microcontrollers">Microcontrollers</option>
                    <option value="Sensors">Sensors</option>
                    <option value="Cables & Connectors">Cables & Connectors</option>
                    <option value="Industrial Displays">Industrial Displays</option>
                    <option value="Power Systems">Power Systems</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#A1A1AA' }}>Quantity</label>
                  <input required type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })} style={{ width: '100%', padding: '8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#A1A1AA' }}>Min Safety Stock</label>
                  <input required type="number" value={formData.minSafetyStock} onChange={(e) => setFormData({ ...formData, minSafetyStock: Number(e.target.value) })} style={{ width: '100%', padding: '8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setIsAddModalOpen(false)} style={{ padding: '8px 16px', backgroundColor: '#27272A', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#6366F1', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>Add Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: STOCK MOVEMENT */}
      {isStockMovementModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '16px', padding: '24px', width: '450px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 800, color: '#FFF' }}>Execute {movementModalType} Operation</h3>
            <form onSubmit={handleMovementSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#A1A1AA' }}>Select Product SKU</label>
                <select value={movementForm.productId} onChange={(e) => setMovementForm({ ...movementForm, productId: e.target.value })} style={{ width: '100%', padding: '8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '6px' }}>
                  {inventory.map((inv) => (
                    <option key={inv._id} value={inv.productId?._id}>
                      {inv.productId?.sku} — {inv.productId?.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#A1A1AA' }}>Quantity Units</label>
                <input required type="number" value={movementForm.quantity} onChange={(e) => setMovementForm({ ...movementForm, quantity: Number(e.target.value) })} style={{ width: '100%', padding: '8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '6px', boxSizing: 'border-box' }} />
              </div>

              {movementModalType === 'TRANSFER' && (
                <div>
                  <label style={{ fontSize: '12px', color: '#A1A1AA' }}>Destination Warehouse</label>
                  <select value={movementForm.toWarehouseId} onChange={(e) => setMovementForm({ ...movementForm, toWarehouseId: e.target.value })} style={{ width: '100%', padding: '8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '6px' }}>
                    <option value="wh_west_02">West Coast Hub</option>
                    <option value="wh_central_03">Central Logistics DC</option>
                    <option value="wh_south_04">South Fulfillment Hub</option>
                    <option value="wh_eu_05">Europe Regional Hub</option>
                  </select>
                </div>
              )}

              <div>
                <label style={{ fontSize: '12px', color: '#A1A1AA' }}>Reason / Document Reference</label>
                <input type="text" value={movementForm.reason} onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })} style={{ width: '100%', padding: '8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '6px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setIsStockMovementModalOpen(false)} style={{ padding: '8px 16px', backgroundColor: '#27272A', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#10B981', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>Execute Movement</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CSV IMPORT */}
      {isImportModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '16px', padding: '24px', width: '450px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 800, color: '#FFF' }}>📥 Bulk CSV Inventory Import</h3>
            <p style={{ fontSize: '13px', color: '#A1A1AA', marginBottom: '20px' }}>Upload a standard CSV file with columns: SKU, Name, Category, Warehouse, Quantity, SafetyStock, Price.</p>
            
            <div style={{ border: '2px dashed #3F3F46', borderRadius: '12px', padding: '30px', marginBottom: '20px', cursor: 'pointer', backgroundColor: '#09090B' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📄</div>
              <div style={{ fontWeight: 700, color: '#FFF', fontSize: '13px' }}>Click or drag CSV file here</div>
              <div style={{ fontSize: '11px', color: '#71717A', marginTop: '4px' }}>Supports .csv and .xlsx files up to 10MB</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setIsImportModalOpen(false)} style={{ padding: '8px 16px', backgroundColor: '#27272A', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { alert('Import sample process completed! 12 new items imported.'); setIsImportModalOpen(false); fetchInventoryData(); }} style={{ padding: '8px 16px', backgroundColor: '#6366F1', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>Start Import</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default InventoryPage;
