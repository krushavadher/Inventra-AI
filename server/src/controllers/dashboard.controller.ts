import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service.js';
import { ApiResponse } from '../utils/api-response.util.js';

const dashboardService = new DashboardService();

export class DashboardController {
  static async getExecutiveSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const summary = await dashboardService.getExecutiveSummary(tenantId);

      return ApiResponse.success(res, 200, 'Dashboard executive summary generated successfully', summary);
    } catch (error) {
      next(error);
    }
  }
}
