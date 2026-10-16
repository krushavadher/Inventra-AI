import { Router } from 'express';
import { ForecastController } from '../controllers/forecast.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';

const router = Router();

// Protect all forecast endpoints with JWT authentication
router.use(authenticateJwt);

// Executive forecast summary
router.get('/summary', ForecastController.getSummary);

// AI Forecast Analyst Insights (Gemini)
router.post('/insights', ForecastController.getInsights);

// Product forecast with historical & projected series
router.get('/:productId', ForecastController.getProductForecast);

// List all product forecasts with filtering and sorting
router.get('/', ForecastController.getForecasts);

export default router;
