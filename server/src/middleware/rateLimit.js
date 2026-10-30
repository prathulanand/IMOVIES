import rateLimit from 'express-rate-limit';
import { MESSAGES, MACHINE_CODES } from '../constants/messages.js';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: MESSAGES.RATE_LIMIT_EXCEEDED,
    code: MACHINE_CODES.RATE_LIMIT,
  },
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: MESSAGES.RATE_LIMIT_EXCEEDED,
    code: MACHINE_CODES.RATE_LIMIT,
  },
});

export const holdLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: MESSAGES.RATE_LIMIT_EXCEEDED,
    code: MACHINE_CODES.RATE_LIMIT,
  },
});
