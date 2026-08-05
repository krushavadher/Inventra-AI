import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ProductService } from '../services/product.service.js';
import { ApiResponse } from '../utils/api-response.util.js';

const productService = new ProductService();

// Zod Validation Schemas
const createProductSchema = z.object({
  sku: z.string().optional(),
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  barcode: z.string().optional(),
  images: z.array(z.object({
    url: z.string().url(),
    isPrimary: z.boolean().default(false),
    altText: z.string().optional()
  })).optional(),
  pricing: z.object({
    unitCost: z.number().min(0, 'Unit cost must be >= 0'),
    sellingPrice: z.number().min(0, 'Selling price must be >= 0'),
    wholesalePrice: z.number().min(0).optional(),
    taxRate: z.number().min(0).optional(),
    taxCode: z.string().optional()
  }),
  physicalDimensions: z.object({
    weight: z.number().min(0).optional(),
    weightUom: z.enum(['KG', 'G', 'LB', 'OZ']).optional(),
    length: z.number().min(0).optional(),
    width: z.number().min(0).optional(),
    height: z.number().min(0).optional(),
    dimensionUom: z.enum(['CM', 'M', 'IN', 'FT']).optional()
  }).optional(),
  warehouseLocation: z.object({
    defaultWarehouseId: z.string().optional(),
    defaultBinCode: z.string().optional()
  }).optional(),
  supplierMapping: z.object({
    primarySupplierId: z.string().optional(),
    secondarySupplierId: z.string().optional(),
    supplierSku: z.string().optional()
  }).optional(),
  abcClass: z.enum(['A', 'B', 'C']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DISCONTINUED']).optional()
});

const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional()
});

const updateProductSchema = createProductSchema.partial();

export class ProductController {
  static async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createProductSchema.parse(req.body);
      const tenantId = req.user!.tenantId;
      const product = await productService.createProduct(tenantId, validatedData as any);

      return ApiResponse.success(res, 201, 'Product created successfully', product);
    } catch (error) {
      next(error);
    }
  }

  static async getProductById(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.params.id;
      const tenantId = req.user!.tenantId;
      const product = await productService.getProductById(productId, tenantId);

      return ApiResponse.success(res, 200, 'Product retrieved successfully', product);
    } catch (error) {
      next(error);
    }
  }

  static async getProductBySku(req: Request, res: Response, next: NextFunction) {
    try {
      const sku = req.params.sku;
      const tenantId = req.user!.tenantId;
      const product = await productService.getProductBySku(sku, tenantId);

      return ApiResponse.success(res, 200, 'Product retrieved successfully', product);
    } catch (error) {
      next(error);
    }
  }

  static async listProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const { categoryId, abcClass, status, search, page, limit, sortBy, sortOrder, warehouseId, supplierId } = req.query;

      const result = await productService.listProducts(tenantId, {
        categoryId: categoryId as string,
        abcClass: abcClass as string,
        status: status as string,
        search: search as string,
        warehouseId: warehouseId as string,
        supplierId: supplierId as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      });

      return ApiResponse.success(res, 200, 'Products listed successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.params.id;
      const tenantId = req.user!.tenantId;
      const validatedData = updateProductSchema.parse(req.body);

      const updatedProduct = await productService.updateProduct(productId, tenantId, validatedData as any);

      return ApiResponse.success(res, 200, 'Product updated successfully', updatedProduct);
    } catch (error) {
      next(error);
    }
  }

  static async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.params.id;
      const tenantId = req.user!.tenantId;
      await productService.deleteProduct(productId, tenantId);

      return ApiResponse.success(res, 200, 'Product deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  // Category endpoints
  static async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createCategorySchema.parse(req.body);
      const tenantId = req.user!.tenantId;
      const category = await productService.createCategory(tenantId, validatedData.name, validatedData.description);

      return ApiResponse.success(res, 201, 'Category created successfully', category);
    } catch (error) {
      next(error);
    }
  }

  static async listCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const categories = await productService.listCategories(tenantId);

      return ApiResponse.success(res, 200, 'Categories retrieved successfully', categories);
    } catch (error) {
      next(error);
    }
  }
}
