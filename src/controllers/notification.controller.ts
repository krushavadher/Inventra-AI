import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service.js';
import { ApiResponse } from '../utils/api-response.util.js';

const notificationService = new NotificationService();

export class NotificationController {
  static async getUserNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.userId;
      const notifications = await notificationService.getUserNotifications(tenantId, userId);

      return ApiResponse.success(res, 200, 'Notifications retrieved successfully', notifications);
    } catch (error) {
      next(error);
    }
  }

  static async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.userId;
      const unread = await notificationService.getUnreadUserNotifications(tenantId, userId);

      return ApiResponse.success(res, 200, 'Unread count retrieved', { unreadCount: unread.length, notifications: unread });
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      const tenantId = req.user!.tenantId;
      const userId = req.user!.userId;
      await notificationService.markAsRead(id, tenantId, userId);

      return ApiResponse.success(res, 200, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  }

  static async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.userId;
      const count = await notificationService.markAllAsRead(tenantId, userId);

      return ApiResponse.success(res, 200, `${count} notifications marked as read`);
    } catch (error) {
      next(error);
    }
  }
}
