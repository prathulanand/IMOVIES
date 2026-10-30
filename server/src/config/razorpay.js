import Razorpay from 'razorpay';
import { env } from './env.js';

let razorpayInstance = null;

if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
  razorpayInstance = new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
} else {
  console.warn('\x1b[33m[WARN] Razorpay keys not provided. Payment gateway calls will be disabled.\x1b[0m');
}

export const razorpay = razorpayInstance;
