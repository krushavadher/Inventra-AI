import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Search,
  Plus,
  ArrowDownToLine,
  ArrowUpFromLine,
  Pencil,
  Trash2,
  RefreshCw,
  X,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ChevronDown
} from 'lucide-react';
import api from '@/lib/axios';

export interface Product {
  _id: string;
  id?: string;
  name: string;
  sku: string;
  category: string;
  supplier?: string;
  unitCost: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  status?: string;
}

export const InventoryPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW' | 'OUT'>('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isStockInModalOpen, setIsStockInModalOpen] = useState<boolean>(false);
  const [isStockOutModalOpen, setIsStockOutModalOpen] = useState<boolean>(false);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);

  // Form states
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    category: 'General',
    supplier: '',
    stock: 50,
    minStock: 10,
    unitCost: 100,
    sellingPrice: 150,
  });

  const [stockMovementForm, setStockMovementForm] = useState({
    productId: '',
    quantity: 10,
    reason: '',
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Load products
  const fetchProducts = async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setIsRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get('/api/products');
      const data = res.data?.data?.products || res.data?.data || res.data?.products || [];
      if (Array.isArray(data)) {
        setProducts(data);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.supplier && p.supplier.toLowerCase().includes(q));

      // Category
      const matchesCategory =
        categoryFilter === 'ALL' ||
        (p.category && p.category.toLowerCase() === categoryFilter.toLowerCase());

      // Status
      const qty = p.stock ?? 0;
      const min = p.minStock ?? 10;
      let matchesStatus = true;
      if (statusFilter === 'IN_STOCK') {
        matchesStatus = qty > min;
      } else if (statusFilter === 'LOW') {
        matchesStatus = qty > 0 && qty <= min;
      } else if (statusFilter === 'OUT') {
        matchesStatus = qty === 0;
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, search, categoryFilter, statusFilter]);

  // Modal handlers
  const openAddModal = () => {
    setFormError(null);
    setProductForm({
      name: '',
      sku: '',
      category: 'General',
      supplier: '',
      stock: 50,
      minStock: 10,
      unitCost: 100,
      sellingPrice: 150,
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setFormError(null);
    setActiveProduct(p);
    setProductForm({
      name: p.name,
      sku: p.sku,
      category: p.category || 'General',
      supplier: p.supplier || '',
      stock: p.stock ?? 0,
      minStock: p.minStock ?? 10,
      unitCost: p.unitCost ?? 100,
      sellingPrice: p.sellingPrice ?? 150,
    });
    setIsEditModalOpen(true);
  };

  const openStockInModal = (p?: Product) => {
    setFormError(null);
    const target = p || (filteredProducts.length > 0 ? filteredProducts[0] : null);
    setStockMovementForm({
      productId: target ? (target._id || target.id || target.sku) : '',
      quantity: 10,
      reason: 'Inbound shipment receipt',
    });
    setIsStockInModalOpen(true);
  };

  const openStockOutModal = (p?: Product) => {
    setFormError(null);
    const target = p || (filteredProducts.length > 0 ? filteredProducts[0] : null);
    setStockMovementForm({
      productId: target ? (target._id || target.id || target.sku) : '',
      quantity: 5,
      reason: 'Outbound dispatch / sales order',
    });
    setIsStockOutModalOpen(true);
  };

  // Submit Add Product
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await api.post('/api/products', {
        name: productForm.name,
        sku: productForm.sku,
        category: productForm.category,
        supplier: productForm.supplier,
        stock: Number(productForm.stock),
        minStock: Number(productForm.minStock),
        unitCost: Number(productForm.unitCost),
        sellingPrice: Number(productForm.sellingPrice),
      });
      setIsAddModalOpen(false);
      fetchProducts(true);
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Edit Product
  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProduct) return;
    setFormError(null);
    setSubmitting(true);
    try {
      const prodId = activeProduct._id || activeProduct.id || activeProduct.sku;
      await api.put(`/api/products/${prodId}`, {
        name: productForm.name,
        sku: productForm.sku,
        category: productForm.category,
        supplier: productForm.supplier,
        stock: Number(productForm.stock),
        minStock: Number(productForm.minStock),
        unitCost: Number(productForm.unitCost),
        sellingPrice: Number(productForm.sellingPrice),
      });
      setIsEditModalOpen(false);
      fetchProducts(true);
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'Failed to update product');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (p: Product) => {
    const prodId = p._id || p.id || p.sku;
    if (!window.confirm(`Are you sure you want to delete "${p.name}" (${p.sku})?`)) return;
    try {
      await api.delete(`/api/products/${prodId}`);
      setProducts((prev) => prev.filter((item) => (item._id || item.id || item.sku) !== prodId));
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Failed to delete product');
    }
  };

  // Submit Stock In
  const handleStockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await api.post('/api/stock/in', {
        productId: stockMovementForm.productId,
        quantity: Number(stockMovementForm.quantity),
        reason: stockMovementForm.reason,
      });
      setIsStockInModalOpen(false);
      fetchProducts(true);
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'Failed to record stock in');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Stock Out
  const handleStockOut = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await api.post('/api/stock/out', {
        productId: stockMovementForm.productId,
        quantity: Number(stockMovementForm.quantity),
        reason: stockMovementForm.reason,
      });
      setIsStockOutModalOpen(false);
      fetchProducts(true);
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'Failed to record stock out');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full max-h-full w-full flex flex-col overflow-hidden p-6 text-white select-none">
      {/* Header with Title, Search, Category Filter, Status Filter & Action Buttons */}
      <div className="flex-shrink-0 flex flex-col gap-4 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">Inventory Catalog</h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#D5F737]/15 text-[#D5F737] border border-[#D5F737]/30">
                {products.length} Products
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Real-time product stock levels, suppliers, and warehouse inventory movements.
            </p>
          </div>

          {/* Action Buttons: Add Product, Stock In, Stock Out */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchProducts(true)}
              className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all active:scale-95"
              title="Refresh inventory"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#D5F737]' : ''}`} />
            </button>

            <button
              onClick={() => openStockInModal()}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              Stock In
            </button>

            <button
              onClick={() => openStockOutModal()}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <ArrowUpFromLine className="w-3.5 h-3.5" />
              Stock Out
            </button>

            <button
              onClick={openAddModal}
              className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-[#D5F737] hover:bg-[#D9F958] text-black shadow-lg shadow-[#D5F737]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              Add Product
            </button>
          </div>
        </div>

        {/* Filters Bar: Search, Category, Status Pills */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by product name, SKU, category, or supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#D5F737]/60 transition-colors"
            />
          </div>

          {/* Category Filter */}
          <div className="relative min-w-[170px]">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full appearance-none bg-[#1C1C1F] border border-white/10 rounded-xl px-3.5 py-2 pr-8 text-xs text-zinc-200 focus:outline-none focus:border-[#D5F737]/60 transition-colors cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status Filter (All / In Stock / Low / Out) */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('IN_STOCK')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'IN_STOCK'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              In Stock
            </button>
            <button
              onClick={() => setStatusFilter('LOW')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'LOW'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Low
            </button>
            <button
              onClick={() => setStatusFilter('OUT')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'OUT'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Out
            </button>
          </div>
        </div>
      </div>

      {/* Glass Table Container (Fits screen height, only table body scrolls) */}
      <div className="flex-1 min-h-0 flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse table-fixed">
          {/* Sticky Table Header */}
          <thead className="sticky top-0 z-10 bg-[#181818]/95 backdrop-blur-md border-b border-white/10 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            <tr>
              <th className="py-3 px-4 w-[24%]">Product</th>
              <th className="py-3 px-4 w-[13%]">SKU</th>
              <th className="py-3 px-4 w-[14%]">Category</th>
              <th className="py-3 px-4 w-[15%]">Supplier</th>
              <th className="py-3 px-4 w-[10%]">Stock</th>
              <th className="py-3 px-4 w-[10%]">Min Stock</th>
              <th className="py-3 px-4 w-[12%]">Status</th>
              <th className="py-3 px-4 w-[12%] text-right">Actions</th>
            </tr>
          </thead>
        </table>

        {/* Scrollable Table Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <table className="w-full text-left border-collapse table-fixed">
            <tbody className="divide-y divide-white/5">
              {loading ? (
                [1, 2, 3, 4, 5, 6].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3.5 px-4 w-[24%]">
                      <div className="h-4 bg-white/10 rounded w-36 mb-1.5" />
                      <div className="h-2.5 bg-white/5 rounded w-20" />
                    </td>
                    <td className="py-3.5 px-4 w-[13%]">
                      <div className="h-4 bg-white/10 rounded w-20" />
                    </td>
                    <td className="py-3.5 px-4 w-[14%]">
                      <div className="h-4 bg-white/10 rounded w-24" />
                    </td>
                    <td className="py-3.5 px-4 w-[15%]">
                      <div className="h-4 bg-white/10 rounded w-24" />
                    </td>
                    <td className="py-3.5 px-4 w-[10%]">
                      <div className="h-4 bg-white/10 rounded w-12" />
                    </td>
                    <td className="py-3.5 px-4 w-[10%]">
                      <div className="h-4 bg-white/10 rounded w-12" />
                    </td>
                    <td className="py-3.5 px-4 w-[12%]">
                      <div className="h-5 bg-white/10 rounded-full w-20" />
                    </td>
                    <td className="py-3.5 px-4 w-[12%] text-right">
                      <div className="h-6 bg-white/10 rounded w-16 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((p) => {
                  const qty = p.stock ?? 0;
                  const min = p.minStock ?? 10;
                  const isOut = qty === 0;
                  const isLow = !isOut && qty <= min;

                  return (
                    <tr
                      key={p._id || p.id || p.sku}
                      className="hover:bg-white/[0.04] transition-colors group"
                    >
                      {/* Product */}
                      <td className="py-3.5 px-4 w-[24%]">
                        <div className="font-semibold text-sm text-white group-hover:text-[#D5F737] transition-colors truncate">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono">
                          ₹{p.sellingPrice?.toLocaleString('en-IN')} retail
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="py-3.5 px-4 w-[13%]">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300">
                          {p.sku}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 w-[14%]">
                        <span className="text-xs text-zinc-300 px-2 py-0.5 rounded-full bg-white/5">
                          {p.category || 'General'}
                        </span>
                      </td>

                      {/* Supplier */}
                      <td className="py-3.5 px-4 w-[15%] text-xs text-zinc-400 truncate">
                        {p.supplier || '—'}
                      </td>

                      {/* Stock */}
                      <td className="py-3.5 px-4 w-[10%]">
                        <span
                          className={`text-sm font-bold font-mono ${
                            isOut
                              ? 'text-rose-400'
                              : isLow
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {qty.toLocaleString()}
                        </span>
                      </td>

                      {/* Min Stock */}
                      <td className="py-3.5 px-4 w-[10%] text-xs text-zinc-400 font-mono">
                        {min} units
                      </td>

                      {/* Status Badge (Green / Amber / Red) */}
                      <td className="py-3.5 px-4 w-[12%]">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            In Stock
                          </span>
                        )}
                      </td>

                      {/* Actions (Edit, Delete) */}
                      <td className="py-3.5 px-4 w-[12%] text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all"
                            title="Edit Product"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p)}
                            className="p-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-all"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500">
                        <Package className="w-6 h-6" />
                      </div>
                      <div className="text-sm font-semibold text-zinc-300">No products found</div>
                      <p className="text-xs text-zinc-500 max-w-sm">
                        {search || categoryFilter !== 'ALL' || statusFilter !== 'ALL'
                          ? 'No products matched your active search and filter criteria.'
                          : 'Your catalog is empty. Click "+ Add Product" to create your first item.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================= MODAL: Add Product ======================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#232323] border border-white/10 rounded-[24px] w-full max-w-lg p-6 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#D5F737]/15 border border-[#D5F737]/30 flex items-center justify-center text-[#D5F737]">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Add New Product</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddProduct} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Product Name *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. ESP32-WROOM-32D Wi-Fi Module"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#D5F737]/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">SKU Code</label>
                  <input
                    type="text"
                    placeholder="Auto-generated if blank"
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#D5F737]/60 uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Semiconductors"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#D5F737]/60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Supplier</label>
                <input
                  type="text"
                  placeholder="e.g. Espressif Systems / Core Components"
                  value={productForm.supplier}
                  onChange={(e) => setProductForm({ ...productForm, supplier: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#D5F737]/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Initial Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.stock}
                    onChange={(e) =>
                      setProductForm({ ...productForm, stock: Number(e.target.value) })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#D5F737]/60 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Min Safety Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.minStock}
                    onChange={(e) =>
                      setProductForm({ ...productForm, minStock: Number(e.target.value) })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#D5F737]/60 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Unit Cost (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.unitCost}
                    onChange={(e) =>
                      setProductForm({ ...productForm, unitCost: Number(e.target.value) })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#D5F737]/60 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Selling Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.sellingPrice}
                    onChange={(e) =>
                      setProductForm({ ...productForm, sellingPrice: Number(e.target.value) })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#D5F737]/60 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-white/10 hover:bg-white/5 text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#D5F737] hover:bg-[#D9F958] text-black transition-all disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= MODAL: Edit Product ======================= */}
      {isEditModalOpen && activeProduct && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#232323] border border-white/10 rounded-[24px] w-full max-w-lg p-6 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Edit Product</h3>
                  <p className="text-[11px] text-zinc-400 font-mono">{activeProduct.sku}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleEditProduct} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Product Name *
                </label>
                <input
                  required
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#D5F737]/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">SKU Code</label>
                  <input
                    type="text"
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#D5F737]/60 uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Category</label>
                  <input
                    type="text"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#D5F737]/60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Supplier</label>
                <input
                  type="text"
                  value={productForm.supplier}
                  onChange={(e) => setProductForm({ ...productForm, supplier: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#D5F737]/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Current Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.stock}
                    onChange={(e) =>
                      setProductForm({ ...productForm, stock: Number(e.target.value) })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#D5F737]/60 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Min Safety Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.minStock}
                    onChange={(e) =>
                      setProductForm({ ...productForm, minStock: Number(e.target.value) })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#D5F737]/60 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Unit Cost (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.unitCost}
                    onChange={(e) =>
                      setProductForm({ ...productForm, unitCost: Number(e.target.value) })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#D5F737]/60 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Selling Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.sellingPrice}
                    onChange={(e) =>
                      setProductForm({ ...productForm, sellingPrice: Number(e.target.value) })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#D5F737]/60 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-white/10 hover:bg-white/5 text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#D5F737] hover:bg-[#D9F958] text-black transition-all disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= MODAL: Stock In ======================= */}
      {isStockInModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#232323] border border-white/10 rounded-[24px] w-full max-w-md p-6 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ArrowDownToLine className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Stock In (Receipt)</h3>
                  <p className="text-[11px] text-zinc-400">Increase product warehouse quantity</p>
                </div>
              </div>
              <button
                onClick={() => setIsStockInModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleStockIn} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Select Product *
                </label>
                <select
                  required
                  value={stockMovementForm.productId}
                  onChange={(e) =>
                    setStockMovementForm({ ...stockMovementForm, productId: e.target.value })
                  }
                  className="w-full bg-[#1C1C1F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#D5F737]/60 cursor-pointer"
                >
                  <option value="">-- Choose a product --</option>
                  {products.map((p) => (
                    <option key={p._id || p.id || p.sku} value={p._id || p.id || p.sku}>
                      {p.name} ({p.sku}) — Current: {p.stock} units
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Quantity to Add *
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  value={stockMovementForm.quantity}
                  onChange={(e) =>
                    setStockMovementForm({
                      ...stockMovementForm,
                      quantity: Math.max(1, Number(e.target.value)),
                    })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#D5F737]/60 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Reason / Document Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. PO-8921 Shipment arrival"
                  value={stockMovementForm.reason}
                  onChange={(e) =>
                    setStockMovementForm({ ...stockMovementForm, reason: e.target.value })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#D5F737]/60"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsStockInModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-white/10 hover:bg-white/5 text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !stockMovementForm.productId}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-400 hover:bg-emerald-300 text-black transition-all disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Confirm Stock In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= MODAL: Stock Out ======================= */}
      {isStockOutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#232323] border border-white/10 rounded-[24px] w-full max-w-md p-6 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <ArrowUpFromLine className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Stock Out (Dispatch)</h3>
                  <p className="text-[11px] text-zinc-400">Deduct inventory for shipment or usage</p>
                </div>
              </div>
              <button
                onClick={() => setIsStockOutModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleStockOut} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Select Product *
                </label>
                <select
                  required
                  value={stockMovementForm.productId}
                  onChange={(e) =>
                    setStockMovementForm({ ...stockMovementForm, productId: e.target.value })
                  }
                  className="w-full bg-[#1C1C1F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#D5F737]/60 cursor-pointer"
                >
                  <option value="">-- Choose a product --</option>
                  {products.map((p) => (
                    <option key={p._id || p.id || p.sku} value={p._id || p.id || p.sku}>
                      {p.name} ({p.sku}) — Available: {p.stock} units
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Quantity to Deduct *
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  value={stockMovementForm.quantity}
                  onChange={(e) =>
                    setStockMovementForm({
                      ...stockMovementForm,
                      quantity: Math.max(1, Number(e.target.value)),
                    })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#D5F737]/60 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Reason / Document Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. SO-4421 Dispatched to Customer"
                  value={stockMovementForm.reason}
                  onChange={(e) =>
                    setStockMovementForm({ ...stockMovementForm, reason: e.target.value })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#D5F737]/60"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsStockOutModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-white/10 hover:bg-white/5 text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !stockMovementForm.productId}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-black transition-all disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Confirm Stock Out'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
