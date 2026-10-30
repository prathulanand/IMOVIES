import { MESSAGES } from '../constants/messages.js';

export function errorHandler(err, req, res, next) {
  // If headers already sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  // Zod Validation Error
  if (err.name === 'ZodError') {
    const firstIssue = err.issues?.[0];
    const message = firstIssue ? `${firstIssue.path.join('.')}: ${firstIssue.message}` : MESSAGES.VALIDATION_ERROR;
    return res.status(400).json({
      error: message,
      code: 'VALIDATION_ERROR',
      details: err.issues,
    });
  }

  // Mongoose Duplicate Key Error (11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({
      error: `A record with this ${field} already exists.`,
      code: 'DUPLICATE_KEY',
    });
  }

  // Mongoose CastError (Invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: `Invalid identifier format for ${err.path}.`,
      code: 'INVALID_ID',
    });
  }

  // Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const firstKey = Object.keys(err.errors)[0];
    const message = err.errors[firstKey]?.message || MESSAGES.VALIDATION_ERROR;
    return res.status(400).json({
      error: message,
      code: 'VALIDATION_ERROR',
    });
  }

  // Explicit App Errors with status code
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      error: err.message || MESSAGES.INTERNAL_SERVER_ERROR,
      code: err.code || undefined,
    });
  }

  // Unexpected Server Error
  console.error('[UNHANDLED ERROR]', err);
  return res.status(500).json({
    error: MESSAGES.INTERNAL_SERVER_ERROR,
    code: 'INTERNAL_SERVER_ERROR',
  });
}
