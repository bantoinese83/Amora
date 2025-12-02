/**
 * Express Server
 * Handles Stripe webhooks, checkout sessions, and portal sessions
 */

import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { checkoutRoutes } from './routes/checkout.js';
import { portalRoutes } from './routes/portal.js';
import { webhookRoutes } from './routes/webhooks.js';
import { authRoutes } from './routes/auth.js';
import { sessionRoutes } from './routes/sessions.js';
import { subscriptionRoutes } from './routes/subscription.js';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - CORS configuration
// When credentials: true, origin cannot be '*', must be specific origins
const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://amora-mu.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173', // Vite default port
].filter((origin): origin is string => Boolean(origin));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, or same-origin requests)
      if (!origin) {
        return callback(null, true);
      }
      
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // In development, allow localhost with any port
        if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:')) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
// Increase body size limit for session routes (audio chunks can be large)
// Default is 100kb, we need much more for base64-encoded audio
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Stripe webhook endpoint needs raw body (must be before other routes)
app.use('/api/webhooks', webhookRoutes);

// Regular API routes
app.use('/api', checkoutRoutes);
app.use('/api', portalRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Only listen if not in Vercel serverless environment
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    // Server startup messages - these are informational, not errors
    // eslint-disable-next-line no-console
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    // eslint-disable-next-line no-console
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
  });
}

// Export for Vercel serverless
export default app;
