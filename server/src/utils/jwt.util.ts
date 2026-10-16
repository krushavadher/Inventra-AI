import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.config.js';

export interface JwtPayload {
  userId: string;
  id?: string;
  email?: string;
  tenantId: string;
  role: any;
}

export class JwtUtil {
  static generateToken(payload: JwtPayload): string {
    const secret = (env.JWT_SECRET || env.JWT_ACCESS_SECRET) as Secret;
    const options: SignOptions = {
      expiresIn: (env.JWT_EXPIRES_IN || '7d') as any
    };
    return jwt.sign(payload, secret, options);
  }

  static verifyToken(token: string): JwtPayload {
    const secret = (env.JWT_SECRET || env.JWT_ACCESS_SECRET) as Secret;
    return jwt.verify(token, secret) as JwtPayload;
  }

  static generateAccessToken(payload: JwtPayload): string {
    const options: SignOptions = {
      expiresIn: (env.JWT_EXPIRES_IN || env.JWT_ACCESS_EXPIRES_IN || '7d') as any
    };
    const secret = (env.JWT_SECRET || env.JWT_ACCESS_SECRET) as Secret;
    return jwt.sign(payload, secret, options);
  }

  static generateRefreshToken(payload: JwtPayload): string {
    const options: SignOptions = {
      expiresIn: (env.JWT_REFRESH_EXPIRES_IN || '7d') as any
    };
    return jwt.sign(payload, env.JWT_REFRESH_SECRET as Secret, options);
  }

  static verifyAccessToken(token: string): JwtPayload {
    try {
      const secret = (env.JWT_SECRET || env.JWT_ACCESS_SECRET) as Secret;
      return jwt.verify(token, secret) as JwtPayload;
    } catch {
      return jwt.verify(token, env.JWT_ACCESS_SECRET as Secret) as JwtPayload;
    }
  }

  static verifyRefreshToken(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_REFRESH_SECRET as Secret) as JwtPayload;
  }
}
