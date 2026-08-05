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
    <div style={{ backgroundColor: '#09090B', color: '#F4F4F5', minHeight: '100vh', padding: '24px', fontFamily: 'Inter, sans-serif' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Product Master Catalog</h1>
          <p style={{ color: '#A1A1AA', fontSize: '14px', margin: '4px 0 0 0' }}>Manage global product SKUs, pricing structures in Rupees (₹), barcodes, and ABC velocity classifications.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{ backgroundColor: '#6366F1', color: '#FFFFFF', padding: '10px 18px', borderRadius: '8px', border: 'none', fontWeight: 600, cursor: 'pointer' }}
        >
          + Add New SKU
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <input
          type="text"
          placeholder="Search by SKU, Product Name, Barcode..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, backgroundColor: '#18181B', border: '1px solid #27272A', color: '#FFF', padding: '10px 16px', borderRadius: '8px', fontSize: '14px' }}
        />
        <select
          value={selectedAbcClass}
          onChange={(e) => setSelectedAbcClass(e.target.value)}
          style={{ backgroundColor: '#18181B', border: '1px solid #27272A', color: '#FFF', padding: '10px 16px', borderRadius: '8px', fontSize: '14px' }}
        >
          <option value="">All ABC Classes</option>
          <option value="A">Class A (High Value)</option>
          <option value="B">Class B (Medium Value)</option>
          <option value="C">Class C (Low Value)</option>
        </select>
      </div>

      {/* Data Table */}
      <div style={{ backgroundColor: '#18181B', borderRadius: '12px', border: '1px solid #27272A', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#121215', borderBottom: '1px solid #27272A', color: '#A1A1AA', fontSize: '13px' }}>
              <th style={{ padding: '14px 16px' }}>SKU Code</th>
              <th style={{ padding: '14px 16px' }}>Product Details</th>
              <th style={{ padding: '14px 16px' }}>Barcode</th>
              <th style={{ padding: '14px 16px' }}>Unit Cost (₹)</th>
              <th style={{ padding: '14px 16px' }}>Selling Price (₹)</th>
              <th style={{ padding: '14px 16px' }}>ABC Class</th>
              <th style={{ padding: '14px 16px' }}>Status</th>
              <th style={{ padding: '14px 16px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p._id} style={{ borderBottom: '1px solid #27272A', fontSize: '14px' }}>
                <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 600, color: '#6366F1' }}>{p.sku}</td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ fontWeight: 600, color: '#FFF' }}>{p.name}</div>
                </td>
                <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#A1A1AA' }}>{p.barcode || '890123456'}</td>
                <td style={{ padding: '14px 16px' }}>₹{p.pricing?.unitCost?.toLocaleString('en-IN')}</td>
                <td style={{ padding: '14px 16px', fontWeight: 700, color: '#10B981' }}>₹{p.pricing?.sellingPrice?.toLocaleString('en-IN')}</td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#6366F1', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '12px' }}>
                    Class {p.abcClass}
                  </span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                    {p.status}
                  </span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <button
                    onClick={() => handleDeleteProduct(p._id)}
                    style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)', color: '#F43F5E', border: '1px solid #F43F5E', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                  >
                    🗑️ Delete
                  </button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#A1A1AA' }}>
                  No products found. Click "+ Add New SKU" to create your first product.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Product Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#18181B', border: '1px solid #27272A', padding: '24px', borderRadius: '16px', width: '440px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Create New SKU Master</h3>
            <form onSubmit={handleCreateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#A1A1AA' }}>Product Name</label>
                <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Microcontroller Core Processor" style={{ width: '100%', padding: '8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#A1A1AA' }}>SKU Code (Optional)</label>
                <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Auto-generated if left empty" style={{ width: '100%', padding: '8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#A1A1AA' }}>Unit Cost (₹)</label>
                  <input type="number" step="1" value={unitCost} onChange={(e) => setUnitCost(Number(e.target.value))} style={{ width: '100%', padding: '8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '6px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#A1A1AA' }}>Selling Price (₹)</label>
                  <input type="number" step="1" value={sellingPrice} onChange={(e) => setSellingPrice(Number(e.target.value))} style={{ width: '100%', padding: '8px', backgroundColor: '#09090B', border: '1px solid #27272A', color: '#FFF', borderRadius: '6px' }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '8px 16px', backgroundColor: '#27272A', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ padding: '8px 16px', backgroundColor: submitting ? '#4F46E5' : '#6366F1', color: '#FFF', border: 'none', borderRadius: '6px', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
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
