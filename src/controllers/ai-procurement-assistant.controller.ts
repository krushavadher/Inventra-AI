import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AIProcurementAssistantService } from '../services/ai-procurement-assistant.service.js';
import { ApiResponse } from '../utils/api-response.util.js';

const assistantService = new AIProcurementAssistantService();

const runAnalysisSchema = z.object({
  warehouseId: z.string().optional(),
  maxBudgetLimit: z.number().optional()
});

export class AIProcurementAssistantController {
  static async runAnalysis(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = runAnalysisSchema.parse(req.body);
      const tenantId = req.user!.tenantId;
      const userId = req.user!.userId;
      const result = await assistantService.runAnalysis(tenantId, userId, validatedData);

      return ApiResponse.success(res, 200, result.message, result.recommendations);
    } catch (error) {
      next(error);
    }
  }

  static async listRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const recs = await assistantService.listRecommendations(tenantId);

      return ApiResponse.success(res, 200, 'AI Procurement recommendations retrieved successfully', recs);
    } catch (error) {
      next(error);
    }
  }

  static async approveRecommendation(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const tenantId = req.user!.tenantId;
      const managerId = req.user!.userId;
      const rec = await assistantService.approveRecommendation(id, tenantId, managerId);

      return ApiResponse.success(res, 200, 'Recommendation approved and Draft PO submitted for executive sign-off', rec);
    } catch (error) {
      next(error);
    }
  }

  static async rejectRecommendation(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const tenantId = req.user!.tenantId;
      const managerId = req.user!.userId;
      const rec = await assistantService.rejectRecommendation(id, tenantId, managerId);

      return ApiResponse.success(res, 200, 'Recommendation rejected and Draft PO cancelled', rec);
    } catch (error) {
      next(error);
    }
  }
}
