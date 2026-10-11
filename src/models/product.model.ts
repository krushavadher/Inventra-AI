import mongoose, { Document, Schema } from 'mongoose';

export interface IProductImage {
  url: string;
  isPrimary: boolean;
  altText?: string;
}

export interface IProductPricing {
  unitCost: number;
  sellingPrice: number;
  wholesalePrice?: number;
  taxRate: number; // percentage e.g. 18 for 18%
  taxCode?: string; // HSN / SAC Code
}

export interface IProductPhysicalDimensions {
  weight: number;
  weightUom: 'KG' | 'G' | 'LB' | 'OZ';
  length: number;
  width: number;
  height: number;
  dimensionUom: 'CM' | 'M' | 'IN' | 'FT';
}

export interface IProduct extends Document {
  tenantId: mongoose.Types.ObjectId;
  sku: string;
  name: string;
  description?: string;
  categoryId?: mongoose.Types.ObjectId;
  barcode: string;
  qrCode: string;
  images: IProductImage[];
  pricing: IProductPricing;
  physicalDimensions?: IProductPhysicalDimensions;
  supplier?: string;
  abcClass: 'A' | 'B' | 'C';
  status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema<IProduct> = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    sku: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', index: true },
    barcode: { type: String, required: true, index: true },
    qrCode: { type: String, required: true },
    images: [
      {
        url: { type: String, required: true },
        isPrimary: { type: Boolean, default: false },
        altText: { type: String }
      }
    ],
    pricing: {
      unitCost: { type: Number, required: true, min: 0 },
      sellingPrice: { type: Number, required: true, min: 0 },
      wholesalePrice: { type: Number, min: 0 },
      taxRate: { type: Number, default: 0, min: 0 },
      taxCode: { type: String, trim: true }
    },
    physicalDimensions: {
      weight: { type: Number, default: 0, min: 0 },
      weightUom: { type: String, enum: ['KG', 'G', 'LB', 'OZ'], default: 'KG' },
      length: { type: Number, default: 0, min: 0 },
      width: { type: Number, default: 0, min: 0 },
      height: { type: Number, default: 0, min: 0 },
      dimensionUom: { type: String, enum: ['CM', 'M', 'IN', 'FT'], default: 'CM' }
    },
    supplier: { type: String, trim: true },
    abcClass: { type: String, enum: ['A', 'B', 'C'], default: 'B' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'DISCONTINUED'], default: 'ACTIVE' },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date }
  },
  { timestamps: true }
);

// Indexes
ProductSchema.index({ tenantId: 1, sku: 1 }, { unique: true });
ProductSchema.index({ tenantId: 1, barcode: 1 });
ProductSchema.index({ name: 'text', sku: 'text', description: 'text', barcode: 'text' });

export const ProductModel = mongoose.model<IProduct>('Product', ProductSchema);
