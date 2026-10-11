import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ProductModel } from '../models/product.model.js';
import { InventoryLevelModel } from '../models/inventory-level.model.js';
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

export class ProductController {
  /**
   * GET /api/products
   * Returns list of products with stock, minStock, category, supplier, pricing, status
   */
  static async listProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, category, status } = req.query;
      let items: any[] = [];

      // 1. Check MongoDB if connected
      if (mongoose.connection.readyState === 1) {
        try {
          const dbProducts = await ProductModel.find({ isDeleted: false })
            .populate('categoryId', 'name')
            .lean();

          if (dbProducts && dbProducts.length > 0) {
            const levels = await InventoryLevelModel.find({}).lean();
            const levelsMap = new Map();
            levels.forEach((l: any) => levelsMap.set(l.productId?.toString(), l));

            items = dbProducts.map((p: any) => {
              const l = levelsMap.get(p._id.toString());
              const stock = l ? l.quantityOnHand : (p.stock || 0);
              const minStock = l ? l.minSafetyStock : (p.minStock || 10);
              const catName = typeof p.categoryId === 'object' && p.categoryId?.name ? p.categoryId.name : (p.category || 'General');

              return {
                _id: p._id.toString(),
                id: p._id.toString(),
                name: p.name,
                sku: p.sku,
                category: catName,
                supplier: p.supplier || 'General Supplier',
                unitCost: p.pricing?.unitCost ?? p.unitCost ?? 100,
                sellingPrice: p.pricing?.sellingPrice ?? p.sellingPrice ?? 150,
                stock,
                minStock,
                status: stock === 0 ? 'OUT_OF_STOCK' : stock <= minStock ? 'LOW_STOCK' : 'IN_STOCK'
              };
            });
          }
        } catch (dbErr) {
          console.warn('MongoDB listProducts fallback to seed file:', dbErr);
        }
      }

      // 2. Fallback to seed dataset
      if (items.length === 0) {
        const seedData = getSeedData();
        items = (seedData.products || []).map((p: any, idx: number) => {
          const stock = p.stock ?? 0;
          const minStock = p.minStock ?? 10;
          return {
            _id: p._id || p.sku || 'prod_' + (idx + 1),
            id: p._id || p.sku || 'prod_' + (idx + 1),
            name: p.name,
            sku: p.sku,
            category: p.category || 'General',
            supplier: p.supplier || 'Standard Supplier',
            unitCost: p.unitCost || 100,
            sellingPrice: p.sellingPrice || 150,
            stock,
            minStock,
            status: stock === 0 ? 'OUT_OF_STOCK' : stock <= minStock ? 'LOW_STOCK' : 'IN_STOCK'
          };
        });
      }

      // Filter in memory for responsiveness
      if (search) {
        const q = String(search).toLowerCase();
        items = items.filter(
          (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
        );
      }

      if (category && category !== 'ALL') {
        items = items.filter((p) => p.category.toLowerCase() === String(category).toLowerCase());
      }

      if (status && status !== 'ALL') {
        if (status === 'IN_STOCK') {
          items = items.filter((p) => p.status === 'IN_STOCK');
        } else if (status === 'LOW_STOCK' || status === 'LOW') {
          items = items.filter((p) => p.status === 'LOW_STOCK');
        } else if (status === 'OUT_OF_STOCK' || status === 'OUT') {
          items = items.filter((p) => p.status === 'OUT_OF_STOCK');
        }
      }

      return ApiResponse.success(res, 200, 'Products retrieved successfully', {
        products: items,
        totalRecords: items.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/products
   * Create a new product
   */
  static async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, sku, category, supplier, unitCost, sellingPrice, stock, minStock } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, error: 'Product name is required' });
      }

      const generatedSku = sku?.trim() || `SKU-${Date.now().toString().slice(-6)}`;
      const prodCost = Number(unitCost) || 100;
      const prodPrice = Number(sellingPrice) || Math.round(prodCost * 1.5);
      const prodStock = Number(stock) || 0;
      const prodMinStock = Number(minStock) || 10;
      const prodCategory = category?.trim() || 'General';
      const prodSupplier = supplier?.trim() || 'Direct Vendor';

      const newProductObj = {
        _id: 'prod_' + Date.now(),
        id: 'prod_' + Date.now(),
        name: name.trim(),
        sku: generatedSku.toUpperCase(),
        category: prodCategory,
        supplier: prodSupplier,
        unitCost: prodCost,
        sellingPrice: prodPrice,
        stock: prodStock,
        minStock: prodMinStock,
        status: prodStock === 0 ? 'OUT_OF_STOCK' : prodStock <= prodMinStock ? 'LOW_STOCK' : 'IN_STOCK'
      };

      // 1. Save to MongoDB if available
      if (mongoose.connection.readyState === 1) {
        try {
          const tenantId = req.user?.tenantId || new mongoose.Types.ObjectId();
          const dbProd = await ProductModel.create({
            tenantId,
            name: newProductObj.name,
            sku: newProductObj.sku,
            supplier: newProductObj.supplier,
            barcode: '890' + Math.floor(100000000 + Math.random() * 900000000),
            qrCode: `QR-${newProductObj.sku}`,
            pricing: { unitCost: prodCost, sellingPrice: prodPrice, taxRate: 18 },
            status: 'ACTIVE'
          });

          await InventoryLevelModel.create({
            tenantId,
            productId: dbProd._id,
            quantityOnHand: prodStock,
            quantityAvailable: prodStock,
            minSafetyStock: prodMinStock,
            reorderPoint: prodMinStock * 2
          });

          newProductObj._id = dbProd._id.toString();
          newProductObj.id = dbProd._id.toString();
        } catch (dbErr) {
          console.warn('MongoDB createProduct fallback:', dbErr);
        }
      }

      // 2. Persist to local seed data
      const seedData = getSeedData();
      seedData.products.unshift(newProductObj);
      saveSeedData(seedData);

      return ApiResponse.success(res, 201, 'Product created successfully', newProductObj);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/products/:id
   * Update existing product
   */
  static async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, sku, category, supplier, unitCost, sellingPrice, stock, minStock } = req.body;

      let updatedProduct: any = null;

      // 1. Try MongoDB
      if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(id)) {
        try {
          const dbProd = await ProductModel.findById(id);
          if (dbProd) {
            if (name) dbProd.name = name;
            if (sku) dbProd.sku = sku.toUpperCase();
            if (supplier) dbProd.supplier = supplier;
            if (unitCost !== undefined) dbProd.pricing.unitCost = Number(unitCost);
            if (sellingPrice !== undefined) dbProd.pricing.sellingPrice = Number(sellingPrice);
            await dbProd.save();

            if (stock !== undefined || minStock !== undefined) {
              const level = await InventoryLevelModel.findOne({ productId: dbProd._id });
              if (level) {
                if (stock !== undefined) {
                  level.quantityOnHand = Number(stock);
                  level.quantityAvailable = Number(stock);
                }
                if (minStock !== undefined) level.minSafetyStock = Number(minStock);
                await level.save();
              }
            }

            updatedProduct = {
              _id: dbProd._id.toString(),
              name: dbProd.name,
              sku: dbProd.sku,
              category: category || 'General',
              supplier: dbProd.supplier,
              unitCost: dbProd.pricing.unitCost,
              sellingPrice: dbProd.pricing.sellingPrice,
              stock: stock !== undefined ? Number(stock) : 50,
              minStock: minStock !== undefined ? Number(minStock) : 10
            };
          }
        } catch (dbErr) {
          console.warn('MongoDB updateProduct error:', dbErr);
        }
      }

      // 2. Update local seed file
      const seedData = getSeedData();
      const idx = seedData.products.findIndex(
        (p: any) => p._id === id || p.sku === id || p.id === id
      );

      if (idx !== -1) {
        const item = seedData.products[idx];
        if (name) item.name = name;
        if (sku) item.sku = sku.toUpperCase();
        if (category) item.category = category;
        if (supplier) item.supplier = supplier;
        if (unitCost !== undefined) item.unitCost = Number(unitCost);
        if (sellingPrice !== undefined) item.sellingPrice = Number(sellingPrice);
        if (stock !== undefined) item.stock = Number(stock);
        if (minStock !== undefined) item.minStock = Number(minStock);
        saveSeedData(seedData);
        updatedProduct = item;
      }

      if (!updatedProduct) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }

      return ApiResponse.success(res, 200, 'Product updated successfully', updatedProduct);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/products/:id
   * Delete product
   */
  static async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // 1. Try MongoDB
      if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(id)) {
        try {
          await ProductModel.findByIdAndUpdate(id, { isDeleted: true });
          await InventoryLevelModel.deleteMany({ productId: id });
        } catch (dbErr) {
          console.warn('MongoDB deleteProduct error:', dbErr);
        }
      }

      // 2. Remove from local seed file
      const seedData = getSeedData();
      seedData.products = seedData.products.filter(
        (p: any) => p._id !== id && p.sku !== id && p.id !== id
      );
      saveSeedData(seedData);

      return ApiResponse.success(res, 200, 'Product deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
