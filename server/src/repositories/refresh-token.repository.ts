import { RefreshTokenModel, IRefreshToken } from '../models/refresh-token.model.js';

export class RefreshTokenRepository {
  async create(data: Partial<IRefreshToken>): Promise<IRefreshToken> {
    return RefreshTokenModel.create(data);
  }

  async findByHash(tokenHash: string): Promise<IRefreshToken | null> {
    return RefreshTokenModel.findOne({ tokenHash, isRevoked: false });
  }

  async revoke(tokenHash: string): Promise<void> {
    await RefreshTokenModel.updateOne({ tokenHash }, { isRevoked: true });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await RefreshTokenModel.updateMany({ userId }, { isRevoked: true });
  }
}
