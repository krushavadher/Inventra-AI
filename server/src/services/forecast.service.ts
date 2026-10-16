import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { ProductModel } from '../models/product.model.js';
import { InventoryLevelModel } from '../models/inventory-level.model.js';
import { StockMovementModel } from '../models/stock-movement.model.js';
import { LOOKBACK_DAYS, SAFETY_DAYS, COVER_DAYS } from '../config/forecast.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SEED_FILE = path.resolve(__dirname, '../data/seed-data.json');

export type RiskLevel = 'no_data' | 'out' | 'critical' | 'warning' | 'no_demand' | 'healthy';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type TrendDirection = 'up' | 'down' | 'stable';

export interface ProductForecastMetrics {
  productId: string;
  id: string;
  _id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  leadTimeDays: number;
  unitCost: number;
  dailyDemand: number;
  trend: TrendDirection;
  trendPercent: number;
  daysLeft: number | null;
  stockoutDate: string | null;
  reorderPoint: number;
  suggestedOrderQty: number;
  suggestedOrderCost: number;
  risk: RiskLevel;
  confidence: ConfidenceLevel;
  windowDays: number;
  salesDays: number;
}

export interface ProductForecastWithSeries extends ProductForecastMetrics {
  series: {
    historical: { date: string; sales: number }[];
    projected: { date: string; projectedStock: number }[];
  };
}

export interface ForecastSummary {
  counts: {
    no_data: number;
    out: number;
    critical: number;
    warning: number;
    no_demand: number;
    healthy: number;
    total: number;
  };
  atRiskThisWeek: number;
  totalSuggestedOrderCost: number;
  averageDaysOfCover: number;
  nearestStockout: {
    productId: string;
    name: string;
    sku: string;
    daysLeft: number;
  } | null;
  deadStockValue: number;
}

// In-memory cache for AI insights: 10 minutes TTL
interface CacheEntry {
  insights: string;
  timestamp: number;
}
const insightsCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000;

// -------------------------------------------------------------
// PURE CALCULATION FUNCTIONS (EXPORTED FOR UNIT TESTING)
// -------------------------------------------------------------

/**
 * 2. Calculate dailyDemand:
 * 0.5 x avg(last 7d) + 0.3 x avg(days 8-30) + 0.2 x avg(days 31-60).
 * Uses only windows that fit within windowDays and renormalizes weights.
 * Round to 2 decimal places.
 *
 * @param dailySales60 Array of 60 daily sales numbers, index 0 = today, index 59 = 59 days ago.
 * @param windowDays Number of days product has existed, capped at 60.
 */
export function calculateDailyDemand(dailySales60: number[], windowDays: number): number {
  if (!dailySales60 || dailySales60.length === 0 || windowDays <= 0) return 0;
  const clampedWindow = Math.min(LOOKBACK_DAYS, Math.max(1, windowDays));

  // Window 1: days 1-7 (indices 0..6)
  const w1Len = Math.min(7, clampedWindow);
  const w1Sum = dailySales60.slice(0, w1Len).reduce((acc, v) => acc + (v || 0), 0);
  const avg1 = w1Sum / w1Len;

  let avg2 = 0;
  let avg3 = 0;

  // Check which windows fit
  const w1Fits = true; // Always fits as base window
  const w2Fits = clampedWindow >= 30;
  const w3Fits = clampedWindow >= 60;

  if (w2Fits) {
    const w2Sales = dailySales60.slice(7, 30);
    const w2Sum = w2Sales.reduce((acc, v) => acc + (v || 0), 0);
    avg2 = w2Sum / 23;
  }

  if (w3Fits) {
    const w3Sales = dailySales60.slice(30, 60);
    const w3Sum = w3Sales.reduce((acc, v) => acc + (v || 0), 0);
    avg3 = w3Sum / 30;
  }

  // Renormalize weights
  let totalWeight = 0.5;
  if (w2Fits) totalWeight += 0.3;
  if (w3Fits) totalWeight += 0.2;

  const w1Weight = 0.5 / totalWeight;
  const w2Weight = w2Fits ? 0.3 / totalWeight : 0;
  const w3Weight = w3Fits ? 0.2 / totalWeight : 0;

  const demand = (avg1 * w1Weight) + (avg2 * w2Weight) + (avg3 * w3Weight);
  return Math.round(demand * 100) / 100;
}

