import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = nodeEnv === 'production' ? '.env.production' : '.env.development';

// Load specific env file, then fallback to .env
dotenv.config({ path: path.resolve(__dirname, `../../${envFile}`) });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const requiredVars = [
  'MONGODB_URI',
  'JWT_SECRET'
];

const missing = requiredVars.filter((v) => !process.env[v] || process.env[v].trim() === '');
if (missing.length > 0) {
  console.error('\x1b[31m[FATAL ERROR] Missing required environment variables:\x1b[0m', missing.join(', '));
  console.error(`Please ensure these are defined in your ${envFile} or environment.`);
  process.exit(1);
}

export const env = {
  PORT: parseInt(process.env.PORT || '5001', 10),
  NODE_ENV: nodeEnv,
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  RAZORPAY_KEY_ID: (process.env.RAZORPAY_KEY_ID || 'rzp_test_Trs6pDxXpR6cwf').trim(),
  RAZORPAY_KEY_SECRET: (process.env.RAZORPAY_KEY_SECRET || 'yRHa825IBorIjBL1N4cHgquC').trim(),
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  GOOGLE_CLIENT_ID: (process.env.GOOGLE_CLIENT_ID || '').trim(),
  BREVO_API_KEY: (process.env.BREVO_API_KEY || '').trim(),
  HOLD_MINUTES: parseInt(process.env.HOLD_MINUTES || '7', 10),
  CONVENIENCE_FEE_PERCENT: parseInt(process.env.CONVENIENCE_FEE_PERCENT || '5', 10),
  MAX_SEATS_PER_BOOKING: parseInt(process.env.MAX_SEATS_PER_BOOKING || '8', 10),
};
