import mongoose, { Document, Schema } from 'mongoose';

export interface IInventoryLevel extends Document {
  tenantId: mongoose.Types.ObjectId;
  warehouseId: mongoose.Types.ObjectId;
  binCode: string;
  productId: mongoose.Types.ObjectId;
  batchNumber: string;
  expiryDate?: Date;
  quantityOnHand: number;
  quantityCommitted: number;
  quantityAvailable: number;
  minSafetyStock: number;
  reorderPoint: number;
  status: 'SALABLE' | 'DAMAGED' | 'EXPIRED' | 'QUARANTINE';
  createdAt: Date;
  updatedAt: Date;
}

const InventoryLevelSchema: Schema<IInventoryLevel> = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
    binCode: { type: Schema.Types.ObjectId ? String : String, required: true, trim: true, default: 'BIN-DEFAULT' },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    batchNumber: { type: String, default: 'BATCH-DEFAULT', trim: true },
    expiryDate: { type: Date },
    quantityOnHand: { type: Number, required: true, min: 0, default: 0 },
    quantityCommitted: { type: Number, required: true, min: 0, default: 0 },
    quantityAvailable: { type: Number, required: true, min: 0, default: 0 },
    minSafetyStock: { type: Number, default: 10, min: 0 },
    reorderPoint: { type: Number, default: 25, min: 0 },
    status: { type: String, enum: ['SALABLE', 'DAMAGED', 'EXPIRED', 'QUARANTINE'], default: 'SALABLE' }
  },
  { timestamps: true }
);

// High-throughput query compound index
InventoryLevelSchema.index({ tenantId: 1, warehouseId: 1, productId: 1, binCode: 1, batchNumber: 1 }, { unique: true });
InventoryLevelSchema.index({ tenantId: 1, quantityAvailable: 1 });
InventoryLevelSchema.index({ tenantId: 1, expiryDate: 1 });

export const InventoryLevelModel = mongoose.model<IInventoryLevel>('InventoryLevel', InventoryLevelSchema);
