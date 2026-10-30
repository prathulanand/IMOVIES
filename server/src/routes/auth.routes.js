import { Router } from 'express';
import {
  register,
  sendRegistrationOtp,
  verifyRegistrationOtp,
  login,
  logout,
  googleLogin,
  getMe,
  forgotPassword,
  resetPassword,
  registerSchema,
  sendOtpSchema,
  verifyOtpSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.post('/send-otp', authLimiter, validate(sendOtpSchema), sendRegistrationOtp);
router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), verifyRegistrationOtp);
router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/google', googleLogin);
router.post('/logout', logout);
router.get('/me', requireAuth, getMe);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);

export default router;
