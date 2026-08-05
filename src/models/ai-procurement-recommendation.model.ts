import mongoose, { Document, Schema } from 'mongoose';

export type RecommendationStatus = 'PROPOSED' | 'DRAFT_PO_GENERATED' | 'APPROVED' | 'REJECTED';

export interface IAIProcurementRecommendation extends Document {
  tenantId: mongoose.Types.ObjectId;
  recommendationNumber: string; // e.g. REC-99104
  productId: mongoose.Types.ObjectId;
  warehouseId: mongoose.Types.ObjectId;
  recommendedQty: number;
  bestSupplierId: mongoose.Types.ObjectId;
  alternativeSupplierIds: mongoose.Types.ObjectId[];
  expectedDeliveryDate: Date;
  inventoryCoverageDays: number; // expected days of supply
  estimatedCostAmount: number;
  procurementRisks: string[];
  reasoningMarkdown: string;
  status: RecommendationStatus;
  generatedDraftPoId?: mongoose.Types.ObjectId;
  reviewedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AIProcurementRecommendationSchema: Schema<IAIProcurementRecommendation> = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    recommendationNumber: { type: String, required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    recommendedQty: { type: Number, required: true, min: 1 },
    bestSupplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    alternativeSupplierIds: [{ type: Schema.Types.ObjectId, ref: 'Supplier' }],
    expectedDeliveryDate: { type: Date, required: true },
    inventoryCoverageDays: { type: Number, required: true },
    estimatedCostAmount: { type: Number, required: true },
    procurementRisks: [{ type: String }],
    reasoningMarkdown: { type: String, required: true },
    status: { type: String, enum: ['PROPOSED', 'DRAFT_PO_GENERATED', 'APPROVED', 'REJECTED'], default: 'PROPOSED' },
    generatedDraftPoId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

AIProcurementRecommendationSchema.index({ tenantId: 1, recommendationNumber: 1 }, { unique: true });

export const AIProcurementRecommendationModel = mongoose.model<IAIProcurementRecommendation>(
  'AIProcurementRecommendation',
  AIProcurementRecommendationSchema
);
