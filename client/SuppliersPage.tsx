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
    <div style={{ backgroundColor: '#09090B', color: '#F4F4F5', minHeight: '100vh', padding: '24px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* HEADER BAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#FFF' }}>Supplier Master & OTIF Scorecards</h1>
            <span style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#818CF8', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
              VENDOR SLA ENGINE
            </span>
          </div>
          <p style={{ color: '#A1A1AA', fontSize: '13px', margin: '4px 0 0 0' }}>
            Vendor performance scorecards, On-Time In-Full (OTIF) SLA tracking, defect rate auditing, and procurement spend analysis.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          style={{ backgroundColor: '#6366F1', color: '#FFF', padding: '10px 18px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          ➕ Add New Vendor
        </button>
      </div>

      {/* DYNAMIC KPI SCORECARD CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', padding: '18px', borderRadius: '12px' }}>
          <div style={{ fontSize: '12px', color: '#A1A1AA', fontWeight: 600 }}>🤝 Contracted Vendors</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#FFF', marginTop: '4px' }}>{totalVendors}</div>
          <div style={{ fontSize: '11px', color: '#818CF8', marginTop: '4px', fontWeight: 600 }}>Active Master Records</div>
        </div>

        <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', padding: '18px', borderRadius: '12px' }}>
          <div style={{ fontSize: '12px', color: '#A1A1AA', fontWeight: 600 }}>🎯 Avg Vendor OTIF Score</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: Number(avgOtifScore) >= 95 ? '#34D399' : '#F59E0B', marginTop: '4px' }}>
            {avgOtifScore}%
          </div>
          <div style={{ fontSize: '11px', color: '#34D399', marginTop: '4px', fontWeight: 600 }}>On-Time In-Full SLA</div>
        </div>

        <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', padding: '18px', borderRadius: '12px' }}>
          <div style={{ fontSize: '12px', color: '#A1A1AA', fontWeight: 600 }}>💰 Total YTD Spend</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#34D399', marginTop: '4px' }}>
            ₹{totalYtdSpend > 0 ? (totalYtdSpend / 100000).toFixed(2) + ' Lakhs' : '0.00'}
          </div>
          <div style={{ fontSize: '11px', color: '#A1A1AA', marginTop: '4px' }}>Procurement Spend</div>
        </div>

        <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', padding: '18px', borderRadius: '12px' }}>
          <div style={{ fontSize: '12px', color: '#A1A1AA', fontWeight: 600 }}>⚠️ Vendor Risk Levels</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#FFF', marginTop: '4px' }}>
            {lowRiskCount} <span style={{ fontSize: '12px', color: '#34D399', fontWeight: 600 }}>Low</span> / {highRiskCount} <span style={{ fontSize: '12px', color: '#F43F5E', fontWeight: 600 }}>High</span>
          </div>
          <div style={{ fontSize: '11px', color: '#A1A1AA', marginTop: '4px' }}>Defect Avg: {avgDefectRate}%</div>
        </div>
      </div>

      {/* SEARCH & MULTI-FILTER TOOLBAR */}
      <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '12px', padding: '16px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          
          {/* Search */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '11px', color: '#A1A1AA', fontWeight: 600, marginBottom: '4px', display: 'block' }}>🔍 SEARCH VENDOR NAME OR CODE</label>
            <input
              type="text"
              placeholder="Type vendor code, company name, contact email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          {/* Risk Filter */}
          <div>
            <label style={{ fontSize: '11px', color: '#A1A1AA', fontWeight: 600, marginBottom: '4px', display: 'block' }}>RISK RATING</label>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '8px', fontSize: '13px' }}
            >
              <option value="ALL">All Risk Ratings</option>
              <option value="LOW">🟢 Low Risk (&gt;95% OTIF)</option>
              <option value="MEDIUM">🟡 Medium Risk (85-95% OTIF)</option>
              <option value="HIGH">🔴 High Risk (&lt;85% OTIF)</option>
            </select>
          </div>

          {/* Payment Terms Filter */}
          <div>
            <label style={{ fontSize: '11px', color: '#A1A1AA', fontWeight: 600, marginBottom: '4px', display: 'block' }}>PAYMENT TERMS</label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '8px', fontSize: '13px' }}
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
            <label style={{ fontSize: '11px', color: '#A1A1AA', fontWeight: 600, marginBottom: '4px', display: 'block' }}>SORT BY</label>
            <div style={{ display: 'flex', gap: '4px' }}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ flex: 1, padding: '9px 8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '8px', fontSize: '12px' }}
              >
                <option value="otif">OTIF Rating</option>
                <option value="spend">Total Spend</option>
                <option value="leadTime">Lead Time</option>
                <option value="name">Vendor Name</option>
              </select>
              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                style={{ padding: '8px 10px', backgroundColor: '#27272A', color: '#FFF', border: '1px solid #3F3F46', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SUPPLIER MASTER TABLE OR CLEAN EMPTY STATE */}
      {loading ? (
        <div style={{ backgroundColor: '#18181B', padding: '40px', borderRadius: '12px', textAlign: 'center', color: '#A1A1AA' }}>
          Fetching vendor scorecards from MongoDB...
        </div>
      ) : processedSuppliers.length === 0 ? (
        <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', padding: '50px', borderRadius: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '42px', marginBottom: '12px' }}>🤝</div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#FFF', margin: '0 0 8px 0' }}>No Vendor Records Found</h2>
          <p style={{ color: '#A1A1AA', fontSize: '14px', maxWidth: '480px', margin: '0 auto 20px auto' }}>
            Your vendor database is clean. Create your first supplier master record to begin tracking lead-time SLAs, OTIF scorecards, and procurement spend.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            style={{ backgroundColor: '#6366F1', color: '#FFF', padding: '12px 24px', borderRadius: '8px', border: 'none', fontWeight: 800, fontSize: '14px', cursor: 'pointer' }}
          >
            ➕ Create First Vendor Master Record
          </button>
        </div>
      ) : (
        <div style={{ backgroundColor: '#18181B', borderRadius: '12px', border: '1px solid #27272A', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #27272A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#FFF' }}>Vendor Master Ledger & Performance Scorecards</h3>
            <span style={{ fontSize: '11px', color: '#A1A1AA' }}>Click 👁 Scorecard for detailed vendor metrics</span>
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
                  const otifBg = otif >= 95 ? 'rgba(16, 185, 129, 0.15)' : otif >= 85 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(244, 63, 94, 0.15)';
                  const otifColor = otif >= 95 ? '#34D399' : otif >= 85 ? '#F59E0B' : '#F43F5E';

                  const risk = sup.performance?.riskLevel || 'LOW';
                  const riskBg = risk === 'LOW' ? 'rgba(16, 185, 129, 0.15)' : risk === 'MEDIUM' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(244, 63, 94, 0.15)';
                  const riskColor = risk === 'LOW' ? '#34D399' : risk === 'MEDIUM' ? '#F59E0B' : '#F43F5E';

                  return (
                    <tr
                      key={sup._id}
                      onClick={() => setSelectedSupplierForDrawer(sup)}
                      style={{
                        borderBottom: '1px solid #27272A',
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1F1F23'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 800, color: '#818CF8' }}>
                        {sup.code}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 800, color: '#FFF' }}>{sup.name}</div>
                        <div style={{ fontSize: '11px', color: '#71717A' }}>Tax ID: {sup.taxId || 'N/A'}</div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#E4E4E7' }}>{sup.contact?.primaryName}</div>
                        <div style={{ fontSize: '11px', color: '#A1A1AA' }}>{sup.contact?.email}</div>
                      </td>

                      <td style={{ padding: '14px 16px', color: '#A1A1AA' }}>
                        {sup.leadTime?.defaultDays || 7} Days
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ backgroundColor: otifBg, color: otifColor, padding: '4px 10px', borderRadius: '12px', fontWeight: 800, fontSize: '12px' }}>
                          {otif}%
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', color: '#A1A1AA' }}>
                        {sup.performance?.defectRatePercent || 0.1}%
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ backgroundColor: riskBg, color: riskColor, padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>
                          {risk} RISK
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800, color: '#FFF' }}>
                        ₹{(sup.performance?.totalSpendAmount || 0).toLocaleString('en-IN')}
                      </td>

                      <td style={{ padding: '14px 16px' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            onClick={() => setSelectedSupplierForDrawer(sup)}
                            style={{ backgroundColor: '#27272A', color: '#FFF', border: 'none', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                          >
                            👁 Scorecard
                          </button>
                          <button
                            onClick={() => handleDeleteSupplier(sup._id, sup.name)}
                            style={{ backgroundColor: 'rgba(244, 63, 94, 0.1)', color: '#F43F5E', border: 'none', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}
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
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px', backgroundColor: '#121215', borderLeft: '1px solid #27272A', zIndex: 90, padding: '24px', overflowY: 'auto', boxShadow: '-10px 0 30px rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid #27272A', paddingBottom: '16px' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#818CF8', fontWeight: 800, fontFamily: 'monospace' }}>{selectedSupplierForDrawer.code}</span>
              <h2 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 800, color: '#FFF' }}>{selectedSupplierForDrawer.name}</h2>
            </div>
            <button
              onClick={() => setSelectedSupplierForDrawer(null)}
              style={{ backgroundColor: '#27272A', color: '#FFF', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px', fontWeight: 700 }}
            >
              ✕
            </button>
          </div>

          {/* Contact Details */}
          <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', color: '#A1A1AA', fontWeight: 700, marginBottom: '8px' }}>PRIMARY VENDOR CONTACT</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFF' }}>{selectedSupplierForDrawer.contact?.primaryName}</div>
            <div style={{ fontSize: '12px', color: '#A1A1AA', marginTop: '2px' }}>✉️ {selectedSupplierForDrawer.contact?.email}</div>
            <div style={{ fontSize: '12px', color: '#A1A1AA', marginTop: '2px' }}>📞 {selectedSupplierForDrawer.contact?.phone}</div>
          </div>

          {/* Performance Gauges */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', padding: '14px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: '#A1A1AA' }}>OTIF SLA RATING</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#34D399', marginTop: '4px' }}>
                {selectedSupplierForDrawer.performance?.otifScore || 98}%
              </div>
            </div>

            <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', padding: '14px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: '#A1A1AA' }}>DEFECT RATE</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#F59E0B', marginTop: '4px' }}>
                {selectedSupplierForDrawer.performance?.defectRatePercent || 0.1}%
              </div>
            </div>

            <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', padding: '14px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: '#A1A1AA' }}>GUARANTEED LEAD TIME</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#FFF', marginTop: '4px' }}>
                {selectedSupplierForDrawer.leadTime?.defaultDays || 7} Days
              </div>
            </div>

            <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', padding: '14px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: '#A1A1AA' }}>PAYMENT TERMS</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#818CF8', marginTop: '4px' }}>
                {selectedSupplierForDrawer.paymentTerms?.replace('_', ' ')}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', gap: '10px' }}>
            <button
              onClick={() => alert(`Creating Purchase Order for ${selectedSupplierForDrawer.name}`)}
              style={{ flex: 1, backgroundColor: '#6366F1', color: '#FFF', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
            >
              📝 Create Purchase Order
            </button>
          </div>
        </div>
      )}

      {/* ADD VENDOR MODAL */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '16px', padding: '24px', width: '480px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 800, color: '#FFF' }}>➕ Add New Vendor Master Record</h3>
            <form onSubmit={handleCreateSupplier} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#A1A1AA' }}>Company Name</label>
                <input required type="text" placeholder="e.g. TechComponents Inc." value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '6px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#A1A1AA' }}>Vendor Code</label>
                  <input required type="text" placeholder="e.g. SUP-8840" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} style={{ width: '100%', padding: '8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#A1A1AA' }}>Tax ID / GST</label>
                  <input type="text" placeholder="e.g. TAX-994810" value={formData.taxId} onChange={(e) => setFormData({ ...formData, taxId: e.target.value })} style={{ width: '100%', padding: '8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#A1A1AA' }}>Primary Contact Name</label>
                <input required type="text" placeholder="e.g. Robert Vance" value={formData.primaryName} onChange={(e) => setFormData({ ...formData, primaryName: e.target.value })} style={{ width: '100%', padding: '8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '6px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#A1A1AA' }}>Contact Email</label>
                  <input required type="email" placeholder="orders@vendor.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={{ width: '100%', padding: '8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#A1A1AA' }}>Contact Phone</label>
                  <input type="text" placeholder="+1 555 019 2831" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} style={{ width: '100%', padding: '8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#A1A1AA' }}>Lead Time (Days)</label>
                  <input type="number" min={1} value={formData.leadTimeDays} onChange={(e) => setFormData({ ...formData, leadTimeDays: Number(e.target.value) })} style={{ width: '100%', padding: '8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#A1A1AA' }}>Payment Terms</label>
                  <select value={formData.paymentTerms} onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })} style={{ width: '100%', padding: '8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '6px' }}>
                    <option value="NET_15">Net 15 Days</option>
                    <option value="NET_30">Net 30 Days</option>
                    <option value="NET_60">Net 60 Days</option>
                    <option value="DUE_ON_RECEIPT">Due on Receipt</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '8px 16px', backgroundColor: '#27272A', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#6366F1', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>Save Vendor</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SuppliersPage;
