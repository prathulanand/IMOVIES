import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import publicRoutes from './routes/public.routes.js';
import userRoutes from './routes/user.routes.js';
import adminRoutes from './routes/admin.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import favoriteRoutes from './routes/favorite.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { MESSAGES } from './constants/messages.js';

const app = express();

// Security Headers & Payload Compression
app.use(helmet());
app.use(compression());

// CORS configuration
const allowedOrigins = [
  env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean).map((u) => u.replace(/\/$/, ''));

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/$/, '');
      if (
        allowedOrigins.includes(cleanOrigin) ||
        cleanOrigin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-razorpay-signature'],
  })
);

// Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Preserve raw body buffer for webhook signature verification
app.use(
  express.json({
    limit: '2mb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// Root redirect to Client
app.get('/', (req, res) => {
  res.redirect(env.CLIENT_URL);
});

// Base Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/favorite', favoriteRoutes);

// Catch-all 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    error: MESSAGES.RESOURCE_NOT_FOUND,
    code: 'NOT_FOUND',
  });
});

// Centralized Error Handler
app.use(errorHandler);

export default app;
