import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/rbac.middleware.js';
import { UserRole } from '../enums/user-role.enum.js';

const router = Router();

// Public Routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);
router.post('/verify-email', AuthController.verifyEmail);
router.post('/logout', AuthController.logout);

// Protected Routes (Requires JWT Authentication)
router.use(authenticateJwt);

router.get('/me', AuthController.getProfile);
router.post('/change-password', AuthController.changePassword);

// Example Role-Protected Route (Admin Only)
router.get('/admin-only', authorizeRoles(UserRole.SUPER_ADMIN, UserRole.SUPPLY_CHAIN_VP), (req, res) => {
  res.json({ success: true, message: 'Welcome Admin / Executive!' });
});

export default router;
