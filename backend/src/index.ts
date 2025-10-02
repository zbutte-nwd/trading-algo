import express from 'express';
import cors from 'cors';
import { config } from './config';
import { logger } from './utils/logger';
import tradesRouter from './routes/trades';
import marketRouter from './routes/market';
import watchlistRouter from './routes/watchlist';
import screeningRouter from './routes/screening';
import { tradingScheduler } from './services/scheduler';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/trades', tradesRouter);
app.use('/api/market', marketRouter);
app.use('/api/watchlist', watchlistRouter);
app.use('/api/screening', screeningRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = config.port;

app.listen(PORT, () => {
  logger.info(`Trading Algorithm Backend running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

  if (!config.alphaVantageApiKey) {
    logger.warn('WARNING: ALPHA_VANTAGE_API_KEY not set! Please set it in .env file');
  }

  // Start automated trading scheduler
  tradingScheduler.startDailyTrading();
  logger.info('Automated trading scheduler initialized - Daily trading at 5pm PST');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});
