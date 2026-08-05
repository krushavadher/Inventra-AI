import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { SupplierService } from '../services/supplier.service.js';
import { ApiResponse } from '../utils/api-response.util.js';

const supplierService = new SupplierService();

const createSupplierSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(2, 'Supplier name is required'),
  taxId: z.string().optional(),
  categories: z.array(z.string()).optional(),
  contact: z.object({
    primaryName: z.string().min(1, 'Primary contact name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(1, 'Phone number is required'),
    designation: z.string().optional(),
    address: z.object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      postalCode: z.string().optional()
    }).optional()
  }),
  paymentTerms: z.enum(['NET_15', 'NET_30', 'NET_60', 'DUE_ON_RECEIPT']).optional(),
  leadTime: z.object({
    defaultDays: z.number().min(1, 'Default lead time days must be >= 1'),
    minDays: z.number().optional(),
    maxDays: z.number().optional()
  }).optional()
});

const addDocumentSchema = z.object({
  title: z.string().min(1, 'Document title is required'),
  fileUrl: z.string().url('Invalid file URL'),
  type: z.enum(['CONTRACT', 'TAX_CERTIFICATE', 'SLA', 'OTHER']),
  expiryDate: z.string().optional()
});

export class SupplierController {
  static async createSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createSupplierSchema.parse(req.body);
      const tenantId = req.user!.tenantId;
      const supplier = await supplierService.createSupplier(tenantId, validatedData as any);

      return ApiResponse.success(res, 201, 'Supplier created successfully', supplier);
    } catch (error) {
      next(error);
    }
  }

  static async listSuppliers(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const { search, riskLevel } = req.query;
      const suppliers = await supplierService.listSuppliers(tenantId, search as string, riskLevel as string);

      return ApiResponse.success(res, 200, 'Suppliers retrieved successfully', suppliers);
    } catch (error) {
      next(error);
    }
  }

  static async getSupplierById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const tenantId = req.user!.tenantId;
      const supplier = await supplierService.getSupplierById(id, tenantId);

      return ApiResponse.success(res, 200, 'Supplier retrieved successfully', supplier);
    } catch (error) {
      next(error);
    }
  }

  static async updateSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const tenantId = req.user!.tenantId;
      const validatedData = createSupplierSchema.partial().parse(req.body);
      const updated = await supplierService.updateSupplier(id, tenantId, validatedData as any);

      return ApiResponse.success(res, 200, 'Supplier updated successfully', updated);
    } catch (error) {
      next(error);
    }
  }

  static async deleteSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const tenantId = req.user!.tenantId;
      await supplierService.deleteSupplier(id, tenantId);

      return ApiResponse.success(res, 200, 'Supplier deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async addDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const tenantId = req.user!.tenantId;
      const validatedData = addDocumentSchema.parse(req.body);
      const supplier = await supplierService.addSupplierDocument(id, tenantId, validatedData);

      return ApiResponse.success(res, 201, 'Document attached successfully', supplier);
    } catch (error) {
      next(error);
    }
  }

  static async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const dashboard = await supplierService.getPerformanceDashboard(tenantId);

      return ApiResponse.success(res, 200, 'Supplier performance dashboard retrieved successfully', dashboard);
    } catch (error) {
      next(error);
    }
  }
}
