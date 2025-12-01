/**
 * Express Server
 * Handles Stripe webhooks, checkout sessions, and portal sessions
 */

import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { checkoutRoutes } from './routes/checkout';
import { portalRoutes } from './routes/portal';
import { webhookRoutes } from './routes/webhooks';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true,
  })
);
app.use(express.json());

// Stripe webhook endpoint needs raw body (must be before other routes)
app.use('/api/webhooks', webhookRoutes);

// Regular API routes
app.use('/api', checkoutRoutes);
app.use('/api', portalRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Only listen if not in Vercel serverless environment
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
  });
}

// Export for Vercel serverless
export default app;
