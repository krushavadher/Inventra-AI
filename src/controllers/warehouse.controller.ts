import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { WarehouseService } from '../services/warehouse.service.js';
import { ApiResponse } from '../utils/api-response.util.js';

const warehouseService = new WarehouseService();

const createWarehouseSchema = z.object({
  code: z.string().min(2, 'Warehouse code is required'),
  name: z.string().min(2, 'Warehouse name is required'),
  type: z.enum(['DISTRIBUTION_CENTER', 'REGIONAL_HUB', 'RETAIL_STORE', 'COLD_STORAGE']).optional(),
  address: z.object({
    street: z.string().min(1, 'Street is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    country: z.string().min(1, 'Country is required'),
    postalCode: z.string().min(1, 'Postal code is required'),
    coordinates: z.object({ lat: z.number(), lng: z.number() }).optional()
  }),
  totalCapacityVolume: z.number().min(0).optional(),
  totalCapacityWeight: z.number().min(0).optional()
});

const addZoneSchema = z.object({
  zoneCode: z.string().min(1, 'Zone code is required'),
  name: z.string().min(1, 'Zone name is required'),
  type: z.enum(['RECEIVING', 'STORAGE', 'PICKING', 'COLD_STORAGE', 'QUARANTINE', 'DISPATCH']),
  tempControlCelsius: z.number().optional(),
  aislesCount: z.number().min(1).optional(),
  racksPerAisle: z.number().min(1).optional(),
  shelvesPerRack: z.number().min(1).optional(),
  binsPerShelf: z.number().min(1).optional()
});

export class WarehouseController {
  static async createWarehouse(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createWarehouseSchema.parse(req.body);
      const tenantId = req.user!.tenantId;
      const warehouse = await warehouseService.createWarehouse(tenantId, validatedData as any);

      return ApiResponse.success(res, 201, 'Warehouse created successfully', warehouse);
    } catch (error) {
      next(error);
    }
  }

  static async listWarehouses(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const warehouses = await warehouseService.listWarehouses(tenantId);

      return ApiResponse.success(res, 200, 'Warehouses retrieved successfully', warehouses);
    } catch (error) {
      next(error);
    }
  }

  static async getWarehouseById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const tenantId = req.user!.tenantId;
      const warehouse = await warehouseService.getWarehouseById(id, tenantId);

      return ApiResponse.success(res, 200, 'Warehouse retrieved successfully', warehouse);
    } catch (error) {
      next(error);
    }
  }

  static async updateWarehouse(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const tenantId = req.user!.tenantId;
      const validatedData = createWarehouseSchema.partial().parse(req.body);
      const updated = await warehouseService.updateWarehouse(id, tenantId, validatedData as any);

      return ApiResponse.success(res, 200, 'Warehouse updated successfully', updated);
    } catch (error) {
      next(error);
    }
  }

  static async deleteWarehouse(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const tenantId = req.user!.tenantId;
      await warehouseService.deleteWarehouse(id, tenantId);

      return ApiResponse.success(res, 200, 'Warehouse deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async addZone(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const tenantId = req.user!.tenantId;
      const validatedData = addZoneSchema.parse(req.body);
      const warehouse = await warehouseService.addZone(id, tenantId, validatedData as any);

      return ApiResponse.success(res, 201, 'Zone and bins generated successfully', warehouse);
    } catch (error) {
      next(error);
    }
  }

  static async getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const tenantId = req.user!.tenantId;
      const analytics = await warehouseService.getWarehouseAnalytics(id, tenantId);

      return ApiResponse.success(res, 200, 'Warehouse analytics generated successfully', analytics);
    } catch (error) {
      next(error);
    }
  }

  static async getHeatmap(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const tenantId = req.user!.tenantId;
      const heatmap = await warehouseService.getHeatmapGridData(id, tenantId);

      return ApiResponse.success(res, 200, 'Warehouse heatmap grid generated successfully', heatmap);
    } catch (error) {
      next(error);
    }
  }
}
