import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { ProductModel } from '../models/product.model.js';
import { InventoryLevelModel } from '../models/inventory-level.model.js';
import { StockMovementModel } from '../models/stock-movement.model.js';
import { SalesService } from '../services/sales.service.js';
import { ForecastService } from '../services/forecast.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SEED_FILE = path.resolve(__dirname, '../data/seed-data.json');

const getSeedData = () => {
  try {
    if (fs.existsSync(SEED_FILE)) {
      return JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
    }
  } catch (e) {}
  return { products: [], movements: [] };
};

export class AssistantController {
  /**
   * Helper to build inventory summary from MongoDB or fallback seed data
   */
  static async buildInventorySummary() {
    let lowStockItems: Array<{ name: string; sku: string; stock: number; minStock: number; category?: string }> = [];
    let outOfStockItems: Array<{ name: string; sku: string; minStock: number; category?: string }> = [];
    let topMovingProducts: Array<{ name: string; sku: string; quantity: number }> = [];
    let totalStockValue = 0;

    // 1. Try MongoDB if connected
    if (mongoose.connection.readyState === 1) {
      try {
        const levels = await InventoryLevelModel.find({})
          .populate('productId', 'name sku pricing unitCost category supplier')
          .lean();

        levels.forEach((l: any) => {
          const p = l.productId;
          if (!p) return;
          const stock = l.quantityOnHand ?? 0;
          const minStock = l.minSafetyStock ?? 10;
          const unitCost = p.pricing?.unitCost ?? p.unitCost ?? 100;
          totalStockValue += stock * unitCost;

          if (stock === 0) {
            outOfStockItems.push({
              name: p.name || 'Unknown Item',
              sku: p.sku || 'SKU-UNKNOWN',
              minStock,
              category: typeof p.category === 'string' ? p.category : 'General'
            });
          } else if (stock <= minStock) {
            lowStockItems.push({
              name: p.name || 'Unknown Item',
              sku: p.sku || 'SKU-UNKNOWN',
              stock,
              minStock,
              category: typeof p.category === 'string' ? p.category : 'General'
            });
          }
        });

        // Top 5 moving products from movements
        const movementAgg = await StockMovementModel.aggregate([
          {
            $group: {
              _id: '$sku',
              productName: { $first: '$productName' },
              totalQty: { $sum: '$quantity' }
            }
          },
          { $sort: { totalQty: -1 } },
          { $limit: 5 }
        ]);

        if (movementAgg && movementAgg.length > 0) {
          topMovingProducts = movementAgg.map((m: any) => ({
            name: m.productName || m._id,
            sku: m._id,
            quantity: m.totalQty
          }));
        }
      } catch (dbErr) {
        console.warn('MongoDB summary aggregation fallback to local seed data:', dbErr);
      }
    }

    // 2. Fallback to seed dataset if needed
    if (totalStockValue === 0 && (lowStockItems.length === 0 && outOfStockItems.length === 0)) {
      const seedData = getSeedData();
      (seedData.products || []).forEach((p: any) => {
        const stock = p.stock ?? 0;
        const minStock = p.minStock ?? 10;
        const cost = p.unitCost ?? 100;
        totalStockValue += stock * cost;

        if (stock === 0) {
          outOfStockItems.push({
            name: p.name,
            sku: p.sku,
            minStock,
            category: p.category
          });
        } else if (stock <= minStock) {
          lowStockItems.push({
            name: p.name,
            sku: p.sku,
            stock,
            minStock,
            category: p.category
          });
        }
      });

      // Group movements by SKU
      const movementMap = new Map<string, { name: string; sku: string; quantity: number }>();
      (seedData.movements || seedData.sales || []).forEach((m: any) => {
        const sku = m.sku || m.productName;
        if (!sku) return;
        const existing = movementMap.get(sku);
        const qty = m.quantity ?? 1;
        if (existing) {
          existing.quantity += qty;
        } else {
          movementMap.set(sku, {
            name: m.productName || sku,
            sku,
            quantity: qty
          });
        }
      });

      topMovingProducts = Array.from(movementMap.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
    }

    return {
      totalStockValue,
      lowStockItems,
      outOfStockItems,
      topMovingProducts
    };
  }

  /**
   * POST /api/assistant
   * Body: { message: string }
   * Returns: { reply: string }
   */
  static async askAssistant(req: Request, res: Response, next: NextFunction) {
    try {
      const { message } = req.body;

      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Step 1: Build inventory summary
      const summary = await AssistantController.buildInventorySummary();

      let salesSummary: any = null;
      try {
        salesSummary = await SalesService.getSalesSummary();
      } catch (e) {
        console.warn('Sales summary error in assistant:', e);
      }

      let forecastSummary: any = null;
      let nearestStockouts: any[] = [];
      try {
        const tenantId = (req as any).user?.tenantId;
        forecastSummary = await ForecastService.getSummary(tenantId);
        const allForecasts = await ForecastService.computeAllForecasts(tenantId);
        nearestStockouts = allForecasts
          .filter(f => f.stock > 0 && f.risk !== 'no_data' && f.risk !== 'no_demand' && (f.risk === 'critical' || f.risk === 'warning') && f.daysLeft !== null && f.daysLeft <= 90)
          .sort((a, b) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999))
          .slice(0, 5);
      } catch (e) {
        console.warn('Forecast summary error in assistant:', e);
      }

      const outOfStockStr = summary.outOfStockItems.length > 0
        ? summary.outOfStockItems.map((item) => `- ${item.name} (${item.sku}): 0 units (Min safety: ${item.minStock})`).join('\n')
        : 'None (all products have available units)';

      const lowStockStr = summary.lowStockItems.length > 0
        ? summary.lowStockItems.map((item) => `- ${item.name} (${item.sku}): ${item.stock} units left (Min safety: ${item.minStock})`).join('\n')
        : 'None (all products above safety threshold)';

      const topMovingStr = summary.topMovingProducts.length > 0
        ? summary.topMovingProducts.map((item, idx) => `${idx + 1}. ${item.name} (${item.sku}) - ${item.quantity.toLocaleString()} units moved`).join('\n')
        : 'No recorded stock movements';

      const revNum = salesSummary?.revenue ?? 0;
      const profitNum = salesSummary?.profit ?? 0;
      const marginNum = salesSummary?.marginPercent ?? 0;
      const topProfitableProducts = (salesSummary?.topProducts || []).slice(0, 3);
      const topProfitStr = topProfitableProducts.length > 0
        ? topProfitableProducts.map((p: any, idx: number) => `${idx + 1}. ${p.name} (${p.sku}): Profit ₹${p.profit.toLocaleString('en-IN')}, Revenue ₹${p.revenue.toLocaleString('en-IN')}, ${p.units} units sold`).join('\n')
        : 'No sales recorded yet this month';

      const forecastSummaryStr = forecastSummary
        ? `Critical risk: ${forecastSummary.counts.critical}, Warning risk: ${forecastSummary.counts.warning}, Out of stock: ${forecastSummary.counts.out}, Healthy: ${forecastSummary.counts.healthy}. At risk this week: ${forecastSummary.atRiskThisWeek}. Average cover: ${forecastSummary.averageDaysOfCover} days. Total suggested reorder cost: ₹${forecastSummary.totalSuggestedOrderCost.toLocaleString('en-IN')}.`
        : 'Forecast summary unavailable';

      const nearestStockoutsStr = nearestStockouts.length > 0
        ? nearestStockouts.map((item: any, idx: number) => `${idx + 1}. ${item.name} (${item.sku}): ${item.stock} in stock ~ ${item.daysLeft} days left (Estimated stockout: ${item.stockoutDate || 'N/A'}, Daily demand: ${item.dailyDemand}/day, Suggested order: ${item.suggestedOrderQty} units)`).join('\n')
        : 'None. All active inventory lines currently have safe stock buffers. No imminent stockout risks predicted in the next 90 days.';

      const summaryText = `
INVENTORY SUMMARY DATA:
- Total Warehouse Stock Valuation: ₹${summary.totalStockValue.toLocaleString('en-IN')}
- Out of Stock Items (0 units):
${outOfStockStr}

- Low Stock Items (Below safety threshold):
${lowStockStr}

- Top 5 Moving Products:
${topMovingStr}

THIS MONTH'S FINANCIALS:
- Revenue: ₹${revNum.toLocaleString('en-IN')}
- Profit: ₹${profitNum.toLocaleString('en-IN')}
- Margin: ${marginNum}%

TOP 3 PRODUCTS BY PROFIT:
${topProfitStr}

DEMAND FORECAST SUMMARY:
${forecastSummaryStr}

5 NEAREST PREDICTED STOCKOUTS:
${nearestStockoutsStr}
`.trim();

      const systemPrompt = `You are an intelligent inventory assistant for Inventra AI.
- Answer the user's specific question directly, concisely, and accurately using ONLY the provided real inventory, sales, and forecast data.
- REAL DATA ONLY: Never hallucinate numbers, make up dates, or predict false stockouts years in the future (e.g. beyond 90 days). If there are no immediate stockouts in the provided data (under "5 NEAREST PREDICTED STOCKOUTS"), clearly confirm that all products currently have healthy stock levels and no immediate stockouts are predicted.
- If a product has no recorded demand or insufficient sales history, clearly state that more sales transaction history is required to forecast stock depletion.
- CURRENCY REQUIREMENT: Always use the Indian Rupee symbol (₹) for all currency and monetary valuations. NEVER use dollar signs ($) or USD under any circumstances.
- TEXT FORMATTING REQUIREMENT: Do NOT use markdown asterisks (* or **) anywhere. Never use asterisks for bullet points or bold text. Use clean bullets (•) or dashes (-) for lists, and plain text without asterisks.
- Do NOT provide unprompted "Recommended Next Steps", "Remediation", or numbered action lists unless the user explicitly asks for recommendations, advice, next steps, or action suggestions.
- If the user asks a straightforward question (e.g. about stock levels, specific products, valuation, or greetings), provide a clear, direct answer without appending unsolicited advice.`;

      let reply = '';
      const apiKey = process.env.GEMINI_API_KEY;

      // Step 2 & 3: Send to Gemini if valid API key exists
      if (apiKey && apiKey.trim() && apiKey !== 'your_gemini_api_key_here') {
        const candidateModels = ['gemini-2.5-flash', 'gemini-3.8-flash'];
        const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
        for (const model of candidateModels) {
          try {
            const response = await ai.models.generateContent({
              model,
              contents: `Current Inventory & Forecast Data:\n${summaryText}\n\nUser Question:\n${message}`,
              config: {
                systemInstruction: systemPrompt
              }
            });

            if (response && response.text) {
              let sanitized = response.text.trim();
              // Ensure currency is always Indian Rupee (₹) and never dollars ($)
              sanitized = sanitized.replace(/\$/g, '₹');
              // Remove markdown bold asterisks **text**
              sanitized = sanitized.replace(/\*\*(.*?)\*\*/g, '$1');
              // Replace markdown list bullet * with clean bullet •
              sanitized = sanitized.replace(/^(\s*)\*\s+/gm, '$1• ');
              // Strip any remaining stray asterisks
              sanitized = sanitized.replace(/\*/g, '');
              reply = sanitized.trim();
              break;
            }
          } catch (geminiError: any) {
            console.warn(`Gemini (${model}) returned error:`, geminiError?.message || geminiError);
          }
        }
      }

      // Step 4: Handle fallback if API key is not configured or failed
      if (!reply) {
        const query = message.toLowerCase();
        const primaryOutOfStock = summary.outOfStockItems[0]?.name || 'depleted items';
        const primaryLowStock = summary.lowStockItems[0]?.name || 'low items';
        const primaryTopMoving = summary.topMovingProducts[0]?.name || 'fast moving items';
        const wantsRecommendations = query.includes('step') || query.includes('recommend') || query.includes('what should') || query.includes('action') || query.includes('advice');

        if (query.includes('run out') || query.includes('when will i run out') || query.includes('nearest stockout') || query.includes('stockout')) {
          if (nearestStockouts.length > 0) {
            reply = `Based on current sales velocity and lead times, here are the nearest predicted stockouts:
${nearestStockouts.map((p, i) => `• ${p.name} (${p.sku}): ${p.stock} units left (~${p.daysLeft} days until stockout, reorder recommendation: ${p.suggestedOrderQty} units)`).join('\n')}`;
          } else {
            reply = `No imminent stockouts predicted! All items have adequate stock cover based on current sales velocity.`;
          }
          if (wantsRecommendations) {
            reply += `\n\nRecommended Next Steps:
1. Review supplier lead times for upcoming replenishment.
2. Visit the Forecast page to inspect daily demand trends.
3. Check the Alerts tab for critical notifications.`;
          }
        } else if (query.includes('most profit') || query.includes('profit') || query.includes('profitable') || query.includes('margin')) {
          if (topProfitableProducts.length > 0) {
            reply = `Top products generating the highest profit this month:
${topProfitableProducts.map((p: any, i: number) => `• ${p.name} (${p.sku}): Profit ₹${p.profit.toLocaleString('en-IN')} (Revenue ₹${p.revenue.toLocaleString('en-IN')}, ${p.units} units sold)`).join('\n')}

This month's total revenue is ₹${revNum.toLocaleString('en-IN')} with profit of ₹${profitNum.toLocaleString('en-IN')} (${marginNum}% margin).`;
          } else {
            reply = `This month's total revenue is ₹${revNum.toLocaleString('en-IN')} with profit of ₹${profitNum.toLocaleString('en-IN')} (${marginNum}% margin). No individual sales records have been recorded yet this month.`;
          }
          if (wantsRecommendations) {
            reply += `\n\nRecommended Next Steps:
1. Promote highest-margin inventory to accelerate profit growth.
2. Check the Sales dashboard for weekly margin trends.
3. Optimize purchase costs with bulk vendor discounts.`;
          }
        } else if (query.includes('reorder') || query.includes('order')) {
          reply = `Current reorder priority list:
• Out of Stock (0 units): ${summary.outOfStockItems.map(i => `${i.name} (${i.sku})`).join(', ') || 'None'}
• Low Stock: ${summary.lowStockItems.map(i => `${i.name} (${i.sku} - ${i.stock} units left)`).join(', ') || 'None'}`;
          if (wantsRecommendations) {
            reply += `\n\nRecommended Next Steps:
1. Place immediate replenishment orders for 0-unit out-of-stock items (${primaryOutOfStock}).
2. Reorder buffer batches for items below safety thresholds (${primaryLowStock}).
3. Review supplier fulfillment lead times.`;
          }
        } else if (query.includes('low') || query.includes('alert') || query.includes('shortage')) {
          reply = `Current inventory status: ${summary.outOfStockItems.length} out-of-stock items and ${summary.lowStockItems.length} low-stock items below minimum safety thresholds. Total warehouse valuation is ₹${summary.totalStockValue.toLocaleString('en-IN')}.`;
          if (wantsRecommendations) {
            reply += `\n\nRecommended Next Steps:
1. Issue replenishment orders for ${summary.lowStockItems.length} low-stock SKUs.
2. Coordinate with suppliers for ${primaryOutOfStock}.
3. Schedule an automated stock audit for fast-moving inventory.`;
          }
        } else if (query.includes('drop') || query.includes('moving') || query.includes('velocity')) {
          reply = `Fastest-moving items by recorded outbound volume:
${summary.topMovingProducts.map((p, i) => `${i + 1}. ${p.name} (${p.quantity} units)`).join('\n')}`;
          if (wantsRecommendations) {
            reply += `\n\nRecommended Next Steps:
1. Increase minimum safety stock buffers on ${primaryTopMoving}.
2. Set automated restock triggers based on supplier lead times.
3. Audit dispatch logs to verify demand patterns.`;
          }
        } else {
          reply = `Current inventory overview:
• Total Stock Valuation: ₹${summary.totalStockValue.toLocaleString('en-IN')}
• Depleted Lines (0 units): ${summary.outOfStockItems.length}
• Low Stock Lines: ${summary.lowStockItems.length}
• Highest Velocity Line: ${primaryTopMoving}
• Month-to-date Revenue: ₹${revNum.toLocaleString('en-IN')} (Profit: ₹${profitNum.toLocaleString('en-IN')})`;
          if (wantsRecommendations) {
            reply += `\n\nRecommended Next Steps:
1. Restock depleted and critical threshold items.
2. Request updated vendor quotes for upcoming orders.
3. Review safety thresholds across flagged items.`;
          }
        }
      }

      return res.status(200).json({ reply });
    } catch (error: any) {
      console.error('Assistant error:', error);
      return res.status(200).json({
        reply: "I encountered a temporary service hiccup while analyzing your inventory. Here are 3 recommended next steps:\n1. Check the Alerts tab for current stock warnings.\n2. Verify product threshold parameters in the Inventory catalog.\n3. Try repeating your question."
      });
    }
  }
}
