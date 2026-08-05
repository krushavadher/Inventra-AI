import mongoose, { Document, Schema } from 'mongoose';
import { UserRole } from '../enums/user-role.enum.js';

export interface IUser extends Document {
  tenantId: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  assignedWarehouses: mongoose.Types.ObjectId[];
  status: 'INVITED' | 'ACTIVE' | 'SUSPENDED';
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    role: { type: String, enum: Object.values(UserRole), default: UserRole.PROCUREMENT_MANAGER },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    emailVerificationExpires: { type: Date },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
    assignedWarehouses: [{ type: Schema.Types.ObjectId, ref: 'Warehouse' }],
    status: { type: String, enum: ['INVITED', 'ACTIVE', 'SUSPENDED'], default: 'ACTIVE' },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date }
  },
  { timestamps: true }
);

// Compound Index to enforce unique email per tenant
UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });

export const UserModel = mongoose.model<IUser>('User', UserSchema);
