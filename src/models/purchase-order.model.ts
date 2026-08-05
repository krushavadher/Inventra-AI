import mongoose, { Document, Schema } from 'mongoose';

export type POStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'ISSUED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED';

export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'DISCREPANCY';
export type MatchStatus = 'PENDING' | 'MATCHED' | 'DISCREPANCY_FLAGGED';

export interface IPOLineItem {
  productId: mongoose.Types.ObjectId;
  orderedQty: number;
  receivedQty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface IPurchaseOrder extends Document {
  tenantId: mongoose.Types.ObjectId;
  poNumber: string; // e.g. PO-88401
  supplierId: mongoose.Types.ObjectId;
  warehouseId: mongoose.Types.ObjectId;
  status: POStatus;
  approvalWorkflow: {
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    rejectionReason?: string;
  };
  lineItems: IPOLineItem[];
  totalAmount: number;
  paymentStatus: PaymentStatus;
  matchStatus: MatchStatus;
  expectedDeliveryDate: Date;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const POLineItemSchema = new Schema<IPOLineItem>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  orderedQty: { type: Number, required: true, min: 1 },
  receivedQty: { type: Number, default: 0, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
  lineTotal: { type: Number, required: true, min: 0 }
});

const PurchaseOrderSchema: Schema<IPurchaseOrder> = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    poNumber: { type: String, required: true, uppercase: true, trim: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ISSUED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
      default: 'DRAFT'
    },
    approvalWorkflow: {
      approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      approvedAt: { type: Date },
      rejectionReason: { type: String }
    },
    lineItems: [POLineItemSchema],
    totalAmount: { type: Number, required: true, min: 0 },
    paymentStatus: { type: String, enum: ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'DISCREPANCY'], default: 'UNPAID' },
    matchStatus: { type: String, enum: ['PENDING', 'MATCHED', 'DISCREPANCY_FLAGGED'], default: 'PENDING' },
    expectedDeliveryDate: { type: Date, required: true },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date }
  },
  { timestamps: true }
);

PurchaseOrderSchema.index({ tenantId: 1, poNumber: 1 }, { unique: true });

export const PurchaseOrderModel = mongoose.model<IPurchaseOrder>('PurchaseOrder', PurchaseOrderSchema);
