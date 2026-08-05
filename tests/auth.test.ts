import { describe, it, expect, beforeAll } from '@jest/globals';
import { generateAccessToken, generateRefreshToken, verifyAccessToken } from '../src/utils/jwt.util.js';
import { hashPassword, comparePassword } from '../src/utils/password.util.js';

describe('1. Authentication & Security Unit Tests', () => {
  const mockUserPayload = {
    userId: 'user_123456789012345678901234',
    tenantId: 'tenant_123456789012345678901234',
    role: 'SUPER_ADMIN'
  };

  it('1.1 Should generate and verify valid JWT Access Token', () => {
    const token = generateAccessToken(mockUserPayload);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe(mockUserPayload.userId);
    expect(decoded.tenantId).toBe(mockUserPayload.tenantId);
    expect(decoded.role).toBe(mockUserPayload.role);
  });

  it('1.2 Should generate valid JWT Refresh Token', () => {
    const refreshToken = generateRefreshToken(mockUserPayload);
    expect(refreshToken).toBeDefined();
    expect(typeof refreshToken).toBe('string');
  });

  it('1.3 Should hash password with Bcrypt salt cost 12 and verify correctly', async () => {
    const rawPassword = 'SecureEnterprisePassword#2026';
    const hash = await hashPassword(rawPassword);

    expect(hash).not.toEqual(rawPassword);
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);

    const isValid = await comparePassword(rawPassword, hash);
    expect(isValid).toBe(true);

    const isInvalid = await comparePassword('WrongPassword', hash);
    expect(isInvalid).toBe(false);
  });
});
