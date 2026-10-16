import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Upload,
  Download,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  X,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Ban,
  Percent,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { NumberTicker } from '@/components/ui/number-ticker';
import api from '@/lib/axios';

export interface SaleItem {
  _id: string;
  productId?: string;
  productName: string;
  name?: string;
  sku: string;
  category: string;
  quantity: number;
  unitCost: number;
  salePrice: number;
  revenue: number;
  profit: number;
  customer?: string;
  note?: string;
  date: string;
  stockAdjusted: boolean;
  voided: boolean;
  voidedAt?: string;
  isDemo?: boolean;
}

export interface SalesSummary {
  revenue: number;
  costOfGoods: number;
  profit: number;
  marginPercent: number;
  unitsSold: number;
  salesCount: number;
  previousPeriod: {
    revenue: number;
    profit: number;
    revenueChangePercent: number;
    profitChangePercent: number;
  };
  monthly: {
    month: string;
    revenue: number;
    cost: number;
    profit: number;
    yearMonthKey: string;
  }[];
  topProducts: {
    name: string;
    sku: string;
    units: number;
    revenue: number;
    profit: number;
  }[];
  lossMakingCount: number;
  hasDemoData: boolean;
}

interface ProductOption {
  _id: string;
  id?: string;
  name: string;
  sku: string;
  category?: string;
  stock: number;
  sellingPrice: number;
  unitCost: number;
}

interface ToastNotification {
  id: number;
  message: string;
  type: 'success' | 'error';
}

