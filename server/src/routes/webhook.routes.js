import { Router } from 'express';
import { handleRazorpayWebhook } from '../controllers/webhook.controller.js';

const router = Router();

// Public webhook route (verified via HMAC signature on raw body)
router.post('/razorpay', handleRazorpayWebhook);

export default router;
