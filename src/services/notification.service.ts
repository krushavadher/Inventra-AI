import { NotificationRepository } from '../repositories/notification.repository.js';
import { NotificationType, NotificationSeverity, NotificationChannel } from '../models/notification.model.js';

export interface DispatchNotificationDTO {
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  severity?: NotificationSeverity;
  channels?: NotificationChannel[];
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export class NotificationService {
  private notificationRepo = new NotificationRepository();

  /**
   * Primary Multi-Channel Dispatcher
   */
  async dispatch(dto: DispatchNotificationDTO) {
    const channels = dto.channels || ['IN_APP', 'EMAIL', 'WEBSOCKET'];
    const severity = dto.severity || 'INFO';

    // 1. In-App Notification Entry
    const notification = await this.notificationRepo.create({
      tenantId: dto.tenantId as any,
      userId: dto.userId as any,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      severity,
      channels,
      isRead: false,
      actionUrl: dto.actionUrl,
      metadata: dto.metadata
    });

    // 2. Email Channel (Simulated Nodemailer / SendGrid Transporter)
    if (channels.includes('EMAIL')) {
      this.sendEmailNotification(dto.title, dto.message, severity);
    }

    // 3. Real-time WebSocket Channel (Emits to WebSocket client socket pool)
    if (channels.includes('WEBSOCKET')) {
      this.emitRealtimeSocketEvent(dto.userId, notification);
    }

    return notification;
  }

  private sendEmailNotification(subject: string, body: string, severity: NotificationSeverity) {
    // In production, uses nodemailer.sendMail({ from: 'alerts@inventra.ai', to: userEmail, subject, html: ... })
    console.log(`📧 [EMAIL DISPATCH] [${severity}] Subject: ${subject} | Body: ${body}`);
  }

  private emitRealtimeSocketEvent(userId: string, notification: any) {
    // In production, emits via io.to(userId).emit('notification:new', notification)
    console.log(`⚡ [WEBSOCKET REALTIME] Pushed notification to User ${userId}: ${notification.title}`);
  }

  // --- Specific Event Triggers --- //

  async triggerLowStockAlert(tenantId: string, userId: string, sku: string, availableQty: number, minSafetyStock: number) {
    return this.dispatch({
      tenantId,
      userId,
      type: 'LOW_STOCK',
      title: `Critical Stockout Alert: ${sku}`,
      message: `Product SKU ${sku} is at ${availableQty} units available, breaching the safety threshold of ${minSafetyStock} units.`,
      severity: 'CRITICAL',
      channels: ['IN_APP', 'EMAIL', 'WEBSOCKET'],
      actionUrl: `/inventory?sku=${sku}`
    });
  }

  async triggerPurchaseApprovalAlert(tenantId: string, userId: string, poNumber: string, totalAmount: number) {
    return this.dispatch({
      tenantId,
      userId,
      type: 'PURCHASE_APPROVAL',
      title: `PO Approval Required: ${poNumber}`,
      message: `Purchase Order ${poNumber} for $${totalAmount.toLocaleString()} requires your executive sign-off.`,
      severity: 'WARNING',
      channels: ['IN_APP', 'EMAIL', 'WEBSOCKET'],
      actionUrl: `/procurement/purchase-orders?po=${poNumber}`
    });
  }

  async triggerOrderDeliveredAlert(tenantId: string, userId: string, poNumber: string, grnNumber: string) {
    return this.dispatch({
      tenantId,
      userId,
      type: 'ORDER_DELIVERED',
      title: `Inbound Shipment Received: ${grnNumber}`,
      message: `Goods receipt note ${grnNumber} for ${poNumber} was received at dock and inventory stock levels updated.`,
      severity: 'INFO',
      channels: ['IN_APP', 'WEBSOCKET'],
      actionUrl: `/procurement/grn/${grnNumber}`
    });
  }

  async triggerProductExpiringAlert(tenantId: string, userId: string, sku: string, expiryDate: Date) {
    return this.dispatch({
      tenantId,
      userId,
      type: 'PRODUCT_EXPIRING',
      title: `Product Expiry Warning: ${sku}`,
      message: `Batch for SKU ${sku} is scheduled to expire on ${expiryDate.toLocaleDateString()}. Quarantine review advised.`,
      severity: 'WARNING',
      channels: ['IN_APP', 'EMAIL'],
      actionUrl: `/inventory/alerts/expired`
    });
  }

  async triggerAIRecommendationAlert(tenantId: string, userId: string, recNumber: string, sku: string) {
    return this.dispatch({
      tenantId,
      userId,
      type: 'AI_RECOMMENDATION',
      title: `AI Procurement Advice: ${recNumber}`,
      message: `Senior AI Procurement Manager generated a purchasing recommendation & draft PO for ${sku}.`,
      severity: 'INFO',
      channels: ['IN_APP', 'WEBSOCKET'],
      actionUrl: `/ai-procurement`
    });
  }

  // --- Read & Fetch Methods --- //

  async getUserNotifications(tenantId: string, userId: string) {
    return this.notificationRepo.findAllByUser(tenantId, userId);
  }

  async getUnreadUserNotifications(tenantId: string, userId: string) {
    return this.notificationRepo.findUnreadByUser(tenantId, userId);
  }

  async markAsRead(id: string, tenantId: string, userId: string) {
    return this.notificationRepo.markAsRead(id, tenantId, userId);
  }

  async markAllAsRead(tenantId: string, userId: string) {
    return this.notificationRepo.markAllAsRead(tenantId, userId);
  }
}
