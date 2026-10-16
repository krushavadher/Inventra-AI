import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';

const router = Router();

// Protect all notification routes with JWT Authentication
router.use(authenticateJwt);

router.get('/', NotificationController.getUserNotifications);
router.get('/unread', NotificationController.getUnreadCount);
router.patch('/:id/read', NotificationController.markAsRead);
router.post('/read-all', NotificationController.markAllAsRead);

export default router;
