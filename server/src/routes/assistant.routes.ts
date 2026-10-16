import { Router } from 'express';
import { AssistantController } from '../controllers/assistant.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';

const router = Router();

// Protect with JWT auth middleware
router.use(authenticateJwt);

// POST /api/assistant { message }
router.post('/', AssistantController.askAssistant);

export default router;
