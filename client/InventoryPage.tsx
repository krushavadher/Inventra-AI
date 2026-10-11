import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  AlertCircle,
  ChevronDown,
  FilterX,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { NumberTicker } from '@/components/ui/number-ticker';
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

// Consistent category colors palette
const CATEGORY_COLORS: Record<string, string> = {
  Semiconductors: '#D5F737', // Lime
  'Wireless & IoT': '#2BB4A0', // Teal
  'Power & Batteries': '#F5A524', // Amber
  Sensors: '#A78BFA', // Purple
  Displays: '#60A5FA', // Blue
  'Passive Components': '#F472B6', // Pink
  Mechanical: '#F0506E', // Red
  General: '#9A9A9A', // Grey
};

const getCategoryColor = (cat: string) => {
  if (CATEGORY_COLORS[cat]) return CATEGORY_COLORS[cat];
  const fallback = ['#D5F737', '#2BB4A0', '#F5A524', '#A78BFA', '#60A5FA', '#F472B6', '#34D399', '#FB923C'];
  let hash = 0;
  for (let i = 0; i < (cat || '').length; i++) hash = cat.charCodeAt(i) + ((hash << 5) - hash);
  return fallback[Math.abs(hash) % fallback.length];
};

interface ToastNotification {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export const InventoryPage: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();

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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);

  // Toast notifications
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    const newToast = { id: Date.now(), message, type };
    setToast(newToast);
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // Input refs for auto-focus on modal open
  const addNameInputRef = useRef<HTMLInputElement>(null);
  const editNameInputRef = useRef<HTMLInputElement>(null);
  const stockInSelectRef = useRef<HTMLSelectElement>(null);
  const stockOutSelectRef = useRef<HTMLSelectElement>(null);

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
    } catch (err: any) {
      console.error('Failed to fetch products:', err);
      showToast('Failed to load inventory data', 'error');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // Summary counts
  const summaryCounts = useMemo(() => {
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;
    products.forEach((p) => {
      const qty = p.stock ?? 0;
      const min = p.minStock ?? 10;
      if (qty === 0) outOfStock++;
      else if (qty <= min) lowStock++;
      else inStock++;
    });
    return {
      total: products.length,
      inStock,
      lowStock,
      outOfStock,
    };
  }, [products]);

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

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAddModalOpen(false);
        setIsEditModalOpen(false);
        setIsStockInModalOpen(false);
        setIsStockOutModalOpen(false);
        setIsDeleteModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Modal Openers with auto-focus
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
    setTimeout(() => addNameInputRef.current?.focus(), 50);
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
    setTimeout(() => editNameInputRef.current?.focus(), 50);
  };

  const openStockInModal = (p?: Product) => {
    setFormError(null);
    const target = p || (filteredProducts.length > 0 ? filteredProducts[0] : null);
    setStockMovementForm({
      productId: target ? target._id || target.id || target.sku : '',
      quantity: 10,
      reason: 'Inbound shipment receipt',
    });
    setIsStockInModalOpen(true);
    setTimeout(() => stockInSelectRef.current?.focus(), 50);
  };

  const openStockOutModal = (p?: Product) => {
    setFormError(null);
    const target = p || (filteredProducts.length > 0 ? filteredProducts[0] : null);
    setStockMovementForm({
      productId: target ? target._id || target.id || target.sku : '',
      quantity: 5,
      reason: 'Outbound dispatch / sales order',
    });
    setIsStockOutModalOpen(true);
    setTimeout(() => stockOutSelectRef.current?.focus(), 50);
  };

  const openDeleteModal = (p: Product) => {
    setProductToDelete(p);
    setIsDeleteModalOpen(true);
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
      showToast(`Product "${productForm.name}" created successfully`);
      fetchProducts(true);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to create product';
      setFormError(msg);
      showToast(msg, 'error');
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
      showToast(`Product "${productForm.name}" updated successfully`);
      fetchProducts(true);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to update product';
      setFormError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm Delete Product
  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    const prodId = productToDelete._id || productToDelete.id || productToDelete.sku;
    setSubmitting(true);
    try {
      await api.delete(`/api/products/${prodId}`);
      setProducts((prev) => prev.filter((item) => (item._id || item.id || item.sku) !== prodId));
      setIsDeleteModalOpen(false);
      showToast(`Deleted "${productToDelete.name}" successfully`);
      setProductToDelete(null);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to delete product';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
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
      showToast(`Stock in recorded (+${stockMovementForm.quantity} units)`);
      fetchProducts(true);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to record stock in';
      setFormError(msg);
      showToast(msg, 'error');
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
      showToast(`Stock out recorded (-${stockMovementForm.quantity} units)`);
      fetchProducts(true);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to record stock out';
      setFormError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full w-full max-w-full p-4 sm:p-6 space-y-6 text-white font-['Outfit',sans-serif] select-none pb-14">
      {/* 1. TOP HEADER & PRIMARY ACTION BUTTONS */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              <span className="bg-gradient-to-r from-[#D5F737] to-[#7BE0A5] bg-clip-text text-transparent">
                Inventory
              </span>{' '}
              Catalog
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#D5F737]/15 text-[#D5F737] border border-[#D5F737]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D5F737] animate-pulse" />
              {products.length} Products
            </span>
          </div>
          <p className="text-xs text-[#9A9A9A] mt-1">
            Real-time catalog stock levels, supplier records, and inventory movements.
          </p>
        </div>

        {/* Action Buttons: Refresh, Stock In, Stock Out, Add Product (Fully rounded pills) */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => fetchProducts(true)}
            className="btn-icon-round p-2.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-[#9A9A9A] hover:text-white transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
            title="Refresh inventory"
          >
            <RefreshCw
              className={`w-4 h-4 transition-transform duration-500 ${
                isRefreshing ? 'animate-spin text-[#D5F737]' : 'hover:rotate-180'
              }`}
            />
          </button>

          <button
            onClick={() => openStockInModal()}
            className="btn-ghost-lime px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 transition-all duration-200 hover:scale-[1.02] active:scale-[0.97] hover:shadow-[0_0_15px_rgba(16,185,129,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>Stock In</span>
          </button>

          <button
            onClick={() => openStockOutModal()}
            className="btn-ghost-lime px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 transition-all duration-200 hover:scale-[1.02] active:scale-[0.97] hover:shadow-[0_0_15px_rgba(245,165,36,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <ArrowUpFromLine className="w-3.5 h-3.5" />
            <span>Stock Out</span>
          </button>

          <button
            onClick={openAddModal}
            className="btn-lime-pill px-5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 bg-[#D5F737] text-black shadow-md shadow-[#D5F737]/20 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] hover:shadow-[0_0_24px_rgba(213,247,55,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737] focus-visible:ring-offset-2 focus-visible:ring-offset-[#181818]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Product</span>
          </button>
        </div>
      </section>

      {/* 2. SUMMARY STRIP: 4 COMPACT GLASS CARDS IN ONE ROW */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* Total Products (Clears status filter to ALL) */}
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`cursor-pointer p-3 sm:p-3.5 rounded-2xl bg-[rgba(40,40,40,0.45)] backdrop-blur-[20px] saturate-[90%] border transition-all duration-200 hover:-translate-y-0.5 select-none ${
            statusFilter === 'ALL'
              ? 'border-[#D5F737] shadow-[0_0_16px_rgba(213,247,55,0.22)] bg-[rgba(48,48,48,0.65)]'
              : 'border-white/10 hover:border-white/20 hover:bg-white/[0.06]'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-[#9A9A9A]">Total Products</span>
            <div className="w-6 h-6 rounded-md bg-[#D5F737]/15 border border-[#D5F737]/30 flex items-center justify-center text-[#D5F737]">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight">
            <NumberTicker value={summaryCounts.total} className="text-white" />
          </div>
          <div className="text-[10px] text-[#9A9A9A] mt-0.5">Full active inventory</div>
        </div>

        {/* In Stock */}
        <div
          onClick={() => setStatusFilter('IN_STOCK')}
          className={`cursor-pointer p-3 sm:p-3.5 rounded-2xl bg-[rgba(40,40,40,0.45)] backdrop-blur-[20px] saturate-[90%] border transition-all duration-200 hover:-translate-y-0.5 select-none ${
            statusFilter === 'IN_STOCK'
              ? 'border-[#D5F737] shadow-[0_0_16px_rgba(213,247,55,0.22)] bg-[rgba(48,48,48,0.65)]'
              : 'border-white/10 hover:border-white/20 hover:bg-white/[0.06]'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-emerald-400">In Stock</span>
            <div className="w-6 h-6 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight">
            <NumberTicker value={summaryCounts.inStock} className="text-white" />
          </div>
          <div className="text-[10px] text-emerald-400/80 mt-0.5">Healthy safety levels</div>
        </div>

        {/* Low Stock */}
        <div
          onClick={() => setStatusFilter('LOW')}
          className={`cursor-pointer p-3 sm:p-3.5 rounded-2xl bg-[rgba(40,40,40,0.45)] backdrop-blur-[20px] saturate-[90%] border transition-all duration-200 hover:-translate-y-0.5 select-none ${
            statusFilter === 'LOW'
              ? 'border-[#D5F737] shadow-[0_0_16px_rgba(213,247,55,0.22)] bg-[rgba(48,48,48,0.65)]'
              : 'border-white/10 hover:border-white/20 hover:bg-white/[0.06]'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-[#F5A524]">Low Stock</span>
            <div className="w-6 h-6 rounded-md bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[#F5A524]">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5A524] leading-tight">
            <NumberTicker value={summaryCounts.lowStock} className="text-[#F5A524]" />
          </div>
          <div className="text-[10px] text-[#F5A524]/80 mt-0.5">Below safety stock</div>
        </div>

        {/* Out of Stock */}
        <div
          onClick={() => setStatusFilter('OUT')}
          className={`cursor-pointer p-3 sm:p-3.5 rounded-2xl bg-[rgba(40,40,40,0.45)] backdrop-blur-[20px] saturate-[90%] border transition-all duration-200 hover:-translate-y-0.5 select-none ${
            statusFilter === 'OUT'
              ? 'border-[#D5F737] shadow-[0_0_16px_rgba(213,247,55,0.22)] bg-[rgba(48,48,48,0.65)]'
              : 'border-white/10 hover:border-white/20 hover:bg-white/[0.06]'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-[#F0506E]">Out of Stock</span>
            <div className="w-6 h-6 rounded-md bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-[#F0506E]">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-[#F0506E] leading-tight">
            <NumberTicker value={summaryCounts.outOfStock} className="text-[#F0506E]" />
          </div>
          <div className="text-[10px] text-[#F0506E]/80 mt-0.5">Fulfillment halted</div>
        </div>
      </section>

      {/* 3. FILTERS BAR: Search, Category, Status Pills */}
      <section className="flex flex-wrap items-center gap-3">
        {/* Search Box */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#9A9A9A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by product name, SKU, category, or supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[rgba(40,40,40,0.45)] backdrop-blur-[20px] border border-white/10 rounded-full pl-9 pr-4 py-2 text-xs text-white placeholder-[#9A9A9A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737] transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A9A9A] hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div className="relative min-w-[170px]">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full appearance-none bg-[#232323] border border-white/10 rounded-full px-4 py-2 pr-8 text-xs text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737] transition-all cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#9A9A9A] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Status Filter (All / In Stock / Low / Out) */}
        <div className="flex items-center gap-1 bg-[#232323] p-1 rounded-full border border-white/10">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737] ${
              statusFilter === 'ALL'
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-[#9A9A9A] hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('IN_STOCK')}
            className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
              statusFilter === 'IN_STOCK'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-[#9A9A9A] hover:text-white'
            }`}
          >
            In Stock
          </button>
          <button
            onClick={() => setStatusFilter('LOW')}
            className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
              statusFilter === 'LOW'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-[#9A9A9A] hover:text-white'
            }`}
          >
            Low
          </button>
          <button
            onClick={() => setStatusFilter('OUT')}
            className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
              statusFilter === 'OUT'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'text-[#9A9A9A] hover:text-white'
            }`}
          >
            Out
          </button>
        </div>
      </section>

      {/* 4. TABLE CARD: WRAPPED IN ONE GLASS CARD (TABLE GROWS WITH PAGE) */}
      <div className="rounded-[24px] border border-white/10 bg-[rgba(40,40,40,0.45)] backdrop-blur-[20px] saturate-[90%] shadow-2xl overflow-hidden no-card-spotlight">
        {/* DESKTOP & TABLET TABLE (hidden on <640px) */}
        <div data-lenis-prevent className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {/* Sticky Table Header */}
            <thead className="sticky top-0 z-20 bg-[#232323]/95 backdrop-blur-[16px] border-b border-white/10 text-[11px] font-semibold uppercase tracking-wider text-[#9A9A9A]">
              <tr>
                <th className="py-3.5 px-4 w-[28%] min-w-[200px]">Product</th>
                <th className="py-3.5 px-4 w-[16%] min-w-[140px]">SKU</th>
                <th className="py-3.5 px-4 w-[14%] min-w-[130px]">Category</th>
                <th className="py-3.5 px-4 w-[14%] min-w-[130px] hidden lg:table-cell">Supplier</th>
                <th className="py-3.5 px-4 w-[12%] min-w-[110px]">Stock</th>
                <th className="py-3.5 px-4 w-[10%] min-w-[90px] hidden lg:table-cell">Min Stock</th>
                <th className="py-3.5 px-4 w-[12%] min-w-[110px]">Status</th>
                <th className="py-3.5 px-4 w-[8%] min-w-[90px] text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {loading ? (
                // Shimmering skeleton rows
                [1, 2, 3, 4, 5, 6].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3.5 px-4">
                      <div className="h-4 bg-white/10 rounded w-44 mb-1.5" />
                      <div className="h-2.5 bg-white/5 rounded w-20" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-5 bg-white/10 rounded w-24" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-5 bg-white/10 rounded-full w-28" />
                    </td>
                    <td className="py-3.5 px-4 hidden lg:table-cell">
                      <div className="h-4 bg-white/10 rounded w-24" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-4 bg-white/10 rounded w-14 mb-1.5" />
                      <div className="h-1.5 bg-white/5 rounded-full w-20" />
                    </td>
                    <td className="py-3.5 px-4 hidden lg:table-cell">
                      <div className="h-4 bg-white/10 rounded w-12" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-5 bg-white/10 rounded-full w-24" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="h-7 bg-white/10 rounded-full w-16 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((p, index) => {
                  const qty = p.stock ?? 0;
                  const min = p.minStock ?? 10;
                  const isOut = qty === 0;
                  const isLow = !isOut && qty <= min;

                  // Stock progress ratio (full bar at 3x minStock or more)
                  const maxStockRef = Math.max(min * 3, 30);
                  const progressPct = Math.min(100, Math.round((qty / maxStockRef) * 100));

                  // Left edge highlight (3px amber or red, else transparent)
                  const leftEdgeClass = isOut
                    ? 'border-l-[3px] border-l-[#F0506E]'
                    : isLow
                    ? 'border-l-[3px] border-l-[#F5A524]'
                    : 'border-l-[3px] border-l-transparent';

                  return (
                    <motion.tr
                      key={p._id || p.id || p.sku}
                      initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: index < 15 ? index * 0.03 : 0,
                        duration: 0.25,
                        ease: 'easeOut',
                      }}
                      className={`${leftEdgeClass} hover:bg-white/[0.06] hover:shadow-[inset_3px_0_0_#D5F737] transition-all duration-200 group`}
                    >
                      {/* Product Name (2 lines max, tooltip on hover) */}
                      <td className="py-3.5 px-4">
                        <div
                          className="font-semibold text-sm text-white group-hover:text-[#D5F737] transition-colors line-clamp-2 leading-snug cursor-default"
                          title={p.name}
                        >
                          {p.name}
                        </div>
                        <div className="text-[11px] text-[#9A9A9A] font-mono mt-0.5">
                          ₹{p.sellingPrice?.toLocaleString('en-IN')} retail
                        </div>
                      </td>

                      {/* SKU (1 line whitespace-nowrap, monospace chip) */}
                      <td className="py-3.5 px-4">
                        <span className="whitespace-nowrap font-mono text-xs px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-zinc-300 inline-block tracking-wide">
                          {p.sku}
                        </span>
                      </td>

                      {/* Category (chip with consistent colored dot) */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/[0.06] border border-white/10 text-zinc-300">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getCategoryColor(p.category || 'General') }}
                          />
                          <span className="truncate max-w-[120px]">{p.category || 'General'}</span>
                        </span>
                      </td>

                      {/* Supplier (hidden <1024px) */}
                      <td className="py-3.5 px-4 text-xs text-[#9A9A9A] truncate hidden lg:table-cell">
                        {p.supplier || '—'}
                      </td>

                      {/* Stock Column + Thin Progress Bar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className={`text-sm font-bold font-mono ${
                              isOut ? 'text-[#F0506E]' : isLow ? 'text-[#F5A524]' : 'text-[#D5F737]'
                            }`}
                          >
                            {qty.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-[#9A9A9A]">units</span>
                        </div>
                        {/* Thin progress bar */}
                        <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden mt-1.5">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${progressPct}%`,
                              backgroundColor: isOut ? '#F0506E' : isLow ? '#F5A524' : '#D5F737',
                            }}
                          />
                        </div>
                      </td>

                      {/* Min Stock (hidden <1024px) */}
                      <td className="py-3.5 px-4 text-xs text-[#9A9A9A] font-mono hidden lg:table-cell">
                        {min} units
                      </td>

                      {/* Status Badges with Pulsing Out Dot */}
                      <td className="py-3.5 px-4">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            In Stock
                          </span>
                        )}
                      </td>

                      {/* Actions (Edit & Delete) */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-[#9A9A9A] hover:text-white transition-all hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(p)}
                            className="p-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-all hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              ) : (
                // Centered Empty State
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#9A9A9A]">
                        {search || categoryFilter !== 'ALL' || statusFilter !== 'ALL' ? (
                          <FilterX className="w-6 h-6 text-[#9A9A9A]" />
                        ) : (
                          <Package className="w-6 h-6 text-[#D5F737]" />
                        )}
                      </div>
                      <div className="text-sm font-semibold text-white">
                        {search || categoryFilter !== 'ALL' || statusFilter !== 'ALL'
                          ? 'No matching products found'
                          : 'Your inventory catalog is empty'}
                      </div>
                      <p className="text-xs text-[#9A9A9A] max-w-sm">
                        {search || categoryFilter !== 'ALL' || statusFilter !== 'ALL'
                          ? 'Try adjusting your search terms or clearing the active filters to see all catalog items.'
                          : 'Get started by creating your first product item in the warehouse catalog.'}
                      </p>
                      {search || categoryFilter !== 'ALL' || statusFilter !== 'ALL' ? (
                        <button
                          onClick={() => {
                            setSearch('');
                            setCategoryFilter('ALL');
                            setStatusFilter('ALL');
                          }}
                          className="mt-2 px-5 py-2 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
                        >
                          Clear Filters
                        </button>
                      ) : (
                        <button
                          onClick={openAddModal}
                          className="mt-2 px-5 py-2 rounded-full text-xs font-bold bg-[#D5F737] hover:bg-[#D9F958] text-black transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
                        >
                          Add Product
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE STACKED CARDS VIEW (Under 640px) */}
        <div className="sm:hidden p-3 space-y-3">
          {loading ? (
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 rounded-2xl bg-[#1C1C1C] border border-white/5 animate-pulse space-y-3">
                <div className="h-4 bg-white/10 rounded w-3/4" />
                <div className="h-3 bg-white/5 rounded w-1/2" />
                <div className="h-8 bg-white/10 rounded-xl" />
              </div>
            ))
          ) : filteredProducts.length > 0 ? (
            filteredProducts.map((p, index) => {
              const qty = p.stock ?? 0;
              const min = p.minStock ?? 10;
              const isOut = qty === 0;
              const isLow = !isOut && qty <= min;
              const maxStockRef = Math.max(min * 3, 30);
              const progressPct = Math.min(100, Math.round((qty / maxStockRef) * 100));

              const leftEdgeClass = isOut
                ? 'border-l-[3px] border-l-[#F0506E]'
                : isLow
                ? 'border-l-[3px] border-l-[#F5A524]'
                : 'border-l-[3px] border-l-transparent';

              return (
                <motion.div
                  key={p._id || p.id || p.sku}
                  initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index < 10 ? index * 0.03 : 0, duration: 0.2 }}
                  className={`p-3.5 rounded-2xl bg-[#1C1C1C] border border-white/5 ${leftEdgeClass} space-y-3`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300">
                        {p.sku}
                      </span>
                      <h3 className="font-semibold text-sm text-white mt-1.5 leading-snug">{p.name}</h3>
                      <div className="text-[11px] text-[#9A9A9A] font-mono mt-0.5">
                        ₹{p.sellingPrice?.toLocaleString('en-IN')} retail
                      </div>
                    </div>
                    {/* Status badge */}
                    {isOut ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex-shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                        Out
                      </span>
                    ) : isLow ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex-shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        Low
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex-shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        In Stock
                      </span>
                    )}
                  </div>

                  {/* Category chip & Stock info */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] bg-white/[0.06] border border-white/10 text-zinc-300">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: getCategoryColor(p.category || 'General') }}
                      />
                      <span>{p.category || 'General'}</span>
                    </span>

                    <div className="text-right">
                      <div className="text-xs font-bold font-mono">
                        <span className={isOut ? 'text-[#F0506E]' : isLow ? 'text-[#F5A524]' : 'text-[#D5F737]'}>
                          {qty}
                        </span>{' '}
                        <span className="text-[10px] text-[#9A9A9A] font-normal">/ min {min}</span>
                      </div>
                      <div className="w-20 h-1 bg-white/10 rounded-full overflow-hidden mt-1 ml-auto">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${progressPct}%`,
                            backgroundColor: isOut ? '#F0506E' : isLow ? '#F5A524' : '#D5F737',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                    <button
                      onClick={() => openEditModal(p)}
                      className="px-3 py-1 rounded-full text-xs font-medium border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => openDeleteModal(p)}
                      className="px-3 py-1 rounded-full text-xs font-medium border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="py-16 text-center space-y-2">
              <div className="text-sm font-semibold text-white">No products found</div>
              <p className="text-xs text-[#9A9A9A]">Adjust filters or add a new product.</p>
            </div>
          )}
        </div>
      </div>

      {/* ======================= MODAL: Add Product ======================= */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div
            onClick={() => setIsAddModalOpen(false)}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#232323]/95 backdrop-blur-[24px] border border-white/10 rounded-[24px] w-full max-w-lg p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#D5F737]/15 border border-[#D5F737]/30 flex items-center justify-center text-[#D5F737]">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Add New Product</h3>
                    <p className="text-[11px] text-[#9A9A9A]">Create a new item in your inventory catalog</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-[#9A9A9A] hover:text-white p-1.5 rounded-full hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="mt-3 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleAddProduct} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Product Name *</label>
                  <input
                    ref={addNameInputRef}
                    required
                    type="text"
                    placeholder="e.g. ESP32-WROOM-32D Wi-Fi Module"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
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
                      className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737] uppercase font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Category</label>
                    <input
                      type="text"
                      placeholder="e.g. Semiconductors"
                      value={productForm.category}
                      onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                      className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
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
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Initial Stock</label>
                    <input
                      type="number"
                      min="0"
                      value={productForm.stock}
                      onChange={(e) => setProductForm({ ...productForm, stock: Number(e.target.value) })}
                      className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Min Safety Stock</label>
                    <input
                      type="number"
                      min="0"
                      value={productForm.minStock}
                      onChange={(e) => setProductForm({ ...productForm, minStock: Number(e.target.value) })}
                      className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737] font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Unit Cost (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={productForm.unitCost}
                      onChange={(e) => setProductForm({ ...productForm, unitCost: Number(e.target.value) })}
                      className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Selling Price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={productForm.sellingPrice}
                      onChange={(e) => setProductForm({ ...productForm, sellingPrice: Number(e.target.value) })}
                      className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737] font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-full text-xs font-semibold border border-white/10 hover:bg-white/5 text-zinc-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-full text-xs font-bold bg-[#D5F737] hover:bg-[#D9F958] text-black transition-all hover:scale-[1.02] active:scale-[0.97] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
                  >
                    {submitting ? 'Creating...' : 'Create Product'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================= MODAL: Edit Product ======================= */}
      <AnimatePresence>
        {isEditModalOpen && activeProduct && (
          <div
            onClick={() => setIsEditModalOpen(false)}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#232323]/95 backdrop-blur-[24px] border border-white/10 rounded-[24px] w-full max-w-lg p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Pencil className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Edit Product</h3>
                    <p className="text-[11px] text-[#9A9A9A] font-mono">{activeProduct.sku}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-[#9A9A9A] hover:text-white p-1.5 rounded-full hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="mt-3 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleEditProduct} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Product Name *</label>
                  <input
                    ref={editNameInputRef}
                    required
                    type="text"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">SKU Code</label>
                    <input
                      type="text"
                      value={productForm.sku}
                      onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                      className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737] uppercase font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Category</label>
                    <input
                      type="text"
                      value={productForm.category}
                      onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                      className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Supplier</label>
                  <input
                    type="text"
                    value={productForm.supplier}
                    onChange={(e) => setProductForm({ ...productForm, supplier: e.target.value })}
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Current Stock</label>
                    <input
                      type="number"
                      min="0"
                      value={productForm.stock}
                      onChange={(e) => setProductForm({ ...productForm, stock: Number(e.target.value) })}
                      className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Min Safety Stock</label>
                    <input
                      type="number"
                      min="0"
                      value={productForm.minStock}
                      onChange={(e) => setProductForm({ ...productForm, minStock: Number(e.target.value) })}
                      className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737] font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Unit Cost (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={productForm.unitCost}
                      onChange={(e) => setProductForm({ ...productForm, unitCost: Number(e.target.value) })}
                      className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Selling Price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={productForm.sellingPrice}
                      onChange={(e) => setProductForm({ ...productForm, sellingPrice: Number(e.target.value) })}
                      className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737] font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 rounded-full text-xs font-semibold border border-white/10 hover:bg-white/5 text-zinc-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-full text-xs font-bold bg-[#D5F737] hover:bg-[#D9F958] text-black transition-all hover:scale-[1.02] active:scale-[0.97] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
                  >
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================= MODAL: Stock In ======================= */}
      <AnimatePresence>
        {isStockInModalOpen && (
          <div
            onClick={() => setIsStockInModalOpen(false)}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#232323]/95 backdrop-blur-[24px] border border-white/10 rounded-[24px] w-full max-w-md p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <ArrowDownToLine className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Stock In (Receipt)</h3>
                    <p className="text-[11px] text-[#9A9A9A]">Increase product warehouse quantity</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsStockInModalOpen(false)}
                  className="text-[#9A9A9A] hover:text-white p-1.5 rounded-full hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="mt-3 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleStockIn} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Select Product *</label>
                  <select
                    ref={stockInSelectRef}
                    required
                    value={stockMovementForm.productId}
                    onChange={(e) => setStockMovementForm({ ...stockMovementForm, productId: e.target.value })}
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 cursor-pointer"
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
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Quantity to Add *</label>
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
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Reason / Document Reference</label>
                  <input
                    type="text"
                    placeholder="e.g. PO-8921 Shipment arrival"
                    value={stockMovementForm.reason}
                    onChange={(e) => setStockMovementForm({ ...stockMovementForm, reason: e.target.value })}
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsStockInModalOpen(false)}
                    className="px-4 py-2 rounded-full text-xs font-semibold border border-white/10 hover:bg-white/5 text-zinc-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !stockMovementForm.productId}
                    className="px-5 py-2 rounded-full text-xs font-bold bg-emerald-400 hover:bg-emerald-300 text-black transition-all hover:scale-[1.02] active:scale-[0.97] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                  >
                    {submitting ? 'Recording...' : 'Confirm Stock In'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================= MODAL: Stock Out ======================= */}
      <AnimatePresence>
        {isStockOutModalOpen && (
          <div
            onClick={() => setIsStockOutModalOpen(false)}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#232323]/95 backdrop-blur-[24px] border border-white/10 rounded-[24px] w-full max-w-md p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <ArrowUpFromLine className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Stock Out (Dispatch)</h3>
                    <p className="text-[11px] text-[#9A9A9A]">Deduct inventory for shipment or usage</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsStockOutModalOpen(false)}
                  className="text-[#9A9A9A] hover:text-white p-1.5 rounded-full hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="mt-3 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleStockOut} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Select Product *</label>
                  <select
                    ref={stockOutSelectRef}
                    required
                    value={stockMovementForm.productId}
                    onChange={(e) => setStockMovementForm({ ...stockMovementForm, productId: e.target.value })}
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer"
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
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Quantity to Deduct *</label>
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
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Reason / Document Reference</label>
                  <input
                    type="text"
                    placeholder="e.g. SO-4421 Dispatched to Customer"
                    value={stockMovementForm.reason}
                    onChange={(e) => setStockMovementForm({ ...stockMovementForm, reason: e.target.value })}
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsStockOutModalOpen(false)}
                    className="px-4 py-2 rounded-full text-xs font-semibold border border-white/10 hover:bg-white/5 text-zinc-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !stockMovementForm.productId}
                    className="px-5 py-2 rounded-full text-xs font-bold bg-amber-400 hover:bg-amber-300 text-black transition-all hover:scale-[1.02] active:scale-[0.97] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    {submitting ? 'Recording...' : 'Confirm Stock Out'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================= MODAL: Delete Product Confirm ======================= */}
      <AnimatePresence>
        {isDeleteModalOpen && productToDelete && (
          <div
            onClick={() => setIsDeleteModalOpen(false)}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#232323]/95 backdrop-blur-[24px] border border-white/10 rounded-[24px] w-full max-w-md p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-[#F0506E]">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-white">Delete Product</h3>
                </div>
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="text-[#9A9A9A] hover:text-white p-1.5 rounded-full hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-4 space-y-2">
                <p className="text-sm text-zinc-200 leading-relaxed">
                  Delete <span className="font-semibold text-white">"{productToDelete.name}"</span>?
                </p>
                <p className="text-xs text-[#9A9A9A]">
                  SKU: <span className="font-mono text-zinc-300">{productToDelete.sku}</span> • Current Stock:{' '}
                  <span className="font-mono text-zinc-300">{productToDelete.stock} units</span>
                </p>
                <p className="text-xs text-rose-400/90 pt-1">
                  This product and its associated logs will be permanently removed from inventory.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold border border-white/10 hover:bg-white/5 text-zinc-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={confirmDeleteProduct}
                  className="px-5 py-2 rounded-full text-xs font-bold bg-[#F0506E] hover:bg-[#F2647E] text-white shadow-lg shadow-rose-500/20 transition-all hover:scale-[1.02] active:scale-[0.97] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                >
                  {submitting ? 'Deleting...' : 'Delete Product'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================= TOAST NOTIFICATION ======================= */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#232323]/95 backdrop-blur-[20px] shadow-2xl border ${
              toast.type === 'success'
                ? 'border-[#D5F737]/40 text-[#D5F737]'
                : 'border-[#F0506E]/40 text-[#F0506E]'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#D5F737]" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-[#F0506E]" />
            )}
            <span className="text-xs font-medium text-white">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="text-[#9A9A9A] hover:text-white ml-2 p-0.5 rounded-full hover:bg-white/5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InventoryPage;
