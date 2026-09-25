import React, { useState, useEffect } from 'react';
import { apiFetch } from './apiClient';

export interface Product {
  _id: string;
  sku: string;
  name: string;
  description?: string;
  barcode: string;
  pricing: { unitCost: number; sellingPrice: number; taxRate: number };
  abcClass: 'A' | 'B' | 'C';
  status: 'ACTIVE' | 'DISCONTINUED' | 'DRAFT';
  createdAt: string;
}

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAbcClass, setSelectedAbcClass] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State for New SKU
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [unitCost, setUnitCost] = useState(1200);
  const [sellingPrice, setSellingPrice] = useState(2500);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let queryParams = [];
      if (searchQuery) queryParams.push(`search=${encodeURIComponent(searchQuery)}`);
      if (selectedAbcClass) queryParams.push(`abcClass=${selectedAbcClass}`);
      const qs = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

      const res = await apiFetch(`/products${qs}`);
      if (res && res.data && res.data.products) {
        setProducts(res.data.products);
      }
    } catch (err: any) {
      console.warn('Backend query fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [searchQuery, selectedAbcClass]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      const payload = {
        sku: sku ? sku.toUpperCase() : `SKU-${Date.now().toString().slice(-4)}`,
        name,
        pricing: { unitCost: Number(unitCost), sellingPrice: Number(sellingPrice), taxRate: 18 },
        abcClass: 'A'
      };

      const res = await apiFetch('/products', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const newProduct = res.data;
      setProducts((prev) => {
        const filtered = prev.filter((p) => p._id !== newProduct._id && p.sku !== newProduct.sku);
        return [newProduct, ...filtered];
      });

      setIsModalOpen(false);
      setName('');
      setSku('');
      setUnitCost(1200);
      setSellingPrice(2500);
    } catch (err: any) {
      alert(err.message || 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    // ⚡ Instant optimistic deletion (0ms latency UI response)
    setProducts((prev) => prev.filter((p) => p._id !== id));

    try {
      await apiFetch(`/products/${id}`, { method: 'DELETE' });
    } catch (err: any) {
      // Quiet background cleanup
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)', minHeight: '100vh', padding: '32px 40px' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 className="page-title">Product Master Catalog</h1>
          <p className="subtext-muted" style={{ marginTop: '4px' }}>Manage global product SKUs, pricing structures in Rupees (₹), barcodes, and ABC velocity classifications.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add New SKU
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            placeholder="Search by SKU, Product Name, Barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-dark"
            style={{ width: '100%', paddingLeft: '38px' }}
          />
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#71717A" strokeWidth="2" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
        <select
          value={selectedAbcClass}
          onChange={(e) => setSelectedAbcClass(e.target.value)}
          className="input-dark"
          style={{ width: '220px', cursor: 'pointer' }}
        >
          <option value="">All ABC Classes</option>
          <option value="A">Class A (High Value)</option>
          <option value="B">Class B (Medium Value)</option>
          <option value="C">Class C (Low Value)</option>
        </select>
      </div>

      {/* Data Table Container */}
      <div className="panel-bordered" style={{ overflow: 'hidden', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr>
              <th className="table-header">SKU Code</th>
              <th className="table-header">Product Details</th>
              <th className="table-header">Barcode</th>
              <th className="table-header">Unit Cost (₹)</th>
              <th className="table-header">Selling Price (₹)</th>
              <th className="table-header">ABC Class</th>
              <th className="table-header">Status</th>
              <th className="table-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1, 2, 3, 4].map((i) => (
                <tr key={i} className="table-row">
                  <td className="table-cell"><div className="skeleton-box" style={{ width: '80px', height: '16px' }} /></td>
                  <td className="table-cell"><div className="skeleton-box" style={{ width: '160px', height: '16px' }} /></td>
                  <td className="table-cell"><div className="skeleton-box" style={{ width: '90px', height: '16px' }} /></td>
                  <td className="table-cell"><div className="skeleton-box" style={{ width: '60px', height: '16px' }} /></td>
                  <td className="table-cell"><div className="skeleton-box" style={{ width: '60px', height: '16px' }} /></td>
                  <td className="table-cell"><div className="skeleton-box" style={{ width: '50px', height: '16px' }} /></td>
                  <td className="table-cell"><div className="skeleton-box" style={{ width: '70px', height: '16px' }} /></td>
                  <td className="table-cell"><div className="skeleton-box" style={{ width: '60px', height: '24px' }} /></td>
                </tr>
              ))
            ) : (
              products.map((p) => {
                const getStatusBadgeClass = (status: string) => {
                  if (status === 'ACTIVE') return 'badge-success';
                  if (status === 'DRAFT') return 'badge-warning';
                  return 'badge-danger';
                };

                return (
                  <tr key={p._id} className="table-row">
                    <td className="table-cell" style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{p.sku}</td>
                    <td className="table-cell">
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{p.name}</div>
                    </td>
                    <td className="table-cell" style={{ color: 'var(--text-muted)' }}>{p.barcode || '890123456'}</td>
                    <td className="table-cell">₹{p.pricing?.unitCost?.toLocaleString('en-IN')}</td>
                    <td className="table-cell" style={{ fontWeight: 500, color: 'var(--accent-cool)' }}>₹{p.pricing?.sellingPrice?.toLocaleString('en-IN')}</td>
                    <td className="table-cell">
                      <span className="badge badge-neutral">
                        Class {p.abcClass}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${getStatusBadgeClass(p.status)}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="table-cell">
                      <button
                        onClick={() => handleDeleteProduct(p._id)}
                        className="btn-danger"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}

            {!loading && products.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state-box" style={{ margin: '24px', border: 'none' }}>
                    <div className="empty-state-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                    </div>
                    <div style={{ fontWeight: 500, fontSize: '15px', color: 'var(--text-primary)' }}>No Products Found</div>
                    <div className="subtext-muted" style={{ marginTop: '4px', maxWidth: '320px' }}>
                      {searchQuery || selectedAbcClass ? 'No product SKUs match your filter parameters.' : 'Your master catalog is empty. Add your first SKU to get started.'}
                    </div>
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="btn-secondary"
                      style={{ marginTop: '16px' }}
                    >
                      + Add New SKU
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Product Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(13, 17, 23, 0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="panel-bordered" style={{ padding: '28px', borderRadius: '12px', width: '460px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>Create New SKU Master</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>
            <form onSubmit={handleCreateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="kpi-label" style={{ marginBottom: '6px', display: 'block' }}>Product Name</label>
                <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Microcontroller Core Processor" className="input-dark" style={{ width: '100%' }} />
              </div>
              <div>
                <label className="kpi-label" style={{ marginBottom: '6px', display: 'block' }}>SKU Code (Optional)</label>
                <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Auto-generated if left empty" className="input-dark" style={{ width: '100%' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="kpi-label" style={{ marginBottom: '6px', display: 'block' }}>Unit Cost (₹)</label>
                  <input type="number" step="1" value={unitCost} onChange={(e) => setUnitCost(Number(e.target.value))} className="input-dark" style={{ width: '100%' }} />
                </div>
                <div>
                  <label className="kpi-label" style={{ marginBottom: '6px', display: 'block' }}>Selling Price (₹)</label>
                  <input type="number" step="1" value={sellingPrice} onChange={(e) => setSellingPrice(Number(e.target.value))} className="input-dark" style={{ width: '100%' }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Saving...' : 'Save Product SKU'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
