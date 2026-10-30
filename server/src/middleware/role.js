import { MESSAGES, MACHINE_CODES } from '../constants/messages.js';

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: MESSAGES.AUTH_REQUIRED,
        code: MACHINE_CODES.AUTH_REQUIRED,
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: MESSAGES.FORBIDDEN,
        code: MACHINE_CODES.FORBIDDEN,
      });
    }

    next();
  };
}
