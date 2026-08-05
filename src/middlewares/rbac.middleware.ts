import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../enums/user-role.enum.js';
import { AppError } from '../utils/app-error.util.js';

export const authorizeRoles = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('User authentication context missing', 401, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access forbidden: Role '${req.user.role}' does not have sufficient permissions`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
};
