import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AIService } from '../services/ai.service.js';
import { ApiResponse } from '../utils/api-response.util.js';

const aiService = new AIService();

const generateDescriptionSchema = z.object({
  productName: z.string().min(1, 'Product name is required'),
  category: z.string().optional(),
  keyFeatures: z.array(z.string()).optional(),
  targetAudience: z.string().optional()
});

const categorizeSchema = z.object({
  productName: z.string().min(1, 'Product name is required'),
  rawDescription: z.string().optional()
});

const forecastExplanationSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  productName: z.string().min(1, 'Product name is required'),
  predictedDemand: z.number(),
  currentStock: z.number(),
  safetyStock: z.number(),
  historicalTrend: z.string().optional()
});

const chatCopilotSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  history: z.array(z.any()).optional()
});


export class AIController {
  static async generateDescription(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = generateDescriptionSchema.parse(req.body);
      const result = await aiService.generateProductDescription(validatedData);

      return ApiResponse.success(res, 200, 'AI description generated successfully', result);
    } catch (error) {
      next(error);
    }
  }

  static async categorize(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = categorizeSchema.parse(req.body);
      const result = await aiService.categorizeProduct(validatedData);

      return ApiResponse.success(res, 200, 'AI product categorization completed', result);
    } catch (error) {
      next(error);
    }
  }

  static async getInventoryInsights(req: Request, res: Response, next: NextFunction) {
    try {
      const insights = await aiService.generateInventoryInsights(req.body);

      return ApiResponse.success(res, 200, 'AI inventory insights generated', insights);
    } catch (error) {
      next(error);
    }
  }

  static async explainForecast(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = forecastExplanationSchema.parse(req.body);
      const explanation = await aiService.explainDemandForecast({
        ...validatedData,
        historicalTrend: validatedData.historicalTrend || 'UPWARD'
      });

      return ApiResponse.success(res, 200, 'AI demand forecast explanation generated', explanation);
    } catch (error) {
      next(error);
    }
  }

  static async chatCopilot(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = chatCopilotSchema.parse(req.body);
      const result = await aiService.chatCopilot(validatedData.prompt, validatedData.history);

      return ApiResponse.success(res, 200, 'AI Copilot response generated', result);
    } catch (error) {
      next(error);
    }
  }
}
