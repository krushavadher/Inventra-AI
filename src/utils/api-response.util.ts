import { Response } from 'express';

export interface ApiResponseData<T> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: {
    totalRecords: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class ApiResponse {
  static success<T>(res: Response, statusCode: number, message: string, data?: T, pagination?: ApiResponseData<T>['pagination']) {
    return res.status(statusCode).json({
      success: true,
      message,
      ...(data !== undefined && { data }),
      ...(pagination && { pagination }),
      timestamp: new Date().toISOString()
    });
  }

  static error(res: Response, statusCode: number, message: string, errorCode?: string, errors?: any) {
    return res.status(statusCode).json({
      success: false,
      message,
      ...(errorCode && { errorCode }),
      ...(errors && { errors }),
      timestamp: new Date().toISOString()
    });
  }
}
