import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';

const router = Router();

// Public Auth Endpoints
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Protected Auth Endpoints (Requires Bearer Token)
router.get('/me', authenticateJwt, AuthController.getMe);
router.put('/profile', authenticateJwt, AuthController.updateProfile);

// Preserved Endpoints for Compatibility
router.post('/refresh-token', AuthController.refreshToken);
router.post('/logout', AuthController.logout);

export default router;