/**
 * 3. Calculate trend:
 * Compare average of last 14 days against previous 14 days.
 * "up" if +15% or more, "down" if -15% or less, otherwise "stable".
 * Returns trend and percent change.
 */
export function calculateTrend(dailySales60: number[]): { trend: TrendDirection; percentChange: number } {
  const last14 = dailySales60.slice(0, 14);
  const prev14 = dailySales60.slice(14, 28);

  const avgLast14 = last14.reduce((acc, v) => acc + (v || 0), 0) / 14;
  const avgPrev14 = prev14.reduce((acc, v) => acc + (v || 0), 0) / 14;

  let pctChange = 0;
  if (avgPrev14 === 0) {
    pctChange = avgLast14 > 0 ? 100 : 0;
  } else {
    pctChange = ((avgLast14 - avgPrev14) / avgPrev14) * 100;
  }

  pctChange = Math.round(pctChange * 10) / 10;

  let trend: TrendDirection = 'stable';
  if (pctChange >= 15) {
    trend = 'up';
  } else if (pctChange <= -15) {
    trend = 'down';
  }

  return { trend, percentChange: pctChange };
}

/**
 * 4. Calculate daysLeft & stockoutDate:
 * daysLeft = stock / dailyDemand (null if dailyDemand is 0).
 * stockoutDate = today + daysLeft.
 */
export function calculateDaysLeft(stock: number, dailyDemand: number, baseDate = new Date()): { daysLeft: number | null; stockoutDate: string | null } {
  if (dailyDemand <= 0) {
    return { daysLeft: null, stockoutDate: null };
  }
  const daysLeft = Math.round((Math.max(0, stock) / dailyDemand) * 10) / 10;
  const stockoutMs = baseDate.getTime() + (daysLeft * 24 * 60 * 60 * 1000);
  const stockoutDate = new Date(stockoutMs).toISOString().split('T')[0];
  return { daysLeft, stockoutDate };
}

/**
 * 5. Calculate reorder quantities and cost:
 * reorderPoint = ceil(dailyDemand x (leadTimeDays + SAFETY_DAYS))
 * suggestedOrderQty = max(0, ceil(dailyDemand x (leadTimeDays + SAFETY_DAYS + COVER_DAYS) - stock))
 * suggestedOrderCost = suggestedOrderQty x unitCost
 */
export function calculateReorder(
  stock: number,
  dailyDemand: number,
  leadTimeDays: number,
  unitCost: number,
  safetyDays = SAFETY_DAYS,
  coverDays = COVER_DAYS
): { reorderPoint: number; suggestedOrderQty: number; suggestedOrderCost: number } {
  const safeStock = Math.max(0, stock);
  const safeCost = Math.max(0, unitCost);
  const safeLead = Math.max(0, leadTimeDays);

  const reorderPoint = Math.ceil(dailyDemand * (safeLead + safetyDays));
  const suggestedOrderQty = Math.max(0, Math.ceil(dailyDemand * (safeLead + safetyDays + coverDays) - safeStock));
  const suggestedOrderCost = Math.round(suggestedOrderQty * safeCost * 100) / 100;

  return {
    reorderPoint,
    suggestedOrderQty,
    suggestedOrderCost
  };
}

/**
 * 6. Calculate risk level:
 * - "no_data" if fewer than 3 sales days or less than 7 days of history
 * - "out" if stock is 0 and demand > 0
 * - "critical" if daysLeft <= leadTimeDays
 * - "warning" if daysLeft <= leadTimeDays + SAFETY_DAYS + 7
 * - "no_demand" if stock > 0 and demand is 0 (dead stock)
 * - otherwise "healthy"
 */
