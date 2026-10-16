import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType =
  | 'LOW_STOCK'
  | 'PURCHASE_APPROVAL'
  | 'ORDER_DELIVERED'
  | 'PRODUCT_EXPIRING'
  | 'AI_RECOMMENDATION';

export type NotificationSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'WEBSOCKET';

export interface INotification extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  severity: NotificationSeverity;
  channels: NotificationChannel[];
  isRead: boolean;
  readAt?: Date;
  actionUrl?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const NotificationSchema: Schema<INotification> = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['LOW_STOCK', 'PURCHASE_APPROVAL', 'ORDER_DELIVERED', 'PRODUCT_EXPIRING', 'AI_RECOMMENDATION'],
      required: true
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    severity: { type: String, enum: ['INFO', 'WARNING', 'CRITICAL'], default: 'INFO' },
    channels: [{ type: String, enum: ['IN_APP', 'EMAIL', 'WEBSOCKET'] }],
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
    actionUrl: { type: String },
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationSchema.index({ tenantId: 1, userId: 1, isRead: 1, createdAt: -1 });

export const NotificationModel = mongoose.model<INotification>('Notification', NotificationSchema);
