import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.config.js';
import { UserRole } from '../enums/user-role.enum.js';

export interface JwtPayload {
  userId: string;
  tenantId: string;
  role: UserRole;
}

export class JwtUtil {
  static generateAccessToken(payload: JwtPayload): string {
    const options: SignOptions = {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as any
    };
    return jwt.sign(payload, env.JWT_ACCESS_SECRET as Secret, options);
  }

  static generateRefreshToken(payload: JwtPayload): string {
    const options: SignOptions = {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as any
    };
    return jwt.sign(payload, env.JWT_REFRESH_SECRET as Secret, options);
  }

  static verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_ACCESS_SECRET as Secret) as JwtPayload;
  }

  static verifyRefreshToken(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_REFRESH_SECRET as Secret) as JwtPayload;
  }
}