export function calculateRisk(
  stock: number,
  dailyDemand: number,
  daysLeft: number | null,
  leadTimeDays: number,
  salesDays: number,
  windowDays: number,
  safetyDays = SAFETY_DAYS
): RiskLevel {
  if (salesDays < 3 || windowDays < 7) {
    return 'no_data';
  }
  if (stock <= 0 && dailyDemand > 0) {
    return 'out';
  }
  if (daysLeft !== null && daysLeft <= leadTimeDays) {
    return 'critical';
  }
  if (daysLeft !== null && daysLeft <= (leadTimeDays + safetyDays + 7)) {
    return 'warning';
  }
  if (stock > 0 && dailyDemand === 0) {
    return 'no_demand';
  }
  return 'healthy';
}

/**
 * 7. Calculate confidence level:
 * - "high" with 15 or more sales days and low variation (CV < 1.0)
 * - "medium" with 7-14 sales days
 * - otherwise "low"
 */
export function calculateConfidence(salesDays: number, dailySales60: number[]): ConfidenceLevel {
  if (salesDays >= 15) {
    const positiveDays = dailySales60.filter(qty => qty > 0);
    if (positiveDays.length > 0) {
      const mean = positiveDays.reduce((a, b) => a + b, 0) / positiveDays.length;
      const variance = positiveDays.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / positiveDays.length;
      const stdDev = Math.sqrt(variance);
      const cv = mean > 0 ? stdDev / mean : 0;
      if (cv < 1.0) {
        return 'high';
      }
    }
    return 'medium';
  }
  if (salesDays >= 7) {
    return 'medium';
  }
  return 'low';
}

/**
 * 8. Generate series for one product:
 * Last 30 days of actual daily sales, and 30 day projection of stock level.
 */
