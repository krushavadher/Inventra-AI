import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ProductModel } from '../models/product.model.js';
import { InventoryLevelModel } from '../models/inventory-level.model.js';
import { StockMovementModel, IStockMovement } from '../models/stock-movement.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SEED_FILE = path.resolve(__dirname, '../data/seed-data.json');

export interface RecordSaleParams {
  productId?: string;
  sku?: string;
  quantity: number;
  salePrice?: number;
  customer?: string;
  note?: string;
  date?: string | Date;
  adjustStock?: boolean;
  tenantId?: string;
  userId?: string;
  isDemo?: boolean;
}

export interface SalesFilterParams {
  from?: string;
  to?: string;
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
  includeVoided?: boolean;
  tenantId?: string;
}

export class SalesService {
  private static getLocalSeedData() {
    try {
      if (fs.existsSync(SEED_FILE)) {
        const raw = fs.readFileSync(SEED_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to read local seed data:', e);
    }
    return { products: [], movements: [] };
  }

  private static saveLocalSeedData(data: any) {
    try {
      fs.writeFileSync(SEED_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Failed to write local seed data:', e);
    }
  }

  private static isSameDay(d1: Date, d2: Date): boolean {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  /**
   * Shared recordSale() function used by every path.
   * Atomically verifies and deducts stock if adjustStock is true.
   */
  static async recordSale(params: RecordSaleParams) {
    const qty = Number(params.quantity);
    if (!qty || isNaN(qty) || qty <= 0) {
      const err: any = new Error('Quantity must be greater than 0');
      err.statusCode = 400;
      throw err;
    }

    const now = new Date();
    let effectiveDate = params.date ? new Date(params.date) : now;
    if (isNaN(effectiveDate.getTime())) {
      const err: any = new Error('Invalid sale date');
      err.statusCode = 400;
      throw err;
    }

    // Date can never be in the future (allowing 60s skew)
    if (effectiveDate.getTime() > now.getTime() + 60000) {
      const err: any = new Error('Effective date cannot be in the future');
      err.statusCode = 400;
      throw err;
    }

    // adjustStock defaults to true if date is today; for earlier dates defaults to false
    let adjustStock = params.adjustStock;
    if (adjustStock === undefined || adjustStock === null) {
      adjustStock = this.isSameDay(effectiveDate, now);
    } else {
      adjustStock = Boolean(adjustStock);
    }

    const isConnected = mongoose.connection.readyState === 1;

    // 1. Live MongoDB Operation
    if (isConnected) {
      let query: any = null;
      if (params.productId && mongoose.Types.ObjectId.isValid(params.productId)) {
        query = { _id: params.productId };
      } else if (params.sku) {
        query = { sku: params.sku.toUpperCase().trim() };
      } else if (params.productId) {
        query = { sku: params.productId.toUpperCase().trim() };
      }

      if (!query) {
        const err: any = new Error('Valid Product ID or SKU is required');
        err.statusCode = 400;
        throw err;
      }

      const product = await ProductModel.findOne(query).populate('categoryId', 'name').lean();
      if (!product) {
        const err: any = new Error('Product not found');
        err.statusCode = 404;
        throw err;
      }

      // Snapshot unitCost and calculate salePrice
      const unitCost = Number(product.pricing?.unitCost ?? (product as any).unitCost ?? 0);
      let salePrice =
        params.salePrice !== undefined && params.salePrice !== null
          ? Number(params.salePrice)
          : Number(product.pricing?.sellingPrice ?? (product as any).sellingPrice ?? 0);

      if (isNaN(salePrice) || salePrice < 0) {
        const err: any = new Error('Sale price must be greater than or equal to 0');
        err.statusCode = 400;
        throw err;
      }

      let balanceBefore = 0;
      let balanceAfter = 0;

      if (adjustStock) {
        // Atomic conditional decrement to guarantee stock cannot go negative
        const updatedLevel = await InventoryLevelModel.findOneAndUpdate(
          {
            productId: product._id,
            quantityOnHand: { $gte: qty }
          },
          {
            $inc: {
              quantityOnHand: -qty,
              quantityAvailable: -qty
            }
          },
          { new: true }
        );

        if (!updatedLevel) {
          const currentLevel = await InventoryLevelModel.findOne({ productId: product._id });
          const stock = currentLevel?.quantityOnHand ?? 0;
          const err: any = new Error(`Insufficient stock. Current stock is ${stock} units.`);
          err.statusCode = 400;
          throw err;
        }

        balanceAfter = updatedLevel.quantityOnHand;
        balanceBefore = balanceAfter + qty;
      } else {
        const currentLevel = await InventoryLevelModel.findOne({ productId: product._id });
        balanceBefore = currentLevel?.quantityOnHand ?? 0;
        balanceAfter = balanceBefore;
      }

      const tenantId = params.tenantId || product.tenantId || new mongoose.Types.ObjectId('65f123456789012345678901');
      const userId = params.userId || new mongoose.Types.ObjectId('65f987654321098765432109');

      const movement = await StockMovementModel.create({
        tenantId,
        productId: product._id,
        movementType: 'STOCK_OUT',
        quantity: qty,
        balanceBefore,
        balanceAfter,
        referenceDocType: 'SO',
        referenceDocId: `SALE-${Date.now().toString().slice(-6)}`,
        reason: 'sale',
        unitCost,
        salePrice,
        customer: params.customer ? params.customer.trim() : undefined,
        note: params.note ? params.note.trim() : undefined,
        date: effectiveDate,
        stockAdjusted: adjustStock,
        voided: false,
        isDemo: Boolean(params.isDemo),
        createdBy: userId,
        performedBy: userId
      });

      const revenue = Math.round(qty * salePrice * 100) / 100;
      const profit = Math.round(qty * (salePrice - unitCost) * 100) / 100;

      return {
        _id: movement._id,
        productId: product._id,
        productName: product.name,
        name: product.name,
        sku: product.sku,
        category: (product.categoryId as any)?.name || 'General',
        quantity: qty,
        unitCost,
        salePrice,
        revenue,
        profit,
        customer: movement.customer || '',
        note: movement.note || '',
        date: movement.date,
        stockAdjusted: movement.stockAdjusted,
        voided: movement.voided,
        isDemo: movement.isDemo,
        createdAt: movement.createdAt
      };
    }

    // 2. Offline Fallback using persistent seed-data.json
    const seedData = this.getLocalSeedData();
    const product = seedData.products.find(
      (p: any) =>
        p.sku === params.sku ||
        p._id === params.productId ||
        p.sku === params.productId ||
        p.name === params.productId
    );

    if (!product) {
      const err: any = new Error('Product not found');
      err.statusCode = 404;
      throw err;
    }

    const unitCost = Number(product.unitCost ?? product.pricing?.unitCost ?? 0);
    let salePrice = params.salePrice !== undefined && params.salePrice !== null ? Number(params.salePrice) : Number(product.sellingPrice ?? product.pricing?.sellingPrice ?? 0);

    if (isNaN(salePrice) || salePrice < 0) {
      const err: any = new Error('Sale price must be greater than or equal to 0');
      err.statusCode = 400;
      throw err;
    }

    const currentStock = Number(product.stock ?? 0);
    let balanceBefore = currentStock;
    let balanceAfter = currentStock;

    if (adjustStock) {
      if (currentStock < qty) {
        const err: any = new Error(`Insufficient stock. Current stock is ${currentStock} units.`);
        err.statusCode = 400;
        throw err;
      }
      product.stock = currentStock - qty;
      balanceAfter = product.stock;
    }

    const saleId = 'sale_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const saleRecord = {
      _id: saleId,
      productId: product._id || ('prod_' + product.sku),
      productName: product.name,
      name: product.name,
      sku: product.sku,
      category: product.category || 'General',
      movementType: 'STOCK_OUT',
      quantity: qty,
      balanceBefore,
      balanceAfter,
      referenceDocId: `SALE-${Date.now().toString().slice(-6)}`,
      reason: 'sale',
      unitCost,
      salePrice,
      revenue: Math.round(qty * salePrice * 100) / 100,
      profit: Math.round(qty * (salePrice - unitCost) * 100) / 100,
      customer: params.customer ? params.customer.trim() : '',
      note: params.note ? params.note.trim() : '',
      date: effectiveDate.toISOString(),
      stockAdjusted: adjustStock,
      voided: false,
      isDemo: Boolean(params.isDemo),
      createdAt: now.toISOString()
    };

    if (!seedData.sales) {
      seedData.sales = [];
    }
    seedData.sales.unshift(saleRecord);
    this.saveLocalSeedData(seedData);

    return saleRecord;
  }

  /**
   * Void a sale atomically
   */
  static async voidSale(saleId: string) {
    const isConnected = mongoose.connection.readyState === 1;

    if (isConnected) {
      if (!mongoose.Types.ObjectId.isValid(saleId)) {
        const err: any = new Error('Invalid sale ID');
        err.statusCode = 400;
        throw err;
      }

      const sale = await StockMovementModel.findById(saleId);
      if (!sale) {
        const err: any = new Error('Sale not found');
        err.statusCode = 404;
        throw err;
      }

      if (sale.voided) {
        const err: any = new Error('Sale is already voided');
        err.statusCode = 400;
        throw err;
      }

      // If stock was adjusted, add quantity back atomically
      if (sale.stockAdjusted) {
        await InventoryLevelModel.findOneAndUpdate(
          { productId: sale.productId },
          {
            $inc: {
              quantityOnHand: sale.quantity,
              quantityAvailable: sale.quantity
            }
          }
        );
      }

      sale.voided = true;
      sale.voidedAt = new Date();
      await sale.save();

      return {
        success: true,
        message: 'Sale voided successfully',
        saleId: sale._id,
        voided: true,
        voidedAt: sale.voidedAt,
        restocked: sale.stockAdjusted,
        restockedQuantity: sale.stockAdjusted ? sale.quantity : 0
      };
    }

    // Local seed fallback
    const seedData = this.getLocalSeedData();
    const sale = (seedData.sales || []).find((s: any) => s._id === saleId);
    if (!sale) {
      const err: any = new Error('Sale not found');
      err.statusCode = 404;
      throw err;
    }

    if (sale.voided) {
      const err: any = new Error('Sale is already voided');
      err.statusCode = 400;
      throw err;
    }

    if (sale.stockAdjusted) {
      const prod = seedData.products.find((p: any) => p.sku === sale.sku || p._id === sale.productId);
      if (prod) {
        prod.stock = (prod.stock || 0) + sale.quantity;
      }
    }

    sale.voided = true;
    sale.voidedAt = new Date().toISOString();
    this.saveLocalSeedData(seedData);

    return {
      success: true,
      message: 'Sale voided successfully',
      saleId: sale._id,
      voided: true,
      voidedAt: sale.voidedAt,
      restocked: sale.stockAdjusted,
      restockedQuantity: sale.stockAdjusted ? sale.quantity : 0
    };
  }

  /**
   * Get sales listing with query filters and pagination
   */
  static async getSales(params: SalesFilterParams) {
    const isConnected = mongoose.connection.readyState === 1;
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    if (isConnected) {
      const match: any = {
        reason: 'sale'
      };

      if (!params.includeVoided) {
        match.voided = { $ne: true };
      }

      // Date range filter
      if (params.from || params.to) {
        match.date = {};
        if (params.from) {
          match.date.$gte = new Date(params.from);
        }
        if (params.to) {
          const toDate = new Date(params.to);
          if (params.to.length <= 10) {
            toDate.setHours(23, 59, 59, 999);
          }
          match.date.$lte = toDate;
        }
      }

      const pipeline: any[] = [
        { $match: match },
        {
          $lookup: {
            from: 'products',
            localField: 'productId',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' },
        {
          $lookup: {
            from: 'categories',
            localField: 'product.categoryId',
            foreignField: '_id',
            as: 'category'
          }
        },
        {
          $unwind: {
            path: '$category',
            preserveNullAndEmptyArrays: true
          }
        }
      ];

      // Search filter across product name, sku, and customer
      if (params.search && params.search.trim()) {
        const regex = new RegExp(params.search.trim(), 'i');
        pipeline.push({
          $match: {
            $or: [
              { 'product.name': regex },
              { 'product.sku': regex },
              { customer: regex },
              { note: regex }
            ]
          }
        });
      }

      // Category filter
      if (params.category && params.category.trim()) {
        pipeline.push({
          $match: {
            'category.name': new RegExp(`^${params.category.trim()}$`, 'i')
          }
        });
      }

      // Count total matches
      const countPipeline = [...pipeline, { $count: 'total' }];
      const countResult = await StockMovementModel.aggregate(countPipeline);
      const total = countResult.length > 0 ? countResult[0].total : 0;

      // Sort, skip, limit
      pipeline.push(
        { $sort: { date: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit }
      );

      const rows = await StockMovementModel.aggregate(pipeline);

      const items = rows.map((r: any) => {
        const qty = r.quantity || 0;
        const uCost = r.unitCost ?? r.product?.pricing?.unitCost ?? 0;
        const sPrice = r.salePrice ?? r.product?.pricing?.sellingPrice ?? 0;
        const revenue = Math.round(qty * sPrice * 100) / 100;
        const profit = Math.round(qty * (sPrice - uCost) * 100) / 100;

        return {
          _id: r._id,
          productId: r.productId,
          productName: r.product?.name || 'Unknown Item',
          name: r.product?.name || 'Unknown Item',
          sku: r.product?.sku || '',
          category: r.category?.name || 'General',
          quantity: qty,
          unitCost: uCost,
          salePrice: sPrice,
          revenue,
          profit,
          customer: r.customer || '',
          note: r.note || '',
          date: r.date || r.createdAt,
          stockAdjusted: r.stockAdjusted ?? true,
          voided: r.voided ?? false,
          voidedAt: r.voidedAt,
          isDemo: r.isDemo ?? false,
          createdAt: r.createdAt
        };
      });

      return {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1
        }
      };
    }

    // Local fallback
    const seedData = this.getLocalSeedData();
    let sales = (seedData.sales || []).filter((s: any) => s.reason === 'sale');

    if (!params.includeVoided) {
      sales = sales.filter((s: any) => !s.voided);
    }

    if (params.from) {
      const fDate = new Date(params.from);
      sales = sales.filter((s: any) => new Date(s.date || s.createdAt) >= fDate);
    }
    if (params.to) {
      const tDate = new Date(params.to);
      if (params.to.length <= 10) tDate.setHours(23, 59, 59, 999);
      sales = sales.filter((s: any) => new Date(s.date || s.createdAt) <= tDate);
    }

    if (params.search && params.search.trim()) {
      const q = params.search.toLowerCase();
      sales = sales.filter(
        (s: any) =>
          (s.productName || '').toLowerCase().includes(q) ||
          (s.sku || '').toLowerCase().includes(q) ||
          (s.customer || '').toLowerCase().includes(q)
      );
    }

    if (params.category && params.category.trim()) {
      const c = params.category.toLowerCase();
      sales = sales.filter((s: any) => (s.category || '').toLowerCase() === c);
    }

    sales.sort((a: any, b: any) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
    const total = sales.length;
    const paginated = sales.slice(skip, skip + limit);

    return {
      items: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  /**
   * Summary calculations including previous-period comparisons,
   * monthly 6-month trends, top 5 products by profit, loss-making sales count,
   * and hasDemoData boolean flag.
   */
  static async getSalesSummary(fromStr?: string, toStr?: string) {
    const isConnected = mongoose.connection.readyState === 1;
    const now = new Date();

    // Default: current calendar month
    let fromDate: Date;
    let toDate: Date;

    if (fromStr) {
      fromDate = new Date(fromStr);
    } else {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    }

    if (toStr) {
      toDate = new Date(toStr);
      if (toStr.length <= 10) {
        toDate.setHours(23, 59, 59, 999);
      }
    } else {
      toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Previous period with identical duration
    const durationMs = toDate.getTime() - fromDate.getTime();
    const prevToDate = new Date(fromDate.getTime() - 1);
    const prevFromDate = new Date(prevToDate.getTime() - durationMs);

    let currentSales: any[] = [];
    let prevSales: any[] = [];
    let allSalesLast6Months: any[] = [];
    let hasDemoData = false;

    if (isConnected) {
      const demoRecord = await StockMovementModel.findOne({ reason: 'sale', isDemo: true }).select('_id').lean();
      hasDemoData = Boolean(demoRecord);

      // Current period sales (strictly non-voided)
      currentSales = await StockMovementModel.find({
        reason: 'sale',
        voided: { $ne: true },
        date: { $gte: fromDate, $lte: toDate }
      })
        .populate('productId', 'name sku pricing categoryId')
        .lean();

      // Previous period sales
      prevSales = await StockMovementModel.find({
        reason: 'sale',
        voided: { $ne: true },
        date: { $gte: prevFromDate, $lte: prevToDate }
      }).lean();

      // Last 6 months range
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);
      allSalesLast6Months = await StockMovementModel.find({
        reason: 'sale',
        voided: { $ne: true },
        date: { $gte: sixMonthsAgo }
      }).lean();
    } else {
      const seedData = this.getLocalSeedData();
      const allSales = (seedData.sales || []).filter((s: any) => s.reason === 'sale' && !s.voided);
      hasDemoData = (seedData.sales || []).some((s: any) => s.reason === 'sale' && s.isDemo);

      currentSales = allSales.filter((s: any) => {
        const d = new Date(s.date || s.createdAt);
        return d >= fromDate && d <= toDate;
      });

      prevSales = allSales.filter((s: any) => {
        const d = new Date(s.date || s.createdAt);
        return d >= prevFromDate && d <= prevToDate;
      });

      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);
      allSalesLast6Months = allSales.filter((s: any) => {
        const d = new Date(s.date || s.createdAt);
        return d >= sixMonthsAgo;
      });
    }

    // Period aggregations
    let revenue = 0;
    let costOfGoods = 0;
    let unitsSold = 0;
    let lossMakingCount = 0;
    const salesCount = currentSales.length;

    const productProfitMap = new Map<string, { name: string; sku: string; units: number; revenue: number; profit: number }>();

    for (const sale of currentSales) {
      const qty = sale.quantity || 0;
      const uCost = Number(sale.unitCost ?? sale.productId?.pricing?.unitCost ?? 0);
      const sPrice = Number(sale.salePrice ?? sale.productId?.pricing?.sellingPrice ?? 0);

      const rowRevenue = qty * sPrice;
      const rowCost = qty * uCost;
      const rowProfit = rowRevenue - rowCost;

      revenue += rowRevenue;
      costOfGoods += rowCost;
      unitsSold += qty;

      if (sPrice < uCost) {
        lossMakingCount++;
      }

      const prodKey = sale.productId?._id?.toString() || sale.productId?.toString() || sale.sku || 'UNKNOWN';
      const prodName = sale.productId?.name || sale.productName || sale.name || 'Product';
      const prodSku = sale.productId?.sku || sale.sku || 'SKU';

      const existing = productProfitMap.get(prodKey) || {
        name: prodName,
        sku: prodSku,
        units: 0,
        revenue: 0,
        profit: 0
      };

      existing.units += qty;
      existing.revenue += rowRevenue;
      existing.profit += rowProfit;
      productProfitMap.set(prodKey, existing);
    }

    revenue = Math.round(revenue * 100) / 100;
    costOfGoods = Math.round(costOfGoods * 100) / 100;
    const profit = Math.round((revenue - costOfGoods) * 100) / 100;
    const marginPercent = revenue > 0 ? Math.round(((profit / revenue) * 100) * 100) / 100 : 0;

    // Previous period metrics & change %
    let prevRevenue = 0;
    let prevCost = 0;
    for (const s of prevSales) {
      const q = s.quantity || 0;
      const c = Number(s.unitCost ?? 0);
      const p = Number(s.salePrice ?? 0);
      prevRevenue += q * p;
      prevCost += q * c;
    }
    prevRevenue = Math.round(prevRevenue * 100) / 100;
    const prevProfit = Math.round((prevRevenue - prevCost) * 100) / 100;

    const revenueChangePercent =
      prevRevenue > 0
        ? Math.round(((revenue - prevRevenue) / prevRevenue) * 10000) / 100
        : revenue > 0
        ? 100
        : 0;

    const profitChangePercent =
      prevProfit !== 0
        ? Math.round(((profit - prevProfit) / Math.abs(prevProfit)) * 10000) / 100
        : profit > 0
        ? 100
        : 0;

    // Monthly breakdown for last 6 months
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthly: { month: string; revenue: number; cost: number; profit: number; yearMonthKey: string }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ymKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      monthly.push({
        month: monthNames[d.getMonth()],
        revenue: 0,
        cost: 0,
        profit: 0,
        yearMonthKey: ymKey
      });
    }

    for (const s of allSalesLast6Months) {
      const sDate = new Date(s.date || s.createdAt);
      const ymKey = `${sDate.getFullYear()}-${(sDate.getMonth() + 1).toString().padStart(2, '0')}`;
      const bucket = monthly.find((b) => b.yearMonthKey === ymKey);
      if (bucket) {
        const q = s.quantity || 0;
        const uCost = Number(s.unitCost ?? 0);
        const sPrice = Number(s.salePrice ?? 0);
        const r = q * sPrice;
        const c = q * uCost;
        bucket.revenue += r;
        bucket.cost += c;
        bucket.profit += r - c;
      }
    }

    // Round monthly numbers
    monthly.forEach((m) => {
      m.revenue = Math.round(m.revenue * 100) / 100;
      m.cost = Math.round(m.cost * 100) / 100;
      m.profit = Math.round(m.profit * 100) / 100;
    });

    // Top 5 products by profit
    const topProducts = Array.from(productProfitMap.values())
      .map((p) => ({
        ...p,
        revenue: Math.round(p.revenue * 100) / 100,
        profit: Math.round(p.profit * 100) / 100
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);

    return {
      revenue,
      costOfGoods,
      profit,
      marginPercent,
      unitsSold,
      salesCount,
      previousPeriod: {
        revenue: prevRevenue,
        profit: prevProfit,
        revenueChangePercent,
        profitChangePercent
      },
      monthly,
      topProducts,
      lossMakingCount,
      hasDemoData
    };
  }

  /**
   * Import batch sales rows with validation (max 1000 rows)
   */
  static async importSales(rows: any[], adjustStockOverride?: boolean, tenantId?: string, userId?: string) {
    if (!Array.isArray(rows)) {
      const err: any = new Error('Invalid rows data: expected an array');
      err.statusCode = 400;
      throw err;
    }

    if (rows.length > 1000) {
      const err: any = new Error('Import rows exceed maximum limit of 1000');
      err.statusCode = 400;
      throw err;
    }

    let imported = 0;
    let skipped = 0;
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 1;
      const item = rows[i];

      if (!item || typeof item !== 'object') {
        errors.push({ row: rowNum, message: 'Invalid row format' });
        skipped++;
        continue;
      }

      const sku = item.sku ? String(item.sku).trim().toUpperCase() : '';
      if (!sku) {
        errors.push({ row: rowNum, message: 'Missing SKU' });
        skipped++;
        continue;
      }

      const qty = Number(item.quantity);
      if (isNaN(qty) || qty <= 0) {
        errors.push({ row: rowNum, message: 'Quantity must be a positive number' });
        skipped++;
        continue;
      }

      const salePrice = item.salePrice !== undefined && item.salePrice !== null ? Number(item.salePrice) : undefined;
      if (salePrice !== undefined && (isNaN(salePrice) || salePrice < 0)) {
        errors.push({ row: rowNum, message: 'Sale price must be >= 0' });
        skipped++;
        continue;
      }

      const dateStr = item.date;
      const d = dateStr ? new Date(dateStr) : new Date();
      if (isNaN(d.getTime())) {
        errors.push({ row: rowNum, message: 'Invalid date format' });
        skipped++;
        continue;
      }

      if (d.getTime() > Date.now() + 60000) {
        errors.push({ row: rowNum, message: 'Effective date cannot be in the future' });
        skipped++;
        continue;
      }

      try {
        await this.recordSale({
          sku,
          quantity: qty,
          salePrice,
          customer: item.customer,
          note: item.note,
          date: d,
          adjustStock: adjustStockOverride,
          tenantId,
          userId
        });
        imported++;
      } catch (err: any) {
        errors.push({ row: rowNum, message: err.message || 'Failed to record sale' });
        skipped++;
      }
    }

    return {
      imported,
      skipped,
      errors
    };
  }

  /**
   * Delete demo sales records (isDemo: true) and reverse nothing else
   */
  static async deleteDemoSales() {
    const isConnected = mongoose.connection.readyState === 1;
    let deletedCount = 0;

    if (isConnected) {
      const res = await StockMovementModel.deleteMany({ reason: 'sale', isDemo: true });
      deletedCount = res.deletedCount || 0;
    }

    const seedData = this.getLocalSeedData();
    if (seedData.sales) {
      const initial = seedData.sales.length;
      seedData.sales = seedData.sales.filter((s: any) => !(s.reason === 'sale' && s.isDemo));
      deletedCount += initial - seedData.sales.length;
      this.saveLocalSeedData(seedData);
    }

    return {
      success: true,
      deletedCount
    };
  }
}
