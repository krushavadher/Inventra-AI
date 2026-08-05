import mongoose, { Document, Schema } from 'mongoose';

export interface IStockTransferItem {
  productId: mongoose.Types.ObjectId;
  quantity: number;
  batchNumber?: string;
}

export interface IStockTransfer extends Document {
  tenantId: mongoose.Types.ObjectId;
  transferNumber: string;
  fromWarehouseId: mongoose.Types.ObjectId;
  toWarehouseId: mongoose.Types.ObjectId;
  items: IStockTransferItem[];
  status: 'PENDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
  createdBy: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StockTransferSchema: Schema<IStockTransfer> = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    transferNumber: { type: String, required: true },
    fromWarehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    toWarehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true, min: 1 },
        batchNumber: { type: String }
      }
    ],
    status: { type: String, enum: ['PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'], default: 'PENDING' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String }
  },
  { timestamps: true }
);

StockTransferSchema.index({ tenantId: 1, transferNumber: 1 }, { unique: true });

export const StockTransferModel = mongoose.model<IStockTransfer>('StockTransfer', StockTransferSchema);
