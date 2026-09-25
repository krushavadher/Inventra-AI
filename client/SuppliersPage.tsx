import React, { useState, useEffect } from 'react';
import { apiFetch } from './apiClient';

export interface SupplierContact {
  primaryName: string;
  email: string;
  phone: string;
  designation?: string;
}

export interface SupplierLeadTime {
  defaultDays: number;
  minDays?: number;
  maxDays?: number;
  avgVarianceDays?: number;
}

export interface SupplierPerformance {
  otifScore: number;
  defectRatePercent: number;
  totalOrdersCompleted: number;
  totalSpendAmount: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface Supplier {
  _id: string;
  code: string;
  name: string;
  taxId?: string;
  categories?: string[];
  contact: SupplierContact;
  paymentTerms: string;
  leadTime: SupplierLeadTime;
  performance: SupplierPerformance;
  status: 'ACTIVE' | 'UNDER_REVIEW' | 'INACTIVE';
  createdAt?: string;
}

export const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('otif');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Drawer & Modal States
  const [selectedSupplierForDrawer, setSelectedSupplierForDrawer] = useState<Supplier | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    taxId: '',
    primaryName: '',
    email: '',
    phone: '',
    leadTimeDays: 7,
    paymentTerms: 'NET_30'
  });

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append('search', searchQuery);
      if (riskFilter !== 'ALL') queryParams.append('riskLevel', riskFilter);

      const res = await apiFetch(`/suppliers?${queryParams.toString()}`);
      if (res.data) {
        setSuppliers(res.data);
      }
    } catch (err) {
      console.warn('Suppliers API fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [searchQuery, riskFilter]);

  // Handle Add Supplier Submit
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = {
        code: formData.code.toUpperCase() || `SUP-${Math.floor(1000 + Math.random() * 9000)}`,
        name: formData.name,
        taxId: formData.taxId || `TAX-${Date.now().toString().slice(-6)}`,
        contact: {
          primaryName: formData.primaryName,
          email: formData.email,
          phone: formData.phone || '+1 555 019 0000'
        },
        paymentTerms: formData.paymentTerms,
        leadTime: {
          defaultDays: Number(formData.leadTimeDays),
          minDays: 3,
          maxDays: 14
        }
      };

      await apiFetch('/suppliers', {
        method: 'POST',
        body: JSON.stringify(body)
      });

      setIsModalOpen(false);
      setFormData({ code: '', name: '', taxId: '', primaryName: '', email: '', phone: '', leadTimeDays: 7, paymentTerms: 'NET_30' });
      fetchSuppliers();
      alert('Supplier Master Record created successfully in MongoDB!');
    } catch (err: any) {
      alert(err.message || 'Error creating supplier');
    }
  };

  // Delete Supplier
  const handleDeleteSupplier = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove '${name}' from vendor records?`)) return;
    try {
      await apiFetch(`/suppliers/${id}`, { method: 'DELETE' });
      fetchSuppliers();
      if (selectedSupplierForDrawer?._id === id) setSelectedSupplierForDrawer(null);
    } catch (err: any) {
      alert(err.message || 'Vendor deleted');
      fetchSuppliers();
    }
  };

  // Filtered & Sorted Suppliers List
  const processedSuppliers = suppliers
    .filter(s => {
      if (paymentFilter !== 'ALL' && s.paymentTerms !== paymentFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const order = sortOrder === 'desc' ? -1 : 1;
      if (sortBy === 'otif') return ((a.performance?.otifScore || 0) - (b.performance?.otifScore || 0)) * order;
      if (sortBy === 'spend') return ((a.performance?.totalSpendAmount || 0) - (b.performance?.totalSpendAmount || 0)) * order;
      if (sortBy === 'leadTime') return ((a.leadTime?.defaultDays || 0) - (b.leadTime?.defaultDays || 0)) * order;
      if (sortBy === 'name') return a.name.localeCompare(b.name) * order;
      return 0;
    });

  // Calculate Summary KPI Metrics Dynamically from DB Data
  const totalVendors = suppliers.length;
  const avgOtifScore = totalVendors > 0
    ? (suppliers.reduce((acc, s) => acc + (s.performance?.otifScore || 0), 0) / totalVendors).toFixed(1)
    : '0.0';
  const totalYtdSpend = suppliers.reduce((acc, s) => acc + (s.performance?.totalSpendAmount || 0), 0);
  const avgDefectRate = totalVendors > 0
    ? (suppliers.reduce((acc, s) => acc + (s.performance?.defectRatePercent || 0), 0) / totalVendors).toFixed(2)
    : '0.00';

  const lowRiskCount = suppliers.filter(s => s.performance?.riskLevel === 'LOW').length;
  const mediumRiskCount = suppliers.filter(s => s.performance?.riskLevel === 'MEDIUM').length;
  const highRiskCount = suppliers.filter(s => s.performance?.riskLevel === 'HIGH').length;

  return (
    <div style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)', minHeight: '100vh', padding: '32px 40px' }}>
      
      {/* HEADER BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 className="page-title">Supplier Master & OTIF Scorecards</h1>
            <span className="badge badge-info">
              VENDOR SLA ENGINE
            </span>
          </div>
          <p className="subtext-muted" style={{ marginTop: '4px' }}>
            Vendor performance scorecards, On-Time In-Full (OTIF) SLA tracking, defect rate auditing, and procurement spend analysis.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add New Vendor
        </button>
      </div>

      {/* DYNAMIC KPI SCORECARD CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '32px', marginBottom: '40px' }}>
        <div>
          <div className="kpi-label">Contracted Vendors</div>
          <div className="kpi-value" style={{ marginTop: '6px' }}>{totalVendors}</div>
          <div className="subtext-muted" style={{ marginTop: '6px' }}>Active Master Records</div>
        </div>

        <div>
          <div className="kpi-label">Avg Vendor OTIF Score</div>
          <div className="kpi-value-hero" style={{ color: Number(avgOtifScore) >= 95 ? 'var(--accent-cool)' : 'var(--accent-risk)', marginTop: '6px' }}>
            {avgOtifScore}%
          </div>
          <div style={{ marginTop: '6px' }}>
            <span className="badge badge-success">On-Time In-Full SLA</span>
          </div>
        </div>

        <div>
          <div className="kpi-label">Total YTD Spend</div>
          <div className="kpi-value" style={{ marginTop: '6px' }}>
            ₹{totalYtdSpend > 0 ? (totalYtdSpend / 100000).toFixed(2) + ' Lakhs' : '0.00'}
          </div>
          <div className="subtext-muted" style={{ marginTop: '6px' }}>Procurement Spend</div>
        </div>

        <div>
          <div className="kpi-label">Vendor Risk Levels</div>
          <div className="kpi-value" style={{ marginTop: '6px' }}>
            {lowRiskCount} <span style={{ fontSize: '14px', color: 'var(--accent-cool)', fontWeight: 600 }}>Low</span> / {highRiskCount} <span style={{ fontSize: '14px', color: 'var(--accent-risk)', fontWeight: 600 }}>High</span>
          </div>
          <div className="subtext-muted" style={{ marginTop: '6px' }}>Defect Avg: {avgDefectRate}%</div>
        </div>
      </div>

      {/* SEARCH & MULTI-FILTER TOOLBAR */}
      <div className="panel-bordered" style={{ padding: '16px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          
          {/* Search */}
          <div style={{ gridColumn: 'span 2' }}>
            <label className="kpi-label" style={{ marginBottom: '4px', display: 'block' }}>Search Vendor Name or Code</label>
            <input
              type="text"
              placeholder="Type vendor code, company name, contact email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-dark"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {/* Risk Filter */}
          <div>
            <label className="kpi-label" style={{ marginBottom: '4px', display: 'block' }}>Risk Rating</label>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="input-dark"
              style={{ width: '100%' }}
            >
              <option value="ALL">All Risk Ratings</option>
              <option value="LOW">🟢 Low Risk (&gt;95% OTIF)</option>
              <option value="MEDIUM">🟡 Medium Risk (85-95% OTIF)</option>
              <option value="HIGH">🔴 High Risk (&lt;85% OTIF)</option>
            </select>
          </div>

          {/* Payment Terms Filter */}
          <div>
            <label className="kpi-label" style={{ marginBottom: '4px', display: 'block' }}>Payment Terms</label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="input-dark"
              style={{ width: '100%' }}
            >
              <option value="ALL">All Payment Terms</option>
              <option value="NET_15">Net 15 Days</option>
              <option value="NET_30">Net 30 Days</option>
              <option value="NET_60">Net 60 Days</option>
              <option value="DUE_ON_RECEIPT">Due on Receipt</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="kpi-label" style={{ marginBottom: '4px', display: 'block' }}>Sort By</label>
            <div style={{ display: 'flex', gap: '4px' }}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input-dark"
                style={{ flex: 1 }}
              >
                <option value="otif">OTIF Rating</option>
                <option value="spend">Total Spend</option>
                <option value="leadTime">Lead Time</option>
                <option value="name">Vendor Name</option>
              </select>
              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="btn-secondary"
                style={{ padding: '0 10px' }}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SUPPLIER MASTER TABLE OR CLEAN EMPTY STATE */}
      {loading ? (
        <div style={{ color: 'var(--text-muted)' }}>
          Fetching vendor scorecards from MongoDB...
        </div>
      ) : processedSuppliers.length === 0 ? (
        <div className="empty-state-box">
          <div className="empty-state-icon">🤝</div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>No Vendor Records Found</h2>
          <p className="subtext-muted" style={{ maxWidth: '480px', margin: '0 auto 20px auto' }}>
            Your vendor database is clean. Create your first supplier master record to begin tracking lead-time SLAs, OTIF scorecards, and procurement spend.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary"
          >
            ➕ Create First Vendor Master Record
          </button>
        </div>
      ) : (
        <div className="panel-bordered" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Vendor Master Ledger & Performance Scorecards</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Click 👁 Scorecard for detailed vendor metrics</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#121215', borderBottom: '1px solid #27272A', color: '#A1A1AA', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '14px 16px' }}>Vendor Code</th>
                  <th style={{ padding: '14px 16px' }}>Company Name</th>
                  <th style={{ padding: '14px 16px' }}>Primary Contact</th>
                  <th style={{ padding: '14px 16px' }}>Lead Time</th>
                  <th style={{ padding: '14px 16px' }}>OTIF Score</th>
                  <th style={{ padding: '14px 16px' }}>Defect %</th>
                  <th style={{ padding: '14px 16px' }}>Risk Rating</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Total Spend (₹)</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {processedSuppliers.map((sup) => {
                  const otif = sup.performance?.otifScore || 98;
                  const otifBg = otif >= 95 ? 'rgba(43, 180, 160, 0.15)' : otif >= 85 ? 'rgba(240, 168, 40, 0.15)' : 'rgba(229, 83, 75, 0.15)';
                  const otifColor = otif >= 95 ? 'var(--accent-cool)' : otif >= 85 ? 'var(--accent-primary)' : 'var(--accent-risk)';

                  const risk = sup.performance?.riskLevel || 'LOW';
                  const riskBg = risk === 'LOW' ? 'rgba(43, 180, 160, 0.15)' : risk === 'MEDIUM' ? 'rgba(240, 168, 40, 0.15)' : 'rgba(229, 83, 75, 0.15)';
                  const riskColor = risk === 'LOW' ? 'var(--accent-cool)' : risk === 'MEDIUM' ? 'var(--accent-primary)' : 'var(--accent-risk)';

                  return (
                    <tr
                      key={sup._id}
                      onClick={() => setSelectedSupplierForDrawer(sup)}
                      className="table-row"
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="table-cell" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                        {sup.code}
                      </td>

                      <td className="table-cell">
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{sup.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tax ID: {sup.taxId || 'N/A'}</div>
                      </td>

                      <td className="table-cell">
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{sup.contact?.primaryName}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{sup.contact?.email}</div>
                      </td>

                      <td className="table-cell" style={{ color: 'var(--text-muted)' }}>
                        {sup.leadTime?.defaultDays || 7} Days
                      </td>

                      <td className="table-cell">
                        <span style={{ backgroundColor: otifBg, color: otifColor, padding: '4px 10px', borderRadius: '4px', fontWeight: 600, fontSize: '12px' }}>
                          {otif}%
                        </span>
                      </td>

                      <td className="table-cell" style={{ color: 'var(--text-muted)' }}>
                        {sup.performance?.defectRatePercent || 0.1}%
                      </td>

                      <td className="table-cell">
                        <span style={{ backgroundColor: riskBg, color: riskColor, padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                          {risk} RISK
                        </span>
                      </td>

                      <td className="table-cell tabular-nums" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>
                        ₹{(sup.performance?.totalSpendAmount || 0).toLocaleString('en-IN')}
                      </td>

                      <td className="table-cell" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            onClick={() => setSelectedSupplierForDrawer(sup)}
                            className="btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                          >
                            👁 Scorecard
                          </button>
                          <button
                            onClick={() => handleDeleteSupplier(sup._id, sup.name)}
                            className="btn-danger"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VENDOR SCORECARD SIDE DRAWER */}
      {selectedSupplierForDrawer && (
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px', backgroundColor: 'var(--bg-base)', borderLeft: '1px solid var(--border)', zIndex: 90, padding: '24px', overflowY: 'auto', boxShadow: '-10px 0 30px rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>{selectedSupplierForDrawer.code}</span>
              <h2 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedSupplierForDrawer.name}</h2>
            </div>
            <button
              onClick={() => setSelectedSupplierForDrawer(null)}
              className="btn-secondary"
              style={{ padding: '4px 8px' }}
            >
              ✕
            </button>
          </div>

          {/* Contact Details */}
          <div className="panel-bordered" style={{ marginBottom: '20px' }}>
            <div className="kpi-label" style={{ marginBottom: '8px' }}>Primary Vendor Contact</div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{selectedSupplierForDrawer.contact?.primaryName}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>✉️ {selectedSupplierForDrawer.contact?.email}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>📞 {selectedSupplierForDrawer.contact?.phone}</div>
          </div>

          {/* Performance Gauges */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div className="panel-bordered" style={{ padding: '16px' }}>
              <div className="kpi-label">OTIF SLA Rating</div>
              <div className="kpi-value" style={{ color: 'var(--accent-cool)', marginTop: '4px' }}>
                {selectedSupplierForDrawer.performance?.otifScore || 98}%
              </div>
            </div>

            <div className="panel-bordered" style={{ padding: '16px' }}>
              <div className="kpi-label">Defect Rate</div>
              <div className="kpi-value" style={{ color: 'var(--accent-primary)', marginTop: '4px' }}>
                {selectedSupplierForDrawer.performance?.defectRatePercent || 0.1}%
              </div>
            </div>

            <div className="panel-bordered" style={{ padding: '16px' }}>
              <div className="kpi-label">Guaranteed Lead Time</div>
              <div className="kpi-value" style={{ marginTop: '4px' }}>
                {selectedSupplierForDrawer.leadTime?.defaultDays || 7} Days
              </div>
            </div>

            <div className="panel-bordered" style={{ padding: '16px' }}>
              <div className="kpi-label">Payment Terms</div>
              <div className="kpi-value" style={{ marginTop: '4px', fontSize: '18px' }}>
                {selectedSupplierForDrawer.paymentTerms?.replace('_', ' ')}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', gap: '10px' }}>
            <button
              onClick={() => alert(`Creating Purchase Order for ${selectedSupplierForDrawer.name}`)}
              className="btn-primary"
              style={{ flex: 1, padding: '12px' }}
            >
              📝 Create Purchase Order
            </button>
          </div>
        </div>
      )}

      {/* ADD VENDOR MODAL */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(13, 17, 23, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div className="panel-bordered" style={{ padding: '28px', width: '480px' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>Add New Vendor Master Record</h3>
            <form onSubmit={handleCreateSupplier} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="kpi-label" style={{ marginBottom: '6px', display: 'block' }}>Company Name</label>
                <input required type="text" placeholder="e.g. TechComponents Inc." value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-dark" style={{ width: '100%' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="kpi-label" style={{ marginBottom: '6px', display: 'block' }}>Vendor Code</label>
                  <input required type="text" placeholder="e.g. SUP-8840" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className="input-dark" style={{ width: '100%' }} />
                </div>
                <div>
                  <label className="kpi-label" style={{ marginBottom: '6px', display: 'block' }}>Tax ID / GST</label>
                  <input type="text" placeholder="e.g. TAX-994810" value={formData.taxId} onChange={(e) => setFormData({ ...formData, taxId: e.target.value })} className="input-dark" style={{ width: '100%' }} />
                </div>
              </div>

              <div>
                <label className="kpi-label" style={{ marginBottom: '6px', display: 'block' }}>Primary Contact Name</label>
                <input required type="text" placeholder="e.g. Robert Vance" value={formData.primaryName} onChange={(e) => setFormData({ ...formData, primaryName: e.target.value })} className="input-dark" style={{ width: '100%' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="kpi-label" style={{ marginBottom: '6px', display: 'block' }}>Contact Email</label>
                  <input required type="email" placeholder="orders@vendor.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input-dark" style={{ width: '100%' }} />
                </div>
                <div>
                  <label className="kpi-label" style={{ marginBottom: '6px', display: 'block' }}>Contact Phone</label>
                  <input type="text" placeholder="+1 555 019 2831" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input-dark" style={{ width: '100%' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="kpi-label" style={{ marginBottom: '6px', display: 'block' }}>Lead Time (Days)</label>
                  <input type="number" min={1} value={formData.leadTimeDays} onChange={(e) => setFormData({ ...formData, leadTimeDays: Number(e.target.value) })} className="input-dark" style={{ width: '100%' }} />
                </div>
                <div>
                  <label className="kpi-label" style={{ marginBottom: '6px', display: 'block' }}>Payment Terms</label>
                  <select value={formData.paymentTerms} onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })} className="input-dark" style={{ width: '100%' }}>
                    <option value="NET_15">Net 15 Days</option>
                    <option value="NET_30">Net 30 Days</option>
                    <option value="NET_60">Net 60 Days</option>
                    <option value="DUE_ON_RECEIPT">Due on Receipt</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Vendor</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SuppliersPage;
