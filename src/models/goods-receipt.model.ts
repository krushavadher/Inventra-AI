import mongoose, { Document, Schema } from 'mongoose';

export interface IGRNItem {
  productId: mongoose.Types.ObjectId;
  orderedQty: number;
  receivedQty: number;
  rejectedQty: number;
  binCode: string;
  batchNumber?: string;
  expiryDate?: Date;
}

export interface IGoodsReceiptNote extends Document {
  tenantId: mongoose.Types.ObjectId;
  grnNumber: string; // e.g. GRN-99104
  poId: mongoose.Types.ObjectId;
  warehouseId: mongoose.Types.ObjectId;
  receivedItems: IGRNItem[];
  receivedBy: mongoose.Types.ObjectId;
  receivedAt: Date;
  notes?: string;
}

const GRNItemSchema = new Schema<IGRNItem>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  orderedQty: { type: Number, required: true },
  receivedQty: { type: Number, required: true, min: 0 },
  rejectedQty: { type: Number, default: 0, min: 0 },
  binCode: { type: String, default: 'BIN-DEFAULT' },
  batchNumber: { type: String, default: 'BATCH-DEFAULT' },
  expiryDate: { type: Date }
});

const GoodsReceiptSchema: Schema<IGoodsReceiptNote> = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    grnNumber: { type: String, required: true },
    poId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true, index: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    receivedItems: [GRNItemSchema],
    receivedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receivedAt: { type: Date, default: Date.now },
    notes: { type: String }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

GoodsReceiptSchema.index({ tenantId: 1, grnNumber: 1 }, { unique: true });

export const GoodsReceiptModel = mongoose.model<IGoodsReceiptNote>('GoodsReceiptNote', GoodsReceiptSchema);
