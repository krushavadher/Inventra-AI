import { Request, Response, NextFunction } from 'express';
import { ReportService } from '../services/report.service.js';
import { ApiResponse } from '../utils/api-response.util.js';

const reportService = new ReportService();

export class ReportController {
  private static sendReportResponse(res: Response, result: { contentType: string; data: any; filename?: string }) {
    if (result.contentType === 'text/csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename || 'report.csv'}"`);
      return res.send(result.data);
    }
    return ApiResponse.success(res, 200, 'Report data generated successfully', result.data);
  }

  static async getInventoryReport(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const format = (req.query.format as string)?.toUpperCase() === 'CSV' ? 'CSV' : 'JSON';
      const result = await reportService.generateInventoryReport(tenantId, format);
      return ReportController.sendReportResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async getSupplierReport(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const format = (req.query.format as string)?.toUpperCase() === 'CSV' ? 'CSV' : 'JSON';
      const result = await reportService.generateSupplierReport(tenantId, format);
      return ReportController.sendReportResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async getSalesReport(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const format = (req.query.format as string)?.toUpperCase() === 'CSV' ? 'CSV' : 'JSON';
      const result = await reportService.generateSalesReport(tenantId, format);
      return ReportController.sendReportResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async getWarehouseReport(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const format = (req.query.format as string)?.toUpperCase() === 'CSV' ? 'CSV' : 'JSON';
      const result = await reportService.generateWarehouseReport(tenantId, format);
      return ReportController.sendReportResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async getForecastReport(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const format = (req.query.format as string)?.toUpperCase() === 'CSV' ? 'CSV' : 'JSON';
      const result = await reportService.generateForecastReport(tenantId, format);
      return ReportController.sendReportResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async getProcurementReport(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const format = (req.query.format as string)?.toUpperCase() === 'CSV' ? 'CSV' : 'JSON';
      const result = await reportService.generateProcurementReport(tenantId, format);
      return ReportController.sendReportResponse(res, result);
    } catch (error) {
      next(error);
    }
  }
}
