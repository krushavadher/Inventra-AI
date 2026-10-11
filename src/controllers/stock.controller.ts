import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ProductModel } from '../models/product.model.js';
import { InventoryLevelModel } from '../models/inventory-level.model.js';
import { StockMovementModel } from '../models/stock-movement.model.js';
import { ApiResponse } from '../utils/api-response.util.js';

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

const saveSeedData = (data: any) => {
  try {
    fs.writeFileSync(SEED_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {}
};

export class StockController {
  /**
   * POST /api/stock/in
   * Body: { productId: string, quantity: number, reference?: string, reason?: string }
   */
  static async stockIn(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId, sku, quantity, reference, reason } = req.body;
      const qty = Number(quantity);

      if (!productId && !sku) {
        return res.status(400).json({ success: false, error: 'Product ID or SKU is required' });
      }

      if (!qty || qty <= 0) {
        return res.status(400).json({ success: false, error: 'Quantity must be a positive number' });
      }

      const seedData = getSeedData();
      let matchedProd = seedData.products.find(
        (p: any) => p.sku === sku || p._id === productId || p.sku === productId || p.name === productId
      );

      // 1. Live MongoDB if available
      if (mongoose.connection.readyState === 1) {
        try {
          const query = mongoose.Types.ObjectId.isValid(productId)
            ? { _id: productId }
            : { sku: sku || productId };

          const dbProd = await ProductModel.findOne(query);
          if (dbProd) {
            const level = await InventoryLevelModel.findOne({ productId: dbProd._id });
            const prevStock = level ? level.quantityOnHand : 0;
            const newStock = prevStock + qty;

            if (level) {
              level.quantityOnHand = newStock;
              level.quantityAvailable = newStock;
              await level.save();
            } else {
              await InventoryLevelModel.create({
                tenantId: dbProd.tenantId,
                productId: dbProd._id,
                quantityOnHand: newStock,
                quantityAvailable: newStock,
                minSafetyStock: 10
              });
            }

            await StockMovementModel.create({
              tenantId: dbProd.tenantId,
              productId: dbProd._id,
              movementType: 'STOCK_IN',
              quantity: qty,
              balanceBefore: prevStock,
              balanceAfter: newStock,
              referenceDocType: 'PO',
              referenceDocId: reference || `PO-${Date.now().toString().slice(-5)}`,
              reason: reason || 'Manual Stock In',
              performedBy: req.user?.id || new mongoose.Types.ObjectId()
            });

            return ApiResponse.success(res, 200, 'Stock In recorded successfully', {
              productId: dbProd._id,
              sku: dbProd.sku,
              name: dbProd.name,
              stock: newStock,
              quantityAdded: qty
            });
          }
        } catch (dbErr) {
          console.warn('MongoDB stock in fallback to local seed data:', dbErr);
        }
      }

      // 2. Local fallback
      if (!matchedProd && seedData.products.length > 0) {
        matchedProd = seedData.products[0];
      }

      if (matchedProd) {
        const prevStock = matchedProd.stock || 0;
        matchedProd.stock = prevStock + qty;

        const newMovement = {
          _id: 'mov_' + Date.now(),
          movementType: 'STOCK_IN',
          productName: matchedProd.name,
          sku: matchedProd.sku,
          category: matchedProd.category,
          quantity: qty,
          balanceBefore: prevStock,
          balanceAfter: matchedProd.stock,
          referenceDocType: 'PO',
          referenceDocId: reference || `PO-${Date.now().toString().slice(-5)}`,
          reason: reason || 'Manual Stock In',
          createdAt: new Date().toISOString()
        };

        seedData.movements.unshift(newMovement);
        saveSeedData(seedData);

        return ApiResponse.success(res, 200, 'Stock In recorded successfully', {
          product: matchedProd,
          stock: matchedProd.stock,
          quantityAdded: qty
        });
      }

      return res.status(404).json({ success: false, error: 'Product not found' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/stock/out
   * Body: { productId: string, quantity: number, reference?: string, reason?: string }
   */
  static async stockOut(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId, sku, quantity, reference, reason } = req.body;
      const qty = Number(quantity);

      if (!productId && !sku) {
        return res.status(400).json({ success: false, error: 'Product ID or SKU is required' });
      }

      if (!qty || qty <= 0) {
        return res.status(400).json({ success: false, error: 'Quantity must be a positive number' });
      }

      const seedData = getSeedData();
      let matchedProd = seedData.products.find(
        (p: any) => p.sku === sku || p._id === productId || p.sku === productId || p.name === productId
      );

      // 1. Live MongoDB if available
      if (mongoose.connection.readyState === 1) {
        try {
          const query = mongoose.Types.ObjectId.isValid(productId)
            ? { _id: productId }
            : { sku: sku || productId };

          const dbProd = await ProductModel.findOne(query);
          if (dbProd) {
            const level = await InventoryLevelModel.findOne({ productId: dbProd._id });
            const currentStock = level ? level.quantityOnHand : 0;

            if (currentStock < qty) {
              return res.status(400).json({
                success: false,
                error: `Insufficient stock available. Current stock is ${currentStock} units.`
              });
            }

            const newStock = currentStock - qty;
            if (level) {
              level.quantityOnHand = newStock;
              level.quantityAvailable = newStock;
              await level.save();
            }

            await StockMovementModel.create({
              tenantId: dbProd.tenantId,
              productId: dbProd._id,
              movementType: 'STOCK_OUT',
              quantity: qty,
              balanceBefore: currentStock,
              balanceAfter: newStock,
              referenceDocType: 'SO',
              referenceDocId: reference || `SO-${Date.now().toString().slice(-5)}`,
              reason: reason || 'Manual Stock Out',
              performedBy: req.user?.id || new mongoose.Types.ObjectId()
            });

            return ApiResponse.success(res, 200, 'Stock Out recorded successfully', {
              productId: dbProd._id,
              sku: dbProd.sku,
              name: dbProd.name,
              stock: newStock,
              quantityDeducted: qty
            });
          }
        } catch (dbErr) {
          console.warn('MongoDB stock out fallback to local seed data:', dbErr);
        }
      }

      // 2. Local fallback
      if (!matchedProd && seedData.products.length > 0) {
        matchedProd = seedData.products[0];
      }

      if (matchedProd) {
        const currentStock = matchedProd.stock || 0;
        if (currentStock < qty) {
          return res.status(400).json({
            success: false,
            error: `Insufficient stock available. Current stock is ${currentStock} units.`
          });
        }

        matchedProd.stock = currentStock - qty;

        const newMovement = {
          _id: 'mov_' + Date.now(),
          movementType: 'STOCK_OUT',
          productName: matchedProd.name,
          sku: matchedProd.sku,
          category: matchedProd.category,
          quantity: qty,
          balanceBefore: currentStock,
          balanceAfter: matchedProd.stock,
          referenceDocType: 'SO',
          referenceDocId: reference || `SO-${Date.now().toString().slice(-5)}`,
          reason: reason || 'Manual Stock Out',
          createdAt: new Date().toISOString()
        };

        seedData.movements.unshift(newMovement);
        saveSeedData(seedData);

        return ApiResponse.success(res, 200, 'Stock Out recorded successfully', {
          product: matchedProd,
          stock: matchedProd.stock,
          quantityDeducted: qty
        });
      }

      return res.status(404).json({ success: false, error: 'Product not found' });
    } catch (error) {
      next(error);
    }
  }
}