export function generateSeries(stock: number, dailyDemand: number, dailySales60: number[], baseDate = new Date()) {
  const historical: { date: string; sales: number }[] = [];
  const projected: { date: string; projectedStock: number }[] = [];

  // Historical: 29 days ago up to today (30 points)
  for (let i = 29; i >= 0; i--) {
    const d = new Date(baseDate.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    const sales = dailySales60[i] || 0;
    historical.push({ date: dateStr, sales });
  }

  // Projected: tomorrow to day 30 (30 points)
  let currentStock = Math.max(0, stock);
  for (let i = 1; i <= 30; i++) {
    const d = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split('T')[0];
    const projectedStock = Math.max(0, Math.round(currentStock - (i * dailyDemand)));
    projected.push({ date: dateStr, projectedStock });
  }

  return { historical, projected };
}

// -------------------------------------------------------------
// SERVICE CLASS
// -------------------------------------------------------------

export class ForecastService {
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

  /**
   * Fetch active products with current stock and leadTimeDays.
   */
  private static async getActiveProducts(tenantId?: string): Promise<any[]> {
    let items: any[] = [];

    if (mongoose.connection.readyState === 1) {
      try {
        const query: any = { isDeleted: { $ne: true }, status: { $ne: 'DISCONTINUED' } };
        if (tenantId) query.tenantId = tenantId;

        const dbProducts = await ProductModel.find(query)
          .populate('categoryId', 'name')
          .lean();

        if (dbProducts && dbProducts.length > 0) {
          const levels = await InventoryLevelModel.find({}).lean();
          const levelsMap = new Map<string, any>();
          levels.forEach((l: any) => levelsMap.set(l.productId?.toString(), l));

          items = dbProducts.map((p: any) => {
            const l = levelsMap.get(p._id.toString());
            const stock = l ? (l.quantityAvailable ?? l.quantityOnHand ?? 0) : (p.stock || 0);
            const catName = typeof p.categoryId === 'object' && p.categoryId?.name ? p.categoryId.name : (p.category || 'General');

            return {
              _id: p._id.toString(),
              id: p._id.toString(),
              name: p.name,
              sku: p.sku,
              category: catName,
              stock: Math.max(0, Number(stock) || 0),
              leadTimeDays: Number(p.leadTimeDays ?? 7),
              unitCost: Number(p.pricing?.unitCost ?? p.unitCost ?? 0),
              createdAt: p.createdAt ? new Date(p.createdAt) : new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
            };
          });
        }
      } catch (err) {
        console.warn('MongoDB getActiveProducts fallback:', err);
      }
    }

    if (items.length === 0) {
      const seedData = this.getLocalSeedData();
      items = (seedData.products || []).map((p: any, idx: number) => ({
        _id: p._id || p.sku || `prod_${idx + 1}`,
        id: p._id || p.sku || `prod_${idx + 1}`,
        name: p.name,
        sku: p.sku,
        category: p.category || 'General',
        stock: Math.max(0, Number(p.stock) || 0),
        leadTimeDays: Number(p.leadTimeDays ?? 7),
        unitCost: Number(p.unitCost ?? 0),
        createdAt: p.createdAt ? new Date(p.createdAt) : new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
      }));
    }

    return items;
  }

  /**
   * Fetch non-voided sales movements for the last 60 days.
   */
  private static async getValidSalesMovements(tenantId?: string): Promise<any[]> {
    const cutoff = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    cutoff.setHours(0, 0, 0, 0);

    let sales: any[] = [];

    if (mongoose.connection.readyState === 1) {
      try {
        const query: any = {
          reason: 'sale',
          voided: { $ne: true },
          date: { $gte: cutoff }
        };
        if (tenantId) query.tenantId = tenantId;

        sales = await StockMovementModel.find(query).lean();
      } catch (err) {
        console.warn('MongoDB getValidSalesMovements fallback:', err);
      }
    }

    if (sales.length === 0) {
      const seedData = this.getLocalSeedData();
      const allMovements = seedData.movements || seedData.sales || [];
      sales = allMovements.filter((m: any) => {
        if (m.reason !== 'sale' || m.voided) return false;
        const d = new Date(m.date || m.createdAt);
        return d >= cutoff;
      });
    }

    return sales;
  }

  /**
   * Build 60-day zero-filled daily sales array for a product.
   * Index 0 = today, Index 59 = 59 days ago.
   */
  private static buildDailySalesSeries(
    product: any,
    movements: any[],
    baseDate = new Date()
  ): { dailySales60: number[]; salesDays: number; windowDays: number } {
    const today = new Date(baseDate);
    today.setHours(0, 0, 0, 0);

    const pId = product._id?.toString() || product.id?.toString();
    const pSku = (product.sku || '').toUpperCase();

    // Map movements to day offsets (0 = today, 1 = yesterday, ..., 59 = 59 days ago)
    const dailySales60 = new Array<number>(LOOKBACK_DAYS).fill(0);

    movements.forEach((m: any) => {
      const matchId = m.productId?.toString() === pId || m.product?.toString() === pId;
      const matchSku = m.sku && m.sku.toUpperCase() === pSku;
      if (!matchId && !matchSku) return;

      const mDate = new Date(m.date || m.createdAt);
      mDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((today.getTime() - mDate.getTime()) / (24 * 60 * 60 * 1000));
      if (diffDays >= 0 && diffDays < LOOKBACK_DAYS) {
        dailySales60[diffDays] += Number(m.quantity) || 0;
      }
    });

    const salesDays = dailySales60.filter(q => q > 0).length;

    // Window days: product existence duration capped at 60
    const createdDate = product.createdAt ? new Date(product.createdAt) : new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
    const daysSinceCreation = Math.max(1, Math.ceil((today.getTime() - createdDate.getTime()) / (24 * 60 * 60 * 1000)));
    const windowDays = Math.min(LOOKBACK_DAYS, daysSinceCreation);

    return { dailySales60, salesDays, windowDays };
  }

  /**
   * Compute full metrics for all active products.
   */
  public static async computeAllForecasts(tenantId?: string): Promise<ProductForecastMetrics[]> {
    const products = await this.getActiveProducts(tenantId);
    const movements = await this.getValidSalesMovements(tenantId);
    const now = new Date();

    const results: ProductForecastMetrics[] = products.map((prod) => {
      const { dailySales60, salesDays, windowDays } = this.buildDailySalesSeries(prod, movements, now);

      const dailyDemand = calculateDailyDemand(dailySales60, windowDays);
      const { trend, percentChange: trendPercent } = calculateTrend(dailySales60);
      const { daysLeft, stockoutDate } = calculateDaysLeft(prod.stock, dailyDemand, now);
      const { reorderPoint, suggestedOrderQty, suggestedOrderCost } = calculateReorder(
        prod.stock,
        dailyDemand,
        prod.leadTimeDays,
        prod.unitCost
      );
      const risk = calculateRisk(
        prod.stock,
        dailyDemand,
        daysLeft,
        prod.leadTimeDays,
        salesDays,
        windowDays
      );
      const confidence = calculateConfidence(salesDays, dailySales60);

      return {
        productId: prod._id,
        id: prod.id || prod._id,
        _id: prod._id,
        name: prod.name,
        sku: prod.sku,
        category: prod.category,
        stock: prod.stock,
        leadTimeDays: prod.leadTimeDays,
        unitCost: prod.unitCost,
        dailyDemand,
        trend,
        trendPercent,
        daysLeft,
        stockoutDate,
        reorderPoint,
        suggestedOrderQty,
        suggestedOrderCost,
        risk,
        confidence,
        windowDays,
        salesDays
      };
    });

    return results;
  }

  /**
   * GET /api/forecast endpoint handler logic
   */
  public static async getForecasts(
    tenantId?: string,
    filters?: { risk?: string; search?: string; category?: string; sort?: string }
  ): Promise<ProductForecastMetrics[]> {
    let items = await this.computeAllForecasts(tenantId);

    // Filter by risk
    if (filters?.risk) {
      const r = filters.risk.toLowerCase();
      items = items.filter(i => i.risk === r);
    }

    // Filter by category
    if (filters?.category && filters.category !== 'all') {
      const c = filters.category.toLowerCase();
      items = items.filter(i => (i.category || '').toLowerCase() === c);
    }

    // Search by name or SKU
    if (filters?.search) {
      const s = filters.search.toLowerCase().trim();
      items = items.filter(i =>
        i.name.toLowerCase().includes(s) || i.sku.toLowerCase().includes(s)
      );
    }

    // Sort: default daysLeft (ascending, nulls last)
    const sortField = filters?.sort || 'daysLeft';
    items.sort((a, b) => {
      if (sortField === 'demand') {
        return b.dailyDemand - a.dailyDemand;
      }
      if (sortField === 'suggestedOrderCost') {
        return b.suggestedOrderCost - a.suggestedOrderCost;
      }
      // default: daysLeft
      if (a.daysLeft === null && b.daysLeft === null) return 0;
      if (a.daysLeft === null) return 1;
      if (b.daysLeft === null) return -1;
      return a.daysLeft - b.daysLeft;
    });

    return items;
  }

  /**
   * GET /api/forecast/summary endpoint handler logic
   */
  public static async getSummary(tenantId?: string): Promise<ForecastSummary> {
    const items = await this.computeAllForecasts(tenantId);

    const counts = {
      no_data: 0,
      out: 0,
      critical: 0,
      warning: 0,
      no_demand: 0,
      healthy: 0,
      total: items.length
    };

    let atRiskThisWeek = 0;
    let totalSuggestedOrderCost = 0;
    let coverDaysSum = 0;
    let coverDaysCount = 0;
    let deadStockValue = 0;
    let nearestStockout: { productId: string; name: string; sku: string; daysLeft: number } | null = null;

    items.forEach((item) => {
      // Risk counts
      if (counts[item.risk] !== undefined) {
        counts[item.risk]++;
      }

      // At risk this week
      if (item.risk === 'out' || (item.daysLeft !== null && item.daysLeft <= 7)) {
        atRiskThisWeek++;
      }

      // Total suggested order cost
      totalSuggestedOrderCost += item.suggestedOrderCost;

      // Cover days calculation (only for products with sufficient forecast data)
      if (item.risk !== 'no_data' && item.daysLeft !== null && item.dailyDemand > 0) {
        coverDaysSum += item.daysLeft;
        coverDaysCount++;
      }

      // Nearest stockout (at critical or warning risk within 90-day horizon)
      if (
        item.stock > 0 &&
        (item.risk === 'critical' || item.risk === 'warning') &&
        item.daysLeft !== null &&
        item.daysLeft > 0 &&
        item.daysLeft <= 90
      ) {
        if (!nearestStockout || item.daysLeft < nearestStockout.daysLeft) {
          nearestStockout = {
            productId: item.productId,
            name: item.name,
            sku: item.sku,
            daysLeft: item.daysLeft
          };
        }
      }

      // Dead stock value
      if (item.risk === 'no_demand') {
        deadStockValue += item.stock * item.unitCost;
      }
    });

    const averageDaysOfCover = coverDaysCount > 0
      ? Math.round((coverDaysSum / coverDaysCount) * 10) / 10
      : 0;

    return {
      counts,
      atRiskThisWeek,
      totalSuggestedOrderCost: Math.round(totalSuggestedOrderCost * 100) / 100,
      averageDaysOfCover,
      nearestStockout,
      deadStockValue: Math.round(deadStockValue * 100) / 100
    };
  }

  /**
   * GET /api/forecast/:productId endpoint handler logic
   */
  public static async getProductForecast(tenantId?: string, productId?: string): Promise<ProductForecastWithSeries | null> {
    if (!productId) return null;
    const items = await this.computeAllForecasts(tenantId);
    const item = items.find(i => i.productId === productId || i.id === productId || i.sku === productId);
    if (!item) return null;

    const products = await this.getActiveProducts(tenantId);
    const movements = await this.getValidSalesMovements(tenantId);
    const fullProd = products.find(p => p._id === item.productId || p.sku === item.sku) || item;

    const now = new Date();
    const { dailySales60 } = this.buildDailySalesSeries(fullProd, movements, now);
    const series = generateSeries(item.stock, item.dailyDemand, dailySales60, now);

    return {
      ...item,
      series
    };
  }

  /**
   * POST /api/forecast/insights
   * Sends computed summary + top 8 at-risk products to Gemini integration.
   * Cached for 10 minutes per user and data signature.
   */
  public static async generateInsights(tenantId?: string, userId = 'anonymous'): Promise<{ insights: string }> {
    const summary = await this.getSummary(tenantId);
    const allForecasts = await this.computeAllForecasts(tenantId);

    // Top 8 at-risk products: sorted by risk priority (out, critical, warning) then lowest daysLeft
    const riskPriority: Record<RiskLevel, number> = {
      out: 1,
      critical: 2,
      warning: 3,
      no_demand: 4,
      healthy: 5,
      no_data: 6
    };

    const atRiskProducts = allForecasts
      .filter(p => p.risk === 'out' || p.risk === 'critical' || p.risk === 'warning' || p.risk === 'no_demand')
      .sort((a, b) => {
        const pDiff = (riskPriority[a.risk] || 99) - (riskPriority[b.risk] || 99);
        if (pDiff !== 0) return pDiff;
        if (a.daysLeft === null && b.daysLeft === null) return 0;
        if (a.daysLeft === null) return 1;
        if (b.daysLeft === null) return -1;
        return a.daysLeft - b.daysLeft;
      })
      .slice(0, 8);

    // Create deterministic data signature for caching
    const payloadForSignature = {
      summary,
      top8: atRiskProducts.map(p => ({
        sku: p.sku,
        stock: p.stock,
        demand: p.dailyDemand,
        daysLeft: p.daysLeft,
        risk: p.risk,
        suggestedQty: p.suggestedOrderQty
      }))
    };

    const dataSignature = crypto
      .createHash('md5')
      .update(JSON.stringify(payloadForSignature))
      .digest('hex');

    const cacheKey = `user_${userId}_sig_${dataSignature}`;
    const cached = insightsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return { insights: cached.insights };
    }

    // System prompt requirement:
    // "You are an inventory analyst. Use only the numbers provided. Do not invent numbers.
    //  Write 4 short bullet insights and 3 numbered recommended actions. If data is limited, say so."
    const systemPrompt = `You are an inventory analyst for Inventra AI. Use only the numbers provided. Do not invent numbers. Write 4 short bullet insights and 3 numbered recommended actions. If data is limited, say so.
TEXT FORMATTING REQUIREMENT: Do NOT use markdown asterisks (* or **) anywhere in your output. Never use asterisks for bold text or for bullet points. Use clean bullets (•) or dashes (-) for lists, and plain text without asterisks. Always use the Indian Rupee symbol (₹) for currency.`;

    const summaryText = `
FORECAST SUMMARY:
- Total Products: ${summary.counts.total}
- Stockout (Out): ${summary.counts.out}
- Critical Risk: ${summary.counts.critical}
- Warning Risk: ${summary.counts.warning}
- Healthy: ${summary.counts.healthy}
- Dead Stock (No Demand): ${summary.counts.no_demand}
- Insufficient Data (No Data): ${summary.counts.no_data}
- At Risk This Week: ${summary.atRiskThisWeek}
- Total Suggested Order Cost: ₹${summary.totalSuggestedOrderCost.toLocaleString('en-IN')}
- Average Days of Cover: ${summary.averageDaysOfCover} days
- Dead Stock Value: ₹${summary.deadStockValue.toLocaleString('en-IN')}
- Nearest Stockout: ${summary.nearestStockout ? `${summary.nearestStockout.name} (${summary.nearestStockout.sku}) in ${summary.nearestStockout.daysLeft} days` : 'None'}

TOP AT-RISK PRODUCTS:
${atRiskProducts.length === 0 ? 'None identified.' : atRiskProducts.map((p, idx) =>
  `${idx + 1}. ${p.name} (SKU: ${p.sku}) | Stock: ${p.stock} | Daily Demand: ${p.dailyDemand} | Days Left: ${p.daysLeft ?? 'N/A'} | Risk: ${p.risk} | Suggested Reorder Qty: ${p.suggestedOrderQty} | Cost: ₹${p.suggestedOrderCost.toLocaleString('en-IN')}`
).join('\n')}
`.trim();

    let insights = '';
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && apiKey.trim() && apiKey !== 'your_gemini_api_key_here') {
      const candidateModels = ['gemini-2.5-flash', 'gemini-3.8-flash'];
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
      for (const model of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: `Computed Inventory Forecast Data:\n${summaryText}`,
            config: {
              systemInstruction: systemPrompt
            }
          });

          if (response && response.text) {
            let sanitized = response.text.trim();
            sanitized = sanitized.replace(/\$/g, '₹');
            sanitized = sanitized.replace(/\*\*(.*?)\*\*/g, '$1');
            sanitized = sanitized.replace(/^(\s*)\*\s+/gm, '$1• ');
            sanitized = sanitized.replace(/\*/g, '');
            insights = sanitized.trim();
            break;
          }
        } catch (geminiError: any) {
          console.warn(`Gemini (${model}) forecast insights error:`, geminiError?.message || geminiError);
        }
      }
    }

    // Friendly, exact rule-based fallback if Gemini is unavailable
    if (!insights) {
      const topCritical = atRiskProducts[0];
      const hasFewData = summary.counts.no_data > summary.counts.total * 0.5;

      insights = `
Insights:
• ${summary.atRiskThisWeek} product(s) are at risk of stockout within 7 days, requiring immediate procurement attention.
• Total suggested replenishment expenditure across all flagged items is ₹${summary.totalSuggestedOrderCost.toLocaleString('en-IN')}.
• Dead stock currently ties up ₹${summary.deadStockValue.toLocaleString('en-IN')} across ${summary.counts.no_demand} SKU(s) with zero sales velocity.
• Average inventory cover stands at ${summary.averageDaysOfCover} days across active lines.${hasFewData ? ' Note: Sales history is limited for a portion of the catalog.' : ''}

Recommended Actions:
1. Issue emergency purchase orders for ${topCritical ? `${topCritical.name} (${topCritical.sku})` : 'depleted SKUs'} to prevent stockouts.
2. Initiate liquidation or promotional bundling for dead stock lines valued at ₹${summary.deadStockValue.toLocaleString('en-IN')}.
3. Re-evaluate supplier lead times for warning-level products to safeguard the ${summary.averageDaysOfCover}-day cover threshold.
`.trim();
    }

    // Cache the result for 10 minutes
    insightsCache.set(cacheKey, {
      insights,
      timestamp: Date.now()
    });

    return { insights };
  }
}
