import mongoose, { Document, Schema } from 'mongoose';

export type MovementType =
  | 'STOCK_IN'
  | 'STOCK_OUT'
  | 'ADJUSTMENT_ADD'
  | 'ADJUSTMENT_REMOVE'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'EXPIRED_QUARANTINE'
  | 'DAMAGED_SCRAP';

export interface IStockMovement extends Document {
  tenantId: mongoose.Types.ObjectId;
  movementType: MovementType;
  productId: mongoose.Types.ObjectId;
  warehouseId: mongoose.Types.ObjectId;
  binCode: string;
  batchNumber?: string;
  quantity: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceDocType?: 'PO' | 'SO' | 'STO' | 'CYCLE_COUNT' | 'MANUAL';
  referenceDocId?: string;
  reason?: string;
  performedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const StockMovementSchema: Schema<IStockMovement> = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    movementType: {
      type: String,
      enum: [
        'STOCK_IN',
        'STOCK_OUT',
        'ADJUSTMENT_ADD',
        'ADJUSTMENT_REMOVE',
        'TRANSFER_OUT',
        'TRANSFER_IN',
        'EXPIRED_QUARANTINE',
        'DAMAGED_SCRAP'
      ],
      required: true
    },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
    binCode: { type: String, required: true },
    batchNumber: { type: String, default: 'BATCH-DEFAULT' },
    quantity: { type: Number, required: true },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    referenceDocType: { type: String, enum: ['PO', 'SO', 'STO', 'CYCLE_COUNT', 'MANUAL'], default: 'MANUAL' },
    referenceDocId: { type: String },
    reason: { type: String, trim: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

StockMovementSchema.index({ tenantId: 1, productId: 1, createdAt: -1 });
StockMovementSchema.index({ tenantId: 1, warehouseId: 1, createdAt: -1 });

export const StockMovementModel = mongoose.model<IStockMovement>('StockMovement', StockMovementSchema);
