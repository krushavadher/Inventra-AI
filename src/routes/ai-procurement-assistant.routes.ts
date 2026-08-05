import { Router } from 'express';
import { AIProcurementAssistantController } from '../controllers/ai-procurement-assistant.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/rbac.middleware.js';
import { UserRole } from '../enums/user-role.enum.js';

const router = Router();

// Protect all AI procurement assistant routes with JWT Authentication
router.use(authenticateJwt);

router.post('/analyze', authorizeRoles(UserRole.SUPER_ADMIN, UserRole.SUPPLY_CHAIN_VP, UserRole.PROCUREMENT_MANAGER), AIProcurementAssistantController.runAnalysis);
router.get('/recommendations', AIProcurementAssistantController.listRecommendations);
router.post('/recommendations/:id/approve', authorizeRoles(UserRole.SUPER_ADMIN, UserRole.SUPPLY_CHAIN_VP, UserRole.PROCUREMENT_MANAGER), AIProcurementAssistantController.approveRecommendation);
router.post('/recommendations/:id/reject', authorizeRoles(UserRole.SUPER_ADMIN, UserRole.SUPPLY_CHAIN_VP, UserRole.PROCUREMENT_MANAGER), AIProcurementAssistantController.rejectRecommendation);

export default router;
