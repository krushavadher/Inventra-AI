import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { InventoryService } from '../services/inventory.service.js';
import { ApiResponse } from '../utils/api-response.util.js';

const inventoryService = new InventoryService();

// Validation Schemas
const stockInSchema = z.object({
  warehouseId: z.string().optional(),
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().min(1, 'Quantity must be > 0'),
  binCode: z.string().optional(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  referenceDocType: z.enum(['PO', 'MANUAL']).optional(),
  referenceDocId: z.string().optional(),
  notes: z.string().optional()
});

const stockOutSchema = z.object({
  warehouseId: z.string().optional(),
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().min(1, 'Quantity must be > 0'),
  binCode: z.string().optional(),
  batchNumber: z.string().optional(),
  referenceDocType: z.enum(['SO', 'MANUAL']).optional(),
  referenceDocId: z.string().optional(),
  reason: z.string().optional()
});

const stockAdjustmentSchema = z.object({
  warehouseId: z.string().optional(),
  productId: z.string().min(1, 'Product ID is required'),
  quantityDelta: z.number().refine((v) => v !== 0, { message: 'Delta cannot be 0' }),
  binCode: z.string().optional(),
  batchNumber: z.string().optional(),
  reason: z.string().min(1, 'Reason is required for adjustment')
});

const stockTransferSchema = z.object({
  fromWarehouseId: z.string().min(1, 'Source Warehouse ID is required'),
  toWarehouseId: z.string().min(1, 'Destination Warehouse ID is required'),
  items: z.array(
    z.object({
      productId: z.string().min(1, 'Product ID is required'),
      quantity: z.number().min(1, 'Quantity must be > 0'),
      batchNumber: z.string().optional()
    })
  ).min(1, 'At least one item is required'),
  notes: z.string().optional()
});

export class InventoryController {
  static async queryLevels(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId || 'tenant_12345';
      const {
        search,
        warehouseId,
        category,
        supplier,
        status,
        stockLevel,
        sortBy,
        sortOrder,
        page,
        limit
      } = req.query;

      const result = await inventoryService.queryInventory(tenantId, {
        search: search as string,
        warehouseId: warehouseId as string,
        category: category as string,
        supplier: supplier as string,
        status: status as string,
        stockLevel: stockLevel as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 10
      });

      return ApiResponse.success(res, 200, 'Inventory levels retrieved successfully', result.items, {
        totalRecords: result.totalRecords,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSummaryKPIs(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId || 'tenant_12345';
      const kpis = await inventoryService.getSummaryKPIs(tenantId);
      return ApiResponse.success(res, 200, 'Inventory KPI summary retrieved', kpis);
    } catch (error) {
      next(error);
    }
  }

  static async getAIRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId || 'tenant_12345';
      const recs = await inventoryService.getAIRecommendations(tenantId);
      return ApiResponse.success(res, 200, 'AI Procurement recommendations retrieved', recs);
    } catch (error) {
      next(error);
    }
  }

  static async getAIAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId || 'tenant_12345';
      const alerts = await inventoryService.getAIAlerts(tenantId);
      return ApiResponse.success(res, 200, 'AI Inventory alerts retrieved', alerts);
    } catch (error) {
      next(error);
    }
  }

  static async getAnalyticsData(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId || 'tenant_12345';
      const analytics = await inventoryService.getAnalyticsData(tenantId);
      return ApiResponse.success(res, 200, 'Analytics charts retrieved', analytics);
    } catch (error) {
      next(error);
    }
  }

  static async createItem(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId || 'tenant_12345';
      const item = await inventoryService.createItem(tenantId, req.body);
      return ApiResponse.success(res, 201, 'Inventory item created successfully', item);
    } catch (error) {
      next(error);
    }
  }

  static async updateItem(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId || 'tenant_12345';
      const item = await inventoryService.updateItem(tenantId, req.params.id, req.body);
      return ApiResponse.success(res, 200, 'Inventory item updated successfully', item);
    } catch (error) {
      next(error);
    }
  }

  static async deleteItem(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId || 'tenant_12345';
      await inventoryService.deleteItem(tenantId, req.params.id);
      return ApiResponse.success(res, 200, 'Inventory item deleted successfully', { id: req.params.id });
    } catch (error) {
      next(error);
    }
  }

  static async stockIn(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = stockInSchema.parse(req.body);
      const tenantId = req.user?.tenantId || 'tenant_12345';
      const userId = req.user?.userId || 'usr_admin';
      const result = await inventoryService.stockIn(tenantId, userId, {
        ...validatedData,
        warehouseId: validatedData.warehouseId || 'wh_east_01'
      });

      return ApiResponse.success(res, 200, 'Stock In recorded successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async stockOut(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = stockOutSchema.parse(req.body);
      const tenantId = req.user?.tenantId || 'tenant_12345';
      const userId = req.user?.userId || 'usr_admin';
      const result = await inventoryService.stockOut(tenantId, userId, {
        ...validatedData,
        warehouseId: validatedData.warehouseId || 'wh_east_01'
      });

      return ApiResponse.success(res, 200, 'Stock Out recorded successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async adjustStock(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = stockAdjustmentSchema.parse(req.body);
      const tenantId = req.user?.tenantId || 'tenant_12345';
      const userId = req.user?.userId || 'usr_admin';
      const result = await inventoryService.adjustStock(tenantId, userId, {
        ...validatedData,
        warehouseId: validatedData.warehouseId || 'wh_east_01'
      });

      return ApiResponse.success(res, 200, 'Stock adjustment recorded successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async createTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = stockTransferSchema.parse(req.body);
      const tenantId = req.user?.tenantId || 'tenant_12345';
      const userId = req.user?.userId || 'usr_admin';
      const result = await inventoryService.createStockTransfer(tenantId, userId, validatedData);

      return ApiResponse.success(res, 201, 'Stock transfer completed successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async getMovementHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId || 'tenant_12345';
      const { productId, warehouseId, page, limit } = req.query;

      const result = await inventoryService.getMovementHistory(
        tenantId,
        productId as string,
        warehouseId as string,
        page ? parseInt(page as string) : 1,
        limit ? parseInt(limit as string) : 10
      );

      return ApiResponse.success(res, 200, 'Movement history retrieved successfully', result.movements, {
        totalRecords: result.totalRecords,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      });
    } catch (error) {
      next(error);
    }
  }

  static async getLowStockAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId || 'tenant_12345';
      const warehouseId = req.query.warehouseId as string;
      const alerts = await inventoryService.getLowStockAlerts(tenantId, warehouseId);

      return ApiResponse.success(res, 200, 'Low stock alerts retrieved successfully', alerts);
    } catch (error) {
      next(error);
    }
  }

  static async getExpiredProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId || 'tenant_12345';
      const items = await inventoryService.getExpiredProducts(tenantId);

      return ApiResponse.success(res, 200, 'Expired inventory retrieved successfully', items);
    } catch (error) {
      next(error);
    }
  }

  static async getDamagedProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId || 'tenant_12345';
      const items = await inventoryService.getDamagedProducts(tenantId);

      return ApiResponse.success(res, 200, 'Damaged inventory retrieved successfully', items);
    } catch (error) {
      next(error);
    }
  }

  static async getValuation(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user?.tenantId || 'tenant_12345';
      const valuation = await inventoryService.getInventoryValuation(tenantId);

      return ApiResponse.success(res, 200, 'Inventory valuation calculated successfully', valuation);
    } catch (error) {
      next(error);
    }
  }
}
