import { Router } from 'express';
import { AIController } from '../controllers/ai.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';

const router = Router();

// Protect all AI routes with JWT Authentication
router.use(authenticateJwt);

router.post('/generate-description', AIController.generateDescription);
router.post('/categorize-product', AIController.categorize);
router.post('/inventory-insights', AIController.getInventoryInsights);
router.post('/explain-forecast', AIController.explainForecast);
router.post('/copilot/chat', AIController.chatCopilot);
router.post('/generate-report', AIController.generateReport);

export default router;
