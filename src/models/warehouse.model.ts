import mongoose, { Document, Schema } from 'mongoose';

export interface IBin {
  binCode: string; // e.g. A-04-3-B
  maxVolumeCubicMeters: number;
  currentVolumeUsed: number;
  maxWeightKg: number;
  currentWeightUsed: number;
  isLocked: boolean;
  status: 'EMPTY' | 'PARTIAL' | 'FULL' | 'QUARANTINE';
}

export interface IShelf {
  shelfCode: string;
  bins: IBin[];
}

export interface IRack {
  rackCode: string;
  shelves: IShelf[];
}

export interface IAisle {
  aisleCode: string;
  racks: IRack[];
}

export interface IZone {
  zoneCode: string; // e.g. ZONE-A
  name: string;
  type: 'RECEIVING' | 'STORAGE' | 'PICKING' | 'COLD_STORAGE' | 'QUARANTINE' | 'DISPATCH';
  tempControlCelsius?: number;
  aisles: IAisle[];
}

export interface IWarehouse extends Document {
  tenantId: mongoose.Types.ObjectId;
  code: string; // e.g. WH-EAST-01
  name: string;
  type: 'DISTRIBUTION_CENTER' | 'REGIONAL_HUB' | 'RETAIL_STORE' | 'COLD_STORAGE';
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  totalCapacityVolume: number; // in m^3
  totalCapacityWeight: number; // in kg
  zones: IZone[];
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BinSchema = new Schema<IBin>({
  binCode: { type: String, required: true },
  maxVolumeCubicMeters: { type: Number, default: 5 },
  currentVolumeUsed: { type: Number, default: 0 },
  maxWeightKg: { type: Number, default: 1000 },
  currentWeightUsed: { type: Number, default: 0 },
  isLocked: { type: Boolean, default: false },
  status: { type: String, enum: ['EMPTY', 'PARTIAL', 'FULL', 'QUARANTINE'], default: 'EMPTY' }
});

const ShelfSchema = new Schema<IShelf>({
  shelfCode: { type: String, required: true },
  bins: [BinSchema]
});

const RackSchema = new Schema<IRack>({
  rackCode: { type: String, required: true },
  shelves: [ShelfSchema]
});

const AisleSchema = new Schema<IAisle>({
  aisleCode: { type: String, required: true },
  racks: [RackSchema]
});

const ZoneSchema = new Schema<IZone>({
  zoneCode: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['RECEIVING', 'STORAGE', 'PICKING', 'COLD_STORAGE', 'QUARANTINE', 'DISPATCH'], required: true },
  tempControlCelsius: { type: Number },
  aisles: [AisleSchema]
});

const WarehouseSchema: Schema<IWarehouse> = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['DISTRIBUTION_CENTER', 'REGIONAL_HUB', 'RETAIL_STORE', 'COLD_STORAGE'], default: 'DISTRIBUTION_CENTER' },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, required: true },
      postalCode: { type: String, required: true },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number }
      }
    },
    totalCapacityVolume: { type: Number, required: true, min: 0, default: 10000 },
    totalCapacityWeight: { type: Number, required: true, min: 0, default: 500000 },
    zones: [ZoneSchema],
    status: { type: String, enum: ['ACTIVE', 'MAINTENANCE', 'INACTIVE'], default: 'ACTIVE' },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date }
  },
  { timestamps: true }
);

WarehouseSchema.index({ tenantId: 1, code: 1 }, { unique: true });

export const WarehouseModel = mongoose.model<IWarehouse>('Warehouse', WarehouseSchema);
