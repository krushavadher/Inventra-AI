import mongoose, { Document, Schema } from 'mongoose';

export interface ISupplierContact {
  primaryName: string;
  email: string;
  phone: string;
  designation?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
}

export interface ISupplierLeadTime {
  defaultDays: number;
  minDays: number;
  maxDays: number;
  avgVarianceDays: number;
}

export interface ISupplierPerformance {
  otifScore: number; // On-Time In-Full score (0 to 100)
  defectRatePercent: number; // 0 to 100
  totalOrdersCompleted: number;
  totalSpendAmount: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ISupplierDocument {
  title: string;
  fileUrl: string;
  type: 'CONTRACT' | 'TAX_CERTIFICATE' | 'SLA' | 'OTHER';
  expiryDate?: Date;
  uploadedAt: Date;
}

export interface ISupplier extends Document {
  tenantId: mongoose.Types.ObjectId;
  code: string; // e.g. SUP-8810
  name: string;
  taxId?: string;
  categories: string[];
  contact: ISupplierContact;
  paymentTerms: 'NET_15' | 'NET_30' | 'NET_60' | 'DUE_ON_RECEIPT';
  leadTime: ISupplierLeadTime;
  performance: ISupplierPerformance;
  documents: ISupplierDocument[];
  status: 'ACTIVE' | 'UNDER_REVIEW' | 'INACTIVE';
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema: Schema<ISupplier> = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    taxId: { type: String, trim: true },
    categories: [{ type: String }],
    contact: {
      primaryName: { type: String, required: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, required: true },
      designation: { type: String },
      address: {
        street: { type: String },
        city: { type: String },
        state: { type: String },
        country: { type: String },
        postalCode: { type: String }
      }
    },
    paymentTerms: { type: String, enum: ['NET_15', 'NET_30', 'NET_60', 'DUE_ON_RECEIPT'], default: 'NET_30' },
    leadTime: {
      defaultDays: { type: Number, required: true, default: 7, min: 1 },
      minDays: { type: Number, default: 3 },
      maxDays: { type: Number, default: 14 },
      avgVarianceDays: { type: Number, default: 0 }
    },
    performance: {
      otifScore: { type: Number, default: 95.0, min: 0, max: 100 },
      defectRatePercent: { type: Number, default: 0.5, min: 0, max: 100 },
      totalOrdersCompleted: { type: Number, default: 0 },
      totalSpendAmount: { type: Number, default: 0 },
      riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'LOW' }
    },
    documents: [
      {
        title: { type: String, required: true },
        fileUrl: { type: String, required: true },
        type: { type: String, enum: ['CONTRACT', 'TAX_CERTIFICATE', 'SLA', 'OTHER'], default: 'CONTRACT' },
        expiryDate: { type: Date },
        uploadedAt: { type: Date, default: Date.now }
      }
    ],
    status: { type: String, enum: ['ACTIVE', 'UNDER_REVIEW', 'INACTIVE'], default: 'ACTIVE' },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date }
  },
  { timestamps: true }
);

SupplierSchema.index({ tenantId: 1, code: 1 }, { unique: true });

export const SupplierModel = mongoose.model<ISupplier>('Supplier', SupplierSchema);
