import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ProductModel } from '../models/product.model.js';
import { InventoryLevelModel } from '../models/inventory-level.model.js';
import { ForecastService } from '../services/forecast.service.js';
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
    const tenantId = req.user?.tenantId;

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
      } catch (dbErr) {
        console.warn('MongoDB alerts query fallback to seed dataset:', dbErr);
      }
    }

    // 2. Fallback to seed dataset if needed
    if (alertItems.length === 0 && fs.existsSync(SEED_FILE)) {
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

    // 3. Compute predicted critical & warning products with stock > 0 from forecast service
    let predicted: any[] = [];
    try {
      const allForecasts = await ForecastService.computeAllForecasts(tenantId);
      predicted = allForecasts
        .filter((p) => p.stock > 0 && (p.risk === 'critical' || p.risk === 'warning'))
        .map((p) => ({
          name: p.name,
          SKU: p.sku,
          sku: p.sku,
          stock: p.stock,
          daysLeft: p.daysLeft,
          stockoutDate: p.stockoutDate,
          suggestedOrderQty: p.suggestedOrderQty,
          risk: p.risk,
          category: p.category
        }));
    } catch (forecastErr) {
      console.warn('Failed to compute forecast for alerts:', forecastErr);
    }

    return res.status(200).json({
      success: true,
      message: 'Alerts retrieved successfully',
      data: alertItems,
      alerts: alertItems,
      predicted,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export default router;
