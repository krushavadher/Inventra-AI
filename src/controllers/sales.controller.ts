import { Request, Response, NextFunction } from 'express';
import { SalesService } from '../services/sales.service.js';
import { ApiResponse } from '../utils/api-response.util.js';

export class SalesController {
  /**
   * POST /api/sales
   * Body: { productId, quantity, salePrice?, customer?, note?, date?, adjustStock? }
   */
  static async createSale(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId, sku, quantity, salePrice, customer, note, date, adjustStock } = req.body;

      if (!productId && !sku) {
        return res.status(400).json({ success: false, error: 'Product ID or SKU is required' });
      }

      const sale = await SalesService.recordSale({
        productId,
        sku,
        quantity,
        salePrice,
        customer,
        note,
        date,
        adjustStock,
        tenantId: req.user?.tenantId,
        userId: req.user?.id || req.user?.userId
      });

      return ApiResponse.success(res, 201, 'Sale recorded successfully', sale);
    } catch (error: any) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      next(error);
    }
  }

  /**
   * POST /api/sales/:id/void
   */
  static async voidSale(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await SalesService.voidSale(id);
      return ApiResponse.success(res, 200, result.message, result);
    } catch (error: any) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      next(error);
    }
  }

  /**
   * GET /api/sales
   * Query: from, to, search, category, page, limit, includeVoided
   */
  static async getSales(req: Request, res: Response, next: NextFunction) {
    try {
      const { from, to, search, category, page, limit, includeVoided } = req.query;

      const result = await SalesService.getSales({
        from: from as string,
        to: to as string,
        search: search as string,
        category: category as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        includeVoided: includeVoided === 'true' || includeVoided === '1',
        tenantId: req.user?.tenantId
      });

      return ApiResponse.success(res, 200, 'Sales fetched successfully', result.items, {
        totalRecords: result.pagination.total,
        page: result.pagination.page,
        limit: result.pagination.limit,
        totalPages: result.pagination.totalPages
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * GET /api/sales/summary
   * Query: from, to
   */
  static async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { from, to } = req.query;
      const summary = await SalesService.getSalesSummary(from as string, to as string);
      return ApiResponse.success(res, 200, 'Sales summary generated successfully', summary);
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * POST /api/sales/import
   * Body: { rows: [{ sku, quantity, salePrice, date, customer? }], adjustStock? }
   */
  static async importSales(req: Request, res: Response, next: NextFunction) {
    try {
      const { rows, adjustStock } = req.body;
      const result = await SalesService.importSales(
        rows,
        adjustStock,
        req.user?.tenantId,
        req.user?.id || req.user?.userId
      );

      return ApiResponse.success(res, 200, 'Sales import completed', result);
    } catch (error: any) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      next(error);
    }
  }

  /**
   * DELETE /api/sales/demo
   */
  static async deleteDemoSales(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SalesService.deleteDemoSales();
      return ApiResponse.success(res, 200, `Deleted ${result.deletedCount} demo sales records`, result);
    } catch (error: any) {
      next(error);
    }
  }
}
