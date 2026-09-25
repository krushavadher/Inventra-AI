import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth.service.js';
import { ApiResponse } from '../utils/api-response.util.js';
import { UserRole } from '../enums/user-role.enum.js';

const authService = new AuthService();

// Zod Validation Schemas
const registerSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  tenantSlug: z.string().optional().default('inventra-default'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.nativeEnum(UserRole).optional()
});

const loginSchema = z.object({
  tenantSlug: z.string().optional().default('inventra-default'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const forgotPasswordSchema = z.object({
  tenantSlug: z.string().optional().default('inventra-default'),
  email: z.string().email('Invalid email address')
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters')
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required')
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Old password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters')
});

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = registerSchema.parse(req.body);
      const result = await authService.register(validatedData);

      // Set HTTP-Only Cookie for Refresh Token
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      return ApiResponse.success(res, 201, 'User registered successfully', {
        user: result.user,
        tokens: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken
        },
        accessToken: result.accessToken,
        emailVerificationToken: result.emailVerificationToken
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = loginSchema.parse(req.body);
      const result = await authService.login(validatedData);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return ApiResponse.success(res, 200, 'Login successful', {
        user: result.user,
        tokens: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken
        },
        accessToken: result.accessToken
      });
    } catch (error) {
      next(error);
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      if (!rawRefreshToken) {
        return ApiResponse.error(res, 401, 'Refresh token missing', 'TOKEN_MISSING');
      }

      const result = await authService.refreshAccessToken(rawRefreshToken);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return ApiResponse.success(res, 200, 'Access token refreshed', {
        accessToken: result.accessToken
      });
    } catch (error) {
      next(error);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = forgotPasswordSchema.parse(req.body);
      const result = await authService.forgotPassword(validatedData.tenantSlug, validatedData.email);

      return ApiResponse.success(res, 200, 'If an account exists, a password reset email has been sent.', result);
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = resetPasswordSchema.parse(req.body);
      const result = await authService.resetPassword(validatedData.token, validatedData.newPassword);

      return ApiResponse.success(res, 200, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = verifyEmailSchema.parse(req.body);
      const result = await authService.verifyEmail(validatedData.token);

      return ApiResponse.success(res, 200, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = changePasswordSchema.parse(req.body);
      const userId = req.user!.userId;
      const result = await authService.changePassword(userId, validatedData.oldPassword, validatedData.newPassword);

      res.clearCookie('refreshToken');
      return ApiResponse.success(res, 200, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const profile = await authService.getProfile(userId);

      return ApiResponse.success(res, 200, 'Profile retrieved successfully', profile);
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      const result = await authService.logout(rawRefreshToken || '');

      res.clearCookie('refreshToken');
      return ApiResponse.success(res, 200, result.message || 'Logged out successfully');
    } catch (error) {
      res.clearCookie('refreshToken');
      return ApiResponse.success(res, 200, 'Logged out successfully');
    }
  }
}
