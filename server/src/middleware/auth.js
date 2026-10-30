import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { MESSAGES, MACHINE_CODES } from '../constants/messages.js';
import { USER_STATUS } from '../constants/enums.js';

export async function requireAuth(req, res, next) {
  try {
    let token = req.cookies?.token;

    // Optional Bearer token header fallback
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        error: MESSAGES.AUTH_REQUIRED,
        code: MACHINE_CODES.AUTH_REQUIRED,
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch {
      return res.status(401).json({
        error: MESSAGES.AUTH_REQUIRED,
        code: MACHINE_CODES.AUTH_REQUIRED,
      });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        error: MESSAGES.AUTH_REQUIRED,
        code: MACHINE_CODES.AUTH_REQUIRED,
      });
    }

    if (user.status === USER_STATUS.SUSPENDED) {
      return res.status(403).json({
        error: MESSAGES.ACCOUNT_SUSPENDED,
        code: MACHINE_CODES.ACCOUNT_SUSPENDED,
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
