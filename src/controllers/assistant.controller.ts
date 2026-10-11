import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { ProductModel } from '../models/product.model.js';
import { InventoryLevelModel } from '../models/inventory-level.model.js';
import { StockMovementModel } from '../models/stock-movement.model.js';

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
      (seedData.movements || []).forEach((m: any) => {
        const sku = m.sku || m.productName;
        const existing = movementMap.get(sku);
        const qty = m.quantity ?? 10;
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

      if (topMovingProducts.length === 0 && seedData.products?.length > 0) {
        topMovingProducts = seedData.products.slice(0, 5).map((p: any) => ({
          name: p.name,
          sku: p.sku,
          quantity: 250
        }));
      }
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

      const outOfStockStr = summary.outOfStockItems.length > 0
        ? summary.outOfStockItems.map((item) => `- ${item.name} (${item.sku}): 0 units (Min safety: ${item.minStock})`).join('\n')
        : 'None (all products have available units)';

      const lowStockStr = summary.lowStockItems.length > 0
        ? summary.lowStockItems.map((item) => `- ${item.name} (${item.sku}): ${item.stock} units left (Min safety: ${item.minStock})`).join('\n')
        : 'None (all products above safety threshold)';

      const topMovingStr = summary.topMovingProducts.length > 0
        ? summary.topMovingProducts.map((item, idx) => `${idx + 1}. ${item.name} (${item.sku}) - ${item.quantity.toLocaleString()} units moved`).join('\n')
        : 'No recorded stock movements';

      const summaryText = `
INVENTORY SUMMARY DATA:
- Total Warehouse Stock Valuation: ₹${summary.totalStockValue.toLocaleString('en-IN')}
- Out of Stock Items (0 units):
${outOfStockStr}

- Low Stock Items (Below safety threshold):
${lowStockStr}

- Top 5 Moving Products:
${topMovingStr}
`.trim();

      const systemPrompt = "You are an inventory assistant for Inventra AI. Use only the data provided. Answer briefly. End with 3 numbered recommended next steps.";

      let reply = '';
      const apiKey = process.env.GEMINI_API_KEY;

      // Step 2 & 3: Send to Gemini if valid API key exists
      if (apiKey && apiKey.trim() && apiKey !== 'your_gemini_api_key_here') {
        try {
          const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Current Inventory Data:\n${summaryText}\n\nUser Question:\n${message}`,
            config: {
              systemInstruction: systemPrompt
            }
          });

          if (response && response.text) {
            reply = response.text.trim();
          }
        } catch (geminiError: any) {
          console.warn('Gemini API call returned error, using fallback responder:', geminiError?.message || geminiError);
        }
      }

      // Step 4: Handle fallback if API key is not configured or failed
      if (!reply) {
        const query = message.toLowerCase();
        const primaryOutOfStock = summary.outOfStockItems[0]?.name || 'depleted items';
        const primaryLowStock = summary.lowStockItems[0]?.name || 'low items';
        const primaryTopMoving = summary.topMovingProducts[0]?.name || 'fast moving items';

        if (query.includes('reorder') || query.includes('order')) {
          reply = `Based on current inventory data, the highest priority reorders are:
• Out of Stock: ${summary.outOfStockItems.map(i => `${i.name} (${i.sku})`).join(', ') || 'None'}
• Low Stock: ${summary.lowStockItems.map(i => `${i.name} (${i.sku} - ${i.stock} left)`).join(', ') || 'None'}

Recommended Next Steps:
1. Immediately place emergency purchase orders for all 0-unit out-of-stock products (${primaryOutOfStock}).
2. Reorder safety stock batches for items under buffer thresholds (${primaryLowStock}).
3. Review supplier fulfillment lead times to prevent future stockouts.`;
        } else if (query.includes('low') || query.includes('alert') || query.includes('shortage')) {
          reply = `Current inventory highlights ${summary.outOfStockItems.length} out-of-stock items and ${summary.lowStockItems.length} low-stock items below their minimum safety limits.
Total warehouse inventory valuation is ₹${summary.totalStockValue.toLocaleString('en-IN')}.

Recommended Next Steps:
1. Issue replenishment orders for the ${summary.lowStockItems.length} low-stock SKUs.
2. Coordinate with suppliers for ${primaryOutOfStock} to restore safety levels.
3. Schedule an automated stock audit for fastest-moving inventory.`;
        } else if (query.includes('drop') || query.includes('moving') || query.includes('velocity')) {
          reply = `Stock velocity is concentrated in your top moving products:
${summary.topMovingProducts.map((p, i) => `${i + 1}. ${p.name} (${p.quantity} units)`).join('\n')}
High outbound consumption in these lines accounts for the rapid stock depletion.

Recommended Next Steps:
1. Increase minimum safety stock buffers on ${primaryTopMoving}.
2. Set up automated restock triggers at 1.5x supplier lead time.
3. Audit dispatch logs to verify seasonal demand spikes.`;
        } else {
          reply = `Here is your current inventory operational summary:
• Total Stock Valuation: ₹${summary.totalStockValue.toLocaleString('en-IN')}
• Depleted Lines (0 stock): ${summary.outOfStockItems.length} items
• Low Stock Lines: ${summary.lowStockItems.length} items
• Top Velocity Line: ${primaryTopMoving}

Recommended Next Steps:
1. Restock depleted and critical threshold items immediately.
2. Confirm active supplier quotes for upcoming purchase cycles.
3. Review safety stock parameters across all ${summary.lowStockItems.length} flagged products.`;
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
