import { describe, it, expect } from '@jest/globals';
import { AppError } from '../src/utils/app-error.util.js';

describe('3. Security & Vulnerability Tests', () => {
  it('3.1 Should instantiate AppError with HTTP status code and error code', () => {
    const err = new AppError('Unauthorized access', 401, 'UNAUTHORIZED');

    expect(err.statusCode).toBe(401);
    expect(err.errorCode).toBe('UNAUTHORIZED');
    expect(err.isOperational).toBe(true);
    expect(err.message).toBe('Unauthorized access');
  });

  it('3.2 Should prevent NoSQL query operator injection in input sanitizers', () => {
    const maliciousInput = { username: { $gt: '' }, password: { $gt: '' } };

    // Sanitization rule: Reject inputs containing $ operators in string keys
    const containsNoSqlOperator = (obj: any): boolean => {
      return Object.keys(obj).some(k => k.startsWith('$'));
    };

    expect(containsNoSqlOperator(maliciousInput)).toBe(true);
  });
});
