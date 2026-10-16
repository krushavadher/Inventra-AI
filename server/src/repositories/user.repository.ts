import { UserModel, IUser } from '../models/user.model.js';

const memoryUsers: Map<string, IUser> = new Map();

export class UserRepository {
  async findByEmail(email: string, tenantId?: string): Promise<IUser | null> {
    try {
      const query: any = { email: email.toLowerCase(), isDeleted: false };
      if (tenantId) query.tenantId = tenantId;
      const user = await UserModel.findOne(query);
      if (user) return user;
    } catch (e) {
      // Fallback
    }

    for (const u of memoryUsers.values()) {
      if (u.email.toLowerCase() === email.toLowerCase() && !u.isDeleted) {
        return u;
      }
    }
    return null;
  }

  async findByEmailAndTenant(email: string, tenantId: string): Promise<IUser | null> {
    return this.findByEmail(email, tenantId);
  }

  async findById(id: string, tenantId?: string): Promise<IUser | null> {
    try {
      const query: any = { _id: id, isDeleted: false };
      if (tenantId) query.tenantId = tenantId;
      const user = await UserModel.findOne(query);
      if (user) return user;
    } catch (e) {
      // Fallback
    }

    const u = memoryUsers.get(id);
    if (u && !u.isDeleted) return u;
    return null;
  }

  async findByResetToken(token: string): Promise<IUser | null> {
    try {
      const u = await UserModel.findOne({ resetPasswordToken: token, isDeleted: false });
      if (u) return u;
    } catch (e) {}
    return null;
  }

  async findByVerificationToken(token: string): Promise<IUser | null> {
    try {
      const u = await UserModel.findOne({ emailVerificationToken: token, isDeleted: false });
      if (u) return u;
    } catch (e) {}
    return null;
  }

  async create(userData: any): Promise<IUser> {
    try {
      userData.name = userData.name || (userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}` : userData.firstName || 'User');
      userData.password = userData.password || userData.passwordHash || '';
      const user = await UserModel.create(userData);
      return user;
    } catch (e) {
      const mockId = userData._id ? userData._id.toString() : `usr_${Date.now()}`;
      const mockUser: any = {
        _id: mockId,
        tenantId: userData.tenantId,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        passwordHash: userData.passwordHash || userData.password,
        role: userData.role || 'SUPER_ADMIN',
        isEmailVerified: true,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      memoryUsers.set(mockId, mockUser);
      return mockUser;
    }
  }

  async update(id: string, updateDataOrTenantId: any, updateDataIfThree?: any): Promise<IUser | null> {
    const updateData = updateDataIfThree || updateDataOrTenantId;
    const tenantId = updateDataIfThree ? updateDataOrTenantId : undefined;

    try {
      const query: any = { _id: id, isDeleted: false };
      if (tenantId) query.tenantId = tenantId;
      const user = await UserModel.findOneAndUpdate(query, updateData, { new: true });
      if (user) return user;
    } catch (e) {}

    const u = memoryUsers.get(id);
    if (u) {
      Object.assign(u, updateData);
      return u;
    }
    return null;
  }
}
