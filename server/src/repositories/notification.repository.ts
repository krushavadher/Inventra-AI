import { NotificationModel, INotification } from '../models/notification.model.js';

export class NotificationRepository {
  async create(data: Partial<INotification>): Promise<INotification> {
    return NotificationModel.create(data);
  }

  async findUnreadByUser(tenantId: string, userId: string): Promise<INotification[]> {
    return NotificationModel.find({ tenantId, userId, isRead: false }).sort({ createdAt: -1 });
  }

  async findAllByUser(tenantId: string, userId: string, limit: number = 20): Promise<INotification[]> {
    return NotificationModel.find({ tenantId, userId }).sort({ createdAt: -1 }).limit(limit);
  }

  async markAsRead(id: string, tenantId: string, userId: string): Promise<boolean> {
    const res = await NotificationModel.updateOne(
      { _id: id, tenantId, userId },
      { isRead: true, readAt: new Date() }
    );
    return res.modifiedCount > 0;
  }

  async markAllAsRead(tenantId: string, userId: string): Promise<number> {
    const res = await NotificationModel.updateMany(
      { tenantId, userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    return res.modifiedCount;
  }
}
