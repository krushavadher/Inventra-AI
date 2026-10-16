import mongoose, { Document, Schema } from 'mongoose';

export type UserRoleType = 'admin' | 'manager' | 'staff';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRoleType;
  company?: string;
  createdAt: Date;
  // Compatibility fields for existing ecosystem scripts
  tenantId?: mongoose.Types.ObjectId;
  firstName?: string;
  lastName?: string;
  passwordHash?: string;
  isDeleted?: boolean;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'manager', 'staff'], default: 'admin' },
    company: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
    // Compatibility fields
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant' },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    passwordHash: { type: String },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: false }
);


export const UserModel = (mongoose.models.User as mongoose.Model<IUser>) || mongoose.model<IUser>('User', UserSchema);
export const User = UserModel;
export default UserModel;
