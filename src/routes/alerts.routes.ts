import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ProductModel } from '../models/product.model.js';
import { InventoryLevelModel } from '../models/inventory-level.model.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';
import { ApiResponse } from '../utils/api-response.util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SEED_FILE = path.resolve(__dirname, '../data/seed-data.json');

const router = Router();
router.use(authenticateJwt);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alertItems: any[] = [];

    // 1. Try MongoDB
    if (mongoose.connection.readyState === 1) {
      try {
        const levels = await InventoryLevelModel.find({})
          .populate('productId', 'name sku pricing categoryId supplier')
          .lean();

        levels.forEach((l: any) => {
          const stock = l.quantityOnHand ?? 0;
          const min = l.minSafetyStock ?? 10;
          if (stock <= min) {
            alertItems.push({
              _id: l._id?.toString(),
              productId: l.productId?._id?.toString(),
              name: l.productId?.name || 'Item',
              sku: l.productId?.sku || 'SKU',
              category: typeof l.productId?.categoryId === 'object' ? l.productId.categoryId?.name : 'General',
              supplier: l.productId?.supplier || 'Supplier',
              stock,
              minStock: min,
              status: stock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
              severity: stock === 0 ? 'CRITICAL' : 'WARNING',
              message: stock === 0 ? 'Stock completely depleted (0 units left)' : `Only ${stock} units left (below safety threshold of ${min})`
            });
          }
        });

        if (alertItems.length > 0) {
          return ApiResponse.success(res, 200, 'Alerts retrieved successfully', alertItems);
        }
      } catch (dbErr) {
        console.warn('MongoDB alerts query fallback to seed dataset:', dbErr);
      }
    }

    // 2. Fallback to seed dataset
    if (fs.existsSync(SEED_FILE)) {
      const seedData = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
      (seedData.products || []).forEach((p: any, idx: number) => {
        if (p.stock <= p.minStock) {
          alertItems.push({
            _id: 'alert_' + (idx + 1),
            productId: 'prod_' + (idx + 1),
            name: p.name,
            sku: p.sku,
            category: p.category,
            supplier: p.supplier,
            stock: p.stock,
            minStock: p.minStock,
            status: p.stock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
            severity: p.stock === 0 ? 'CRITICAL' : 'WARNING',
            message: p.stock === 0 ? 'Stock completely depleted (0 units left)' : `Only ${p.stock} units left (below safety threshold of ${p.minStock})`
          });
        }
      });
    }

    return ApiResponse.success(res, 200, 'Alerts retrieved successfully', alertItems);
  } catch (error) {
    next(error);
  }
});

export default router;
