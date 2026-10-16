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

export type MovementReason = 'sale' | 'damage' | 'return' | 'other';

export interface IStockMovement extends Document {
  tenantId: mongoose.Types.ObjectId;
  movementType: MovementType;
  productId: mongoose.Types.ObjectId;
  product?: mongoose.Types.ObjectId;
  warehouseId?: mongoose.Types.ObjectId;
  binCode?: string;
  batchNumber?: string;
  quantity: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceDocType?: 'PO' | 'SO' | 'STO' | 'CYCLE_COUNT' | 'MANUAL';
  referenceDocId?: string;
  reason: MovementReason | string;
  unitCost?: number;
  salePrice?: number;
  customer?: string;
  note?: string;
  date: Date;
  stockAdjusted: boolean;
  voided: boolean;
  voidedAt?: Date;
  isDemo: boolean;
  createdBy?: mongoose.Types.ObjectId;
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
    warehouseId: { type: Schema.Types.ObjectId, index: true },
    binCode: { type: String, default: 'BIN-DEFAULT' },
    batchNumber: { type: String, default: 'BATCH-DEFAULT' },
    quantity: { type: Number, required: true },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    referenceDocType: { type: String, enum: ['PO', 'SO', 'STO', 'CYCLE_COUNT', 'MANUAL'], default: 'MANUAL' },
    referenceDocId: { type: String },
    reason: {
      type: String,
      enum: ['sale', 'damage', 'return', 'other'],
      default: 'other',
      trim: true
    },
    unitCost: { type: Number, min: 0 },
    salePrice: { type: Number, min: 0 },
    customer: { type: String, trim: true },
    note: { type: String, trim: true },
    date: {
      type: Date,
      default: Date.now,
      validate: {
        validator: function (v: Date) {
          return !v || v.getTime() <= Date.now() + 60000; // allow up to 1 min clock skew
        },
        message: 'Effective date cannot be in the future'
      }
    },
    stockAdjusted: { type: Boolean, default: true },
    voided: { type: Boolean, default: false },
    voidedAt: { type: Date },
    isDemo: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Virtual alias 'product' for productId
StockMovementSchema.virtual('product')
  .get(function () {
    return this.productId;
  })
  .set(function (v) {
    this.productId = v;
  });

StockMovementSchema.index({ tenantId: 1, productId: 1, createdAt: -1 });
StockMovementSchema.index({ tenantId: 1, warehouseId: 1, createdAt: -1 });
StockMovementSchema.index({ productId: 1, date: -1 });
StockMovementSchema.index({ product: 1, date: -1 });
StockMovementSchema.index({ reason: 1, date: -1 });

export const StockMovementModel = mongoose.model<IStockMovement>('StockMovement', StockMovementSchema);