const formatINR = (num: number): string => {
  return Math.round(num || 0).toLocaleString('en-IN');
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

export const SalesPage: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();

  // Primary State
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filters & Period State
  const [period, setPeriod] = useState<'this_month' | 'last_month' | 'last_6_months' | 'all'>('this_month');
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [showVoided, setShowVoided] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });

  // Modals
  const [isRecordModalOpen, setIsRecordModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isClearDemoModalOpen, setIsClearDemoModalOpen] = useState<boolean>(false);
  const [saleToVoid, setSaleToVoid] = useState<SaleItem | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Toast State
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    const newToast = { id: Date.now(), message, type };
    setToast(newToast);
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Record Sale Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const [recordForm, setRecordForm] = useState({
    productId: '',
    quantity: 1,
    salePrice: 0,
    date: todayStr,
    customer: '',
    note: '',
    adjustStock: true
  });

  // CSV Import State
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importAdjustStock, setImportAdjustStock] = useState<boolean>(false);
  const [importFileName, setImportFileName] = useState<string>('');
  const [importSummaryResult, setImportSummaryResult] = useState<{
    imported: number;
    skipped: number;
    errors: { row: number; message: string }[];
  } | null>(null);

  // Calculate Date Bounds for Period Filter
  const dateBounds = useMemo(() => {
    const now = new Date();
    if (period === 'this_month') {
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
      return { from, to };
    }
    if (period === 'last_month') {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).toISOString();
      return { from, to };
    }
    if (period === 'last_6_months') {
      const from = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
      return { from, to };
    }
    return { from: undefined, to: undefined };
  }, [period]);

  // Fetch Sales Summary
  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      const params: any = {};
      if (dateBounds.from) params.from = dateBounds.from;
      if (dateBounds.to) params.to = dateBounds.to;
      const res = await api.get('/api/sales/summary', { params });
      setSummary(res.data?.data || null);
    } catch (err: any) {
      console.error('Failed to fetch sales summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Fetch Sales Listing
  const fetchSales = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit: 10,
        includeVoided: showVoided
      };
      if (dateBounds.from) params.from = dateBounds.from;
      if (dateBounds.to) params.to = dateBounds.to;
      if (search.trim()) params.search = search.trim();
      if (categoryFilter !== 'ALL') params.category = categoryFilter;

      const res = await api.get('/api/sales', { params });
      const items = res.data?.data || [];
      setSales(items);
      if (res.data?.pagination) {
        setPagination({
          page: res.data.pagination.page || page,
          limit: res.data.pagination.limit || 10,
          total: res.data.pagination.totalRecords ?? items.length,
          totalPages: res.data.pagination.totalPages || 1
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch sales:', err);
      showToast('Failed to load sales list', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch Products Catalog for record modal selection
  const fetchProductsCatalog = async () => {
    try {
      const res = await api.get('/api/products');
      const prods = res.data?.data?.products || res.data?.data || res.data?.products || [];
      if (Array.isArray(prods)) {
        setProducts(prods);
      }
    } catch (err) {
      console.warn('Failed to fetch products for sales modal:', err);
    }
  };

  useEffect(() => {
    fetchProductsCatalog();
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [dateBounds]);

  useEffect(() => {
    fetchSales();
  }, [dateBounds, search, categoryFilter, showVoided, page]);

  // Categories list for filter dropdown
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    sales.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [sales, products]);

  // Selected Product for Record Sale preview
  const selectedProduct = useMemo(() => {
    return products.find((p) => (p._id || p.id || p.sku) === recordForm.productId) || null;
  }, [products, recordForm.productId]);

  // Live Record Profit Preview calculation
  const livePreview = useMemo(() => {
    const qty = Number(recordForm.quantity) || 0;
    const price = Number(recordForm.salePrice) || 0;
    const cost = Number(selectedProduct?.unitCost ?? 0);
    const revenue = Math.round(qty * price * 100) / 100;
    const totalCost = Math.round(qty * cost * 100) / 100;
    const profit = Math.round((revenue - totalCost) * 100) / 100;
    const margin = revenue > 0 ? Math.round(((profit / revenue) * 100) * 10) / 10 : 0;
    return { revenue, totalCost, profit, margin };
  }, [recordForm.quantity, recordForm.salePrice, selectedProduct]);

  // Check if chosen sale date is today or earlier
  const isDateToday = useMemo(() => {
    if (!recordForm.date) return true;
    return recordForm.date === todayStr;
  }, [recordForm.date, todayStr]);

  // Open Record Modal
  const openRecordModal = () => {
    setFormError(null);
    const defaultProd = products.length > 0 ? products[0] : null;
    setRecordForm({
      productId: defaultProd ? defaultProd._id || defaultProd.id || defaultProd.sku : '',
      quantity: 1,
      salePrice: defaultProd ? defaultProd.sellingPrice ?? 150 : 150,
      date: todayStr,
      customer: '',
      note: '',
      adjustStock: true
    });
    setIsRecordModalOpen(true);
  };

  // Submit Record Sale
  const handleRecordSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await api.post('/api/sales', {
        productId: recordForm.productId,
        quantity: Number(recordForm.quantity),
        salePrice: Number(recordForm.salePrice),
        date: recordForm.date,
        customer: recordForm.customer.trim() || undefined,
        note: recordForm.note.trim() || undefined,
        adjustStock: isDateToday ? true : recordForm.adjustStock
      });
      setIsRecordModalOpen(false);
      showToast('Sale recorded successfully!');
      fetchSummary();
      fetchSales();
      fetchProductsCatalog();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to record sale';
      setFormError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Void Sale Confirmation
  const handleConfirmVoid = async () => {
    if (!saleToVoid) return;
    setSubmitting(true);
    try {
      await api.post(`/api/sales/${saleToVoid._id}/void`);
      showToast('Sale voided successfully');
      setSaleToVoid(null);
      fetchSummary();
      fetchSales();
      fetchProductsCatalog();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to void sale';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Clear Demo Data Confirmation
  const handleConfirmClearDemo = async () => {
    setSubmitting(true);
    try {
      const res = await api.delete('/api/sales/demo');
      showToast(`Removed ${res.data?.data?.deletedCount || 'all'} demo records`);
      setIsClearDemoModalOpen(false);
      fetchSummary();
      fetchSales();
      fetchProductsCatalog();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to delete demo data';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // CSV Template Generator
  const downloadCsvTemplate = () => {
    const csvContent = 'sku,quantity,salePrice,date,customer\nMCU-STM32-401,5,750,2026-10-15,Acme Robotics India\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sales_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Client-side CSV File Parser
  const handleCsvFile = (file: File) => {
    setImportFileName(file.name);
    setImportSummaryResult(null);
    setFormError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length < 2) {
        setFormError('CSV file is empty or missing data rows');
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const skuIdx = headers.indexOf('sku');
      const qtyIdx = headers.indexOf('quantity');
      const priceIdx = headers.indexOf('saleprice');
      const dateIdx = headers.indexOf('date');
      const customerIdx = headers.indexOf('customer');

      if (skuIdx === -1 || qtyIdx === -1) {
        setFormError('CSV must include "sku" and "quantity" columns');
        return;
      }

      const parsed: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.trim());
        const sku = parts[skuIdx] ? parts[skuIdx].toUpperCase() : '';
        const quantity = Number(parts[qtyIdx]) || 0;
        const salePrice = priceIdx !== -1 && parts[priceIdx] !== undefined ? Number(parts[priceIdx]) : undefined;
        const date = dateIdx !== -1 && parts[dateIdx] ? parts[dateIdx] : todayStr;
        const customer = customerIdx !== -1 && parts[customerIdx] ? parts[customerIdx] : '';

        // Validation flags for preview
        const skuExists = products.some((p) => p.sku === sku);
        const validQty = quantity > 0;
        const validPrice = salePrice === undefined || salePrice >= 0;
        const validDate = !isNaN(new Date(date).getTime()) && new Date(date).getTime() <= Date.now() + 60000;
        const isValid = skuExists && validQty && validPrice && validDate;

        parsed.push({
          row: i,
          sku,
          quantity,
          salePrice,
          date,
          customer,
          isValid,
          validationError: !skuExists
            ? 'SKU not found'
            : !validQty
            ? 'Qty <= 0'
            : !validPrice
            ? 'Price < 0'
            : !validDate
            ? 'Invalid date'
            : null
        });
      }

      setImportRows(parsed);
    };
    reader.readAsText(file);
  };

  // Submit CSV Import
  const handleImportSubmit = async () => {
    if (importRows.length === 0) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const payloadRows = importRows.map((r) => ({
        sku: r.sku,
        quantity: r.quantity,
        salePrice: r.salePrice,
        date: r.date,
        customer: r.customer
      }));

      const res = await api.post('/api/sales/import', {
        rows: payloadRows,
        adjustStock: importAdjustStock
      });

      const resData = res.data?.data || res.data;
      setImportSummaryResult(resData);
      showToast(`Imported ${resData.imported} sales successfully`);
      fetchSummary();
      fetchSales();
      fetchProductsCatalog();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Import failed';
      setFormError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Client-side CSV Export
  const handleExportCsv = () => {
    if (sales.length === 0) {
      showToast('No sales data to export', 'error');
      return;
    }

    const headers = ['Date', 'SKU', 'Product', 'Quantity', 'UnitCost', 'SalePrice', 'Revenue', 'Profit', 'Customer', 'Voided'];
    const rows = sales.map((s) => [
      s.date ? new Date(s.date).toISOString().split('T')[0] : '',
      `"${s.sku || ''}"`,
      `"${(s.productName || s.name || '').replace(/"/g, '""')}"`,
      s.quantity || 0,
      s.unitCost || 0,
      s.salePrice || 0,
      s.revenue || 0,
      s.profit || 0,
      `"${(s.customer || '').replace(/"/g, '""')}"`,
      s.voided ? 'YES' : 'NO'
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sales_export_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Exported sales data to CSV');
  };

  // Max profit in top products for relative bar length
  const maxTopProfit = useMemo(() => {
    if (!summary?.topProducts || summary.topProducts.length === 0) return 1;
    return Math.max(...summary.topProducts.map((p) => p.profit), 1);
  }, [summary?.topProducts]);

  return (
    <div className="min-h-full w-full max-w-full p-4 sm:p-6 space-y-6 text-white font-['Outfit',sans-serif] select-none pb-16">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-[20px] text-xs font-semibold ${
              toast.type === 'success'
                ? 'bg-[#1C1C1C]/95 border border-[#D5F737]/40 text-[#D5F737] shadow-[0_8px_30px_rgba(213,247,55,0.2)]'
                : 'bg-[#1C1C1C]/95 border border-[#F0506E]/40 text-[#F0506E] shadow-[0_8px_30px_rgba(240,80,110,0.2)]'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#D5F737]" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-[#F0506E]" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slim Amber Demo Banner */}
      {summary?.hasDemoData && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs shadow-md"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="font-medium">You are viewing demo data. Simulated sales are included in charts and metrics.</span>
          </div>
          <button
            onClick={() => setIsClearDemoModalOpen(true)}
            className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-amber-300 hover:text-white transition-all hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            Remove demo data
          </button>
        </motion.div>
      )}

      {/* 1. Header & Actions */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            Sales{' '}
            <span className="bg-gradient-to-r from-[#D5F737] to-[#7BE0A5] bg-clip-text text-transparent font-black">
              Ledger
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-[#9A9A9A] mt-0.5">
            Real-time revenue, gross margin, profitability analytics, and order history.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchSummary();
              fetchSales();
            }}
            title="Refresh Data"
            className="p-2 rounded-full border border-white/10 hover:border-[#D5F737]/40 bg-white/5 hover:bg-white/10 text-[#9A9A9A] hover:text-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#D5F737]' : ''}`} />
          </button>

          <button
            onClick={handleExportCsv}
            title="Export filtered sales to CSV"
            className="px-3.5 py-2 rounded-full text-xs font-semibold border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all duration-200 flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => {
              setImportRows([]);
              setImportFileName('');
              setImportSummaryResult(null);
              setFormError(null);
              setIsImportModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-full text-xs font-semibold border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-zinc-200 hover:text-white transition-all duration-200 flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
          >
            <Upload className="w-3.5 h-3.5 text-zinc-400" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={openRecordModal}
            className="px-4 py-2 rounded-full text-xs font-bold bg-[#D5F737] hover:bg-[#D9F958] text-black shadow-md shadow-[#D5F737]/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.97] flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Record Sale</span>
          </button>
        </div>
      </section>

      {/* 2. Top Controls & Period Filter */}
      <section className="flex items-center justify-between flex-wrap gap-3">
        <span className="text-xs text-[#9A9A9A] font-semibold uppercase tracking-wider">
          Performance Overview
        </span>

        {/* Date range segmented pill */}
        <div className="flex items-center gap-1 bg-[#1C1C1C] p-1 rounded-full border border-white/10 relative">
          {[
            { key: 'this_month', label: 'This month' },
            { key: 'last_month', label: 'Last month' },
            { key: 'last_6_months', label: 'Last 6 months' },
            { key: 'all', label: 'All time' },
          ].map((item) => {
            const active = period === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setPeriod(item.key as any)}
                className={`relative z-10 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737] ${
                  active ? 'text-black font-bold' : 'text-[#9A9A9A] hover:text-white'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="salesPeriodPill"
                    className="absolute inset-0 rounded-full -z-10 bg-[#D5F737] shadow-md shadow-[#D5F737]/20"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Top 4 Glass Cards with Counting Numbers */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Revenue */}
        <div className="p-4 rounded-3xl bg-[rgba(40,40,40,0.45)] backdrop-blur-[20px] saturate-[90%] border border-white/10 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#9A9A9A] font-semibold uppercase tracking-wider">Revenue</span>
            {summary && (
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                  summary.previousPeriod.revenueChangePercent >= 0
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                }`}
              >
                {summary.previousPeriod.revenueChangePercent >= 0 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                <span>{Math.abs(summary.previousPeriod.revenueChangePercent)}%</span>
              </span>
            )}
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono flex items-center">
            <span>₹</span>
            <NumberTicker value={summary?.revenue || 0} className="text-white" />
          </div>
          <div className="text-[11px] text-[#9A9A9A] mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
            <span>{summary?.salesCount || 0} orders</span>
            <span>{summary?.unitsSold || 0} units</span>
          </div>
        </div>

        {/* Card 2: Cost of Goods */}
        <div className="p-4 rounded-3xl bg-[rgba(40,40,40,0.45)] backdrop-blur-[20px] saturate-[90%] border border-white/10 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#9A9A9A] font-semibold uppercase tracking-wider">Cost of Goods</span>
            <span className="text-[10px] text-zinc-500 font-mono">COGS</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono flex items-center">
            <span>₹</span>
            <NumberTicker value={summary?.costOfGoods || 0} className="text-white" />
          </div>
          <div className="text-[11px] text-[#9A9A9A] mt-2 pt-2 border-t border-white/5">
            <span>Inventory acquisition base</span>
          </div>
        </div>

        {/* Card 3: Profit (Lime Border) */}
        <div className="p-4 rounded-3xl bg-[rgba(40,40,40,0.45)] backdrop-blur-[20px] saturate-[90%] border-2 border-[#D5F737]/60 shadow-[0_0_20px_rgba(213,247,55,0.12)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#D5F737] font-bold uppercase tracking-wider">Gross Profit</span>
            {summary && (
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                  summary.previousPeriod.profitChangePercent >= 0
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                }`}
              >
                {summary.previousPeriod.profitChangePercent >= 0 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                <span>{Math.abs(summary.previousPeriod.profitChangePercent)}%</span>
              </span>
            )}
          </div>
          <div
            className={`text-2xl sm:text-3xl font-extrabold font-mono flex items-center ${
              (summary?.profit ?? 0) >= 0 ? 'text-[#D5F737]' : 'text-[#F0506E]'
            }`}
          >
            <span>₹</span>
            <NumberTicker
              value={summary?.profit || 0}
              className={(summary?.profit ?? 0) >= 0 ? 'text-[#D5F737]' : 'text-[#F0506E]'}
            />
          </div>
          <div className="text-[11px] text-[#9A9A9A] mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
            <span>Net proceeds</span>
            {(summary?.lossMakingCount ?? 0) > 0 && (
              <span className="text-rose-400 text-[10px]">{summary?.lossMakingCount} loss sale(s)</span>
            )}
          </div>
        </div>

        {/* Card 4: Margin % */}
        <div className="p-4 rounded-3xl bg-[rgba(40,40,40,0.45)] backdrop-blur-[20px] saturate-[90%] border border-white/10 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#9A9A9A] font-semibold uppercase tracking-wider">Margin</span>
            <span className="text-[10px] text-[#9A9A9A] font-mono">Profit / Rev</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono flex items-baseline gap-1">
            <span>{summary?.marginPercent || 0}%</span>
          </div>
          <div className="text-[11px] text-[#9A9A9A] mt-2 pt-2 border-t border-white/5">
            <span>Target threshold: 25%</span>
          </div>
        </div>
      </section>

      {/* 4. Middle Row: 60% Monthly Chart + 40% Top Profit Products */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 60% (lg:col-span-7): Revenue vs Profit Bar Chart */}
        <div className="lg:col-span-7 p-5 rounded-3xl bg-[#232323] border border-white/10 shadow-lg flex flex-col justify-between min-h-[320px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Revenue vs Profit</h3>
              <p className="text-xs text-[#9A9A9A]">Monthly comparison over the last 6 months</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-zinc-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#5A5A5A]" /> Revenue
              </span>
              <span className="flex items-center gap-1.5 text-[#D5F737]">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#D5F737]" /> Profit
              </span>
            </div>
          </div>

          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={summary?.monthly || []}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="#9A9A9A"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <YAxis
                  stroke="#9A9A9A"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const rev = payload.find((p) => p.dataKey === 'revenue')?.value as number || 0;
                      const prof = payload.find((p) => p.dataKey === 'profit')?.value as number || 0;
                      const margin = rev > 0 ? Math.round(((prof / rev) * 100) * 10) / 10 : 0;
                      return (
                        <div className="bg-[#232323]/95 backdrop-blur-[20px] border border-white/10 rounded-2xl p-3 shadow-2xl text-xs space-y-1.5 min-w-[140px]">
                          <div className="font-bold text-white border-b border-white/10 pb-1">{label}</div>
                          <div className="flex justify-between gap-3 text-zinc-300">
                            <span>Revenue:</span>
                            <span className="font-mono font-bold text-white">₹{formatINR(rev)}</span>
                          </div>
                          <div className="flex justify-between gap-3 text-[#D5F737]">
                            <span>Profit:</span>
                            <span className="font-mono font-bold text-[#D5F737]">₹{formatINR(prof)}</span>
                          </div>
                          <div className="flex justify-between gap-3 text-zinc-400 text-[10px] pt-1 border-t border-white/5">
                            <span>Margin:</span>
                            <span className="font-mono">{margin}%</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="revenue"
                  fill="#5A5A5A"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={32}
                  isAnimationActive={!prefersReducedMotion}
                  animationDuration={1000}
                />
                <Bar
                  dataKey="profit"
                  fill="#D5F737"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={32}
                  isAnimationActive={!prefersReducedMotion}
                  animationDuration={1200}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 40% (lg:col-span-5): Top Profit Products */}
        <div className="lg:col-span-5 p-5 rounded-3xl bg-[#232323] border border-white/10 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Top Profit Products</h3>
              <p className="text-xs text-[#9A9A9A]">Ranked by total profit generated</p>
            </div>
            <span className="text-[10px] font-mono text-[#D5F737] uppercase font-bold px-2 py-0.5 rounded-full bg-[#D5F737]/10 border border-[#D5F737]/30">
              Top 5
            </span>
          </div>

          <div className="divide-y divide-white/5 flex-1 flex flex-col justify-around">
            {summary?.topProducts && summary.topProducts.length > 0 ? (
              summary.topProducts.slice(0, 5).map((item, idx) => {
                const ratioPct = Math.min(100, Math.max(8, Math.round((item.profit / maxTopProfit) * 100)));
                return (
                  <div key={item.sku || idx} className="py-2.5">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#9A9A9A] w-4">{idx + 1}.</span>
                        <div className="truncate">
                          <span className="text-xs font-semibold text-white truncate block">{item.name}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">{item.sku}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs font-bold font-mono text-[#D5F737]">₹{formatINR(item.profit)}</span>
                        <span className="text-[10px] text-[#9A9A9A] block">{item.units} sold</span>
                      </div>
                    </div>
                    {/* Relative Lime Bar */}
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full bg-[#D5F737] rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${ratioPct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-[#9A9A9A]">
                No sales recorded for this period yet.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. Bottom: Glass Table */}
      <section className="rounded-3xl bg-[#232323] border border-white/10 shadow-xl overflow-hidden">
        {/* Table Controls Bar */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search SKU, product, or customer..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-[#1C1C1C] border border-white/10 rounded-full pl-9 pr-3.5 py-1.5 text-xs text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#1C1C1C] border border-white/10 rounded-full px-3 py-1.5 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737] cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Show Voided Toggle */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-[#9A9A9A] font-medium cursor-pointer flex items-center gap-2">
              <span>Show voided</span>
              <input
                type="checkbox"
                checked={showVoided}
                onChange={(e) => setShowVoided(e.target.checked)}
                className="w-4 h-4 rounded bg-[#1C1C1C] border border-white/20 text-[#D5F737] focus-visible:ring-2 focus-visible:ring-[#D5F737] cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#1C1C1C] text-[#9A9A9A] font-semibold sticky top-0 z-10 border-b border-white/10">
              <tr>
                <th className="py-3.5 px-4 min-w-[100px]">Date</th>
                <th className="py-3.5 px-4 min-w-[200px]">Product</th>
                <th className="py-3.5 px-3 text-right min-w-[60px]">Qty</th>
                <th className="py-3.5 px-3 text-right min-w-[80px]">Cost</th>
                <th className="py-3.5 px-3 text-right min-w-[80px]">Sold At</th>
                <th className="py-3.5 px-4 text-right min-w-[90px]">Revenue</th>
                <th className="py-3.5 px-4 text-right min-w-[100px]">Profit</th>
                <th className="py-3.5 px-4 min-w-[130px]">Customer</th>
                <th className="py-3.5 px-4 text-right min-w-[80px]">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {loading ? (
                // Skeleton Rows
                [1, 2, 3, 4, 5].map((idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-3.5 px-4"><div className="h-4 bg-white/10 rounded w-16" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 bg-white/10 rounded w-40 mb-1" /><div className="h-3 bg-white/5 rounded w-20" /></td>
                    <td className="py-3.5 px-3 text-right"><div className="h-4 bg-white/10 rounded w-8 ml-auto" /></td>
                    <td className="py-3.5 px-3 text-right"><div className="h-4 bg-white/10 rounded w-12 ml-auto" /></td>
                    <td className="py-3.5 px-3 text-right"><div className="h-4 bg-white/10 rounded w-12 ml-auto" /></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-4 bg-white/10 rounded w-16 ml-auto" /></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-4 bg-white/10 rounded w-16 ml-auto" /></td>
                    <td className="py-3.5 px-4"><div className="h-4 bg-white/10 rounded w-24" /></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-6 bg-white/10 rounded-full w-12 ml-auto" /></td>
                  </tr>
                ))
              ) : sales.length > 0 ? (
                sales.map((item, index) => {
                  const isVoided = item.voided;
                  const isLoss = item.profit < 0;

                  return (
                    <motion.tr
                      key={item._id}
                      initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index < 10 ? index * 0.03 : 0, duration: 0.2 }}
                      className={`hover:bg-white/[0.04] transition-colors ${
                        isVoided ? 'opacity-40 line-through' : ''
                      }`}
                    >
                      {/* Date */}
                      <td className="py-3.5 px-4 font-mono text-zinc-300 whitespace-nowrap">
                        {formatDate(item.date)}
                      </td>

                      {/* Product (+SKU chip) */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white truncate max-w-[220px]" title={item.productName || item.name}>
                          {item.productName || item.name || 'Catalog Item'}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">
                            {item.sku}
                          </span>
                          {item.category && (
                            <span className="text-[10px] text-zinc-500">• {item.category}</span>
                          )}
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="py-3.5 px-3 text-right font-mono font-semibold text-white">
                        {item.quantity}
                      </td>

                      {/* Unit Cost */}
                      <td className="py-3.5 px-3 text-right font-mono text-zinc-400">
                        ₹{formatINR(item.unitCost)}
                      </td>

                      {/* Sold At */}
                      <td className="py-3.5 px-3 text-right font-mono text-white">
                        ₹{formatINR(item.salePrice)}
                      </td>

                      {/* Revenue */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-white">
                        ₹{formatINR(item.revenue)}
                      </td>

                      {/* Profit */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        <div className="flex items-center justify-end gap-1.5">
                          {isLoss && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-[#F0506E] border border-rose-500/30">
                              Loss
                            </span>
                          )}
                          <span
                            className={`font-bold ${
                              item.profit >= 0 ? 'text-[#D5F737]' : 'text-[#F0506E]'
                            }`}
                          >
                            ₹{formatINR(item.profit)}
                          </span>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4 text-zinc-300 truncate max-w-[140px]" title={item.customer}>
                        {item.customer || '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {isVoided ? (
                          <span className="text-[10px] text-zinc-500 italic">Voided</span>
                        ) : (
                          <button
                            onClick={() => setSaleToVoid(item)}
                            title="Void this sale"
                            className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-zinc-400 hover:text-rose-400 bg-white/5 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                          >
                            Void
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400">
                        <DollarSign className="w-6 h-6" />
                      </div>
                      <div className="text-sm font-semibold text-white">No sales yet</div>
                      <p className="text-xs text-[#9A9A9A] max-w-xs">
                        Start recording your inventory transactions to track gross revenue and net margins.
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={openRecordModal}
                          className="px-4 py-1.5 rounded-full text-xs font-bold bg-[#D5F737] hover:bg-[#D9F958] text-black shadow-md shadow-[#D5F737]/20"
                        >
                          Record Sale
                        </button>
                        <button
                          onClick={() => {
                            setImportRows([]);
                            setImportSummaryResult(null);
                            setIsImportModalOpen(true);
                          }}
                          className="px-4 py-1.5 rounded-full text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10"
                        >
                          Import CSV
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-[#9A9A9A]">
            <span>
              Showing {(page - 1) * pagination.limit + 1} to{' '}
              {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} sales
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-white px-2">
                {page} / {pagination.totalPages}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ===================== MODAL: Record Sale ===================== */}
      <AnimatePresence>
        {isRecordModalOpen && (
          <div
            onClick={() => setIsRecordModalOpen(false)}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#232323]/95 backdrop-blur-[24px] border border-white/10 rounded-[24px] w-full max-w-lg p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#D5F737]/15 border border-[#D5F737]/30 flex items-center justify-center text-[#D5F737]">
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Record Sale</h3>
                    <p className="text-[11px] text-[#9A9A9A]">Log customer dispatch and capture profit snapshot</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsRecordModalOpen(false)}
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

              <form onSubmit={handleRecordSale} className="mt-4 space-y-3.5">
                {/* Product Search Select */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Select Product *
                  </label>
                  <select
                    required
                    value={recordForm.productId}
                    onChange={(e) => {
                      const chosenId = e.target.value;
                      const p = products.find((prod) => (prod._id || prod.id || prod.sku) === chosenId);
                      setRecordForm({
                        ...recordForm,
                        productId: chosenId,
                        salePrice: p ? p.sellingPrice ?? 0 : recordForm.salePrice
                      });
                    }}
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737] cursor-pointer"
                  >
                    <option value="">-- Choose product --</option>
                    {products.map((p) => (
                      <option key={p._id || p.id || p.sku} value={p._id || p.id || p.sku}>
                        {p.name} ({p.sku}) — Available stock: {p.stock} units
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Quantity */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Quantity *
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={recordForm.quantity}
                      onChange={(e) =>
                        setRecordForm({ ...recordForm, quantity: Math.max(1, Number(e.target.value)) })
                      }
                      className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737] font-mono"
                    />
                  </div>

                  {/* Selling Price */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Selling Price (₹) *
                    </label>
                    <input
                      required
                      type="number"
                      min="0"
                      value={recordForm.salePrice}
                      onChange={(e) =>
                        setRecordForm({ ...recordForm, salePrice: Math.max(0, Number(e.target.value)) })
                      }
                      className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737] font-mono"
                    />
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Sale Date *
                  </label>
                  <input
                    required
                    type="date"
                    max={todayStr}
                    value={recordForm.date}
                    onChange={(e) => setRecordForm({ ...recordForm, date: e.target.value })}
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
                  />
                </div>

                {/* Conditional "Also reduce current stock" checkbox for past dates */}
                {!isDateToday && (
                  <div className="p-3 rounded-2xl bg-[#1C1C1C] border border-white/10 space-y-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={recordForm.adjustStock}
                        onChange={(e) => setRecordForm({ ...recordForm, adjustStock: e.target.checked })}
                        className="w-4 h-4 rounded bg-[#232323] border border-white/20 text-[#D5F737] focus-visible:ring-2 focus-visible:ring-[#D5F737]"
                      />
                      <span className="text-xs font-semibold text-white">Also reduce current stock</span>
                    </label>
                    <p className="text-[11px] text-[#9A9A9A] pl-6">
                      Leave off if your current physical stock already includes this sale.
                    </p>
                  </div>
                )}

                {/* Customer (Optional) */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Customer Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bharat IoT Labs / Retail Counter"
                    value={recordForm.customer}
                    onChange={(e) => setRecordForm({ ...recordForm, customer: e.target.value })}
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
                  />
                </div>

                {/* Note */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Note / Reference
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Contract PO-9812 / Discounted batch"
                    value={recordForm.note}
                    onChange={(e) => setRecordForm({ ...recordForm, note: e.target.value })}
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
                  />
                </div>

                {/* Live Profit Preview */}
                <div className="p-3 rounded-2xl bg-[#1C1C1C] border border-white/10 text-xs">
                  <div className="text-[10px] text-[#9A9A9A] uppercase tracking-wider mb-1 font-semibold">
                    Live Profit Preview
                  </div>
                  <div className="text-white flex items-center flex-wrap gap-1.5 font-mono text-[11px] sm:text-xs">
                    <span>Revenue <strong className="text-white">₹{formatINR(livePreview.revenue)}</strong></span>
                    <span className="text-[#9A9A9A]">•</span>
                    <span>Cost <strong className="text-white">₹{formatINR(livePreview.totalCost)}</strong></span>
                    <span className="text-[#9A9A9A]">•</span>
                    <span>
                      Profit{' '}
                      <strong className={livePreview.profit >= 0 ? 'text-[#D5F737]' : 'text-[#F0506E]'}>
                        ₹{formatINR(livePreview.profit)}
                      </strong>
                    </span>
                    <span className="text-[#9A9A9A]">({livePreview.margin}% margin)</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsRecordModalOpen(false)}
                    className="px-4 py-2 rounded-full text-xs font-semibold border border-white/10 hover:bg-white/5 text-zinc-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !recordForm.productId}
                    className="px-5 py-2 rounded-full text-xs font-bold bg-[#D5F737] hover:bg-[#D9F958] text-black shadow-md shadow-[#D5F737]/25 transition-all hover:scale-[1.02] active:scale-[0.97] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
                  >
                    {submitting ? 'Recording...' : 'Record Sale'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===================== MODAL: Import CSV ===================== */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div
            onClick={() => setIsImportModalOpen(false)}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#232323]/95 backdrop-blur-[24px] border border-white/10 rounded-[24px] w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Import Sales from CSV</h3>
                    <p className="text-[11px] text-[#9A9A9A]">Upload bulk sales ledger records</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="text-[#9A9A9A] hover:text-white p-1.5 rounded-full hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-4">
                {/* Download template */}
                <div className="flex items-center justify-between text-xs p-3 rounded-2xl bg-[#1C1C1C] border border-white/10">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <Download className="w-4 h-4 text-[#D5F737]" />
                    <span>Need the standard CSV format?</span>
                  </div>
                  <button
                    type="button"
                    onClick={downloadCsvTemplate}
                    className="font-bold text-[#D5F737] hover:underline"
                  >
                    Download template
                  </button>
                </div>

                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleCsvFile(e.dataTransfer.files[0]);
                    }
                  }}
                  className="border-2 border-dashed border-white/15 hover:border-[#D5F737]/40 rounded-2xl p-6 text-center transition-colors cursor-pointer bg-[#1C1C1C]"
                  onClick={() => document.getElementById('csvFileInput')?.click()}
                >
                  <Upload className="w-8 h-8 mx-auto text-[#9A9A9A] mb-2" />
                  <p className="text-xs font-semibold text-white">
                    {importFileName ? importFileName : 'Click or drag & drop CSV file here'}
                  </p>
                  <p className="text-[11px] text-[#9A9A9A] mt-1">Columns: sku, quantity, salePrice, date, customer</p>
                  <input
                    id="csvFileInput"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleCsvFile(e.target.files[0]);
                      }
                    }}
                  />
                </div>

                {/* Form Error */}
                {formError && (
                  <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Preview Table of first 10 rows */}
                {importRows.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">
                        Preview (First {Math.min(10, importRows.length)} of {importRows.length} rows)
                      </span>
                      <span className="text-[#D5F737] font-mono text-[11px]">
                        {importRows.filter((r) => r.isValid).length} valid / {importRows.filter((r) => !r.isValid).length} warnings
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#1C1C1C]">
                      <table className="w-full text-left text-[11px] border-collapse font-mono">
                        <thead className="bg-[#232323] text-zinc-400 border-b border-white/10">
                          <tr>
                            <th className="py-2 px-3">Status</th>
                            <th className="py-2 px-3">SKU</th>
                            <th className="py-2 px-3">Qty</th>
                            <th className="py-2 px-3">Price</th>
                            <th className="py-2 px-3">Date</th>
                            <th className="py-2 px-3">Customer</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {importRows.slice(0, 10).map((r, i) => (
                            <tr key={i} className="hover:bg-white/[0.03]">
                              <td className="py-2 px-3">
                                {r.isValid ? (
                                  <span className="text-emerald-400 flex items-center gap-1 font-sans">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> OK
                                  </span>
                                ) : (
                                  <span className="text-rose-400 flex items-center gap-1 font-sans" title={r.validationError}>
                                    <AlertTriangle className="w-3.5 h-3.5" /> {r.validationError}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-white font-bold">{r.sku}</td>
                              <td className="py-2 px-3 text-white">{r.quantity}</td>
                              <td className="py-2 px-3 text-zinc-300">₹{r.salePrice ?? 'Default'}</td>
                              <td className="py-2 px-3 text-zinc-400">{r.date}</td>
                              <td className="py-2 px-3 text-zinc-400 font-sans truncate max-w-[100px]">{r.customer || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* "Also reduce current stock" checkbox */}
                {importRows.length > 0 && (
                  <div className="p-3 rounded-2xl bg-[#1C1C1C] border border-white/10 space-y-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={importAdjustStock}
                        onChange={(e) => setImportAdjustStock(e.target.checked)}
                        className="w-4 h-4 rounded bg-[#232323] border border-white/20 text-[#D5F737] focus-visible:ring-2 focus-visible:ring-[#D5F737]"
                      />
                      <span className="text-xs font-semibold text-white">Also reduce current stock</span>
                    </label>
                    <p className="text-[11px] text-[#9A9A9A] pl-6">
                      Leave off if your current physical stock already includes these past imported sales.
                    </p>
                  </div>
                )}

                {/* Import Result Summary */}
                {importSummaryResult && (
                  <div className="p-4 rounded-2xl bg-[#1C1C1C] border border-white/10 space-y-2">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-[#D5F737]" />
                      Import Results
                    </h4>
                    <div className="text-xs font-mono grid grid-cols-2 gap-2">
                      <span className="text-emerald-400">Imported: {importSummaryResult.imported}</span>
                      <span className="text-amber-400">Skipped: {importSummaryResult.skipped}</span>
                    </div>
                    {importSummaryResult.errors?.length > 0 && (
                      <div className="text-[11px] text-rose-300 mt-2 space-y-1 max-h-24 overflow-y-auto">
                        {importSummaryResult.errors.map((e, idx) => (
                          <div key={idx}>Row {e.row}: {e.message}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/10 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold border border-white/10 hover:bg-white/5 text-zinc-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={submitting || importRows.length === 0}
                  onClick={handleImportSubmit}
                  className="px-5 py-2 rounded-full text-xs font-bold bg-[#D5F737] hover:bg-[#D9F958] text-black shadow-md shadow-[#D5F737]/25 transition-all hover:scale-[1.02] active:scale-[0.97] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D5F737]"
                >
                  {submitting ? 'Importing...' : `Import ${importRows.length} Rows`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===================== MODAL: Void Sale Confirm ===================== */}
      <AnimatePresence>
        {saleToVoid && (
          <div
            onClick={() => setSaleToVoid(null)}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#232323]/95 backdrop-blur-[24px] border border-white/10 rounded-[24px] w-full max-w-md p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-[#F0506E]">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Void this sale?</h3>
                  <p className="text-xs text-[#9A9A9A]">
                    {saleToVoid.stockAdjusted
                      ? 'Stock will be restored atomically.'
                      : 'Sale was logged without adjusting inventory; records will be marked void.'}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#1C1C1C] border border-white/10 text-xs space-y-1 mb-5">
                <div className="text-white font-semibold">{saleToVoid.productName || saleToVoid.name}</div>
                <div className="text-zinc-400 font-mono">
                  {saleToVoid.quantity} units • Revenue ₹{formatINR(saleToVoid.revenue)}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSaleToVoid(null)}
                  className="px-4 py-2 rounded-full text-xs font-semibold border border-white/10 hover:bg-white/5 text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleConfirmVoid}
                  className="px-5 py-2 rounded-full text-xs font-bold bg-[#F0506E] hover:bg-rose-600 text-white shadow-lg transition-all"
                >
                  {submitting ? 'Voiding...' : 'Confirm Void'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===================== MODAL: Clear Demo Data Confirm ===================== */}
      <AnimatePresence>
        {isClearDemoModalOpen && (
          <div
            onClick={() => setIsClearDemoModalOpen(false)}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#232323]/95 backdrop-blur-[24px] border border-white/10 rounded-[24px] w-full max-w-md p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Remove demo sales data?</h3>
                  <p className="text-xs text-[#9A9A9A]">
                    This will delete only records flagged as demo. Real transactions and inventory balances remain untouched.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-5">
                <button
                  type="button"
                  onClick={() => setIsClearDemoModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold border border-white/10 hover:bg-white/5 text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleConfirmClearDemo}
                  className="px-5 py-2 rounded-full text-xs font-bold bg-amber-400 hover:bg-amber-300 text-black shadow-lg transition-all"
                >
                  {submitting ? 'Removing...' : 'Remove Demo Data'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SalesPage;
