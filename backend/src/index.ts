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

// Alpaca test endpoint
app.get('/api/alpaca/test', async (req, res) => {
  try {
    const { createAlpacaService } = await import('./services/alpacaService');
    const alpaca = createAlpacaService({
      keyId: process.env.ALPACA_API_KEY || '',
      secretKey: process.env.ALPACA_SECRET_KEY || '',
      paper: process.env.ALPACA_PAPER !== 'false',
    });

    const account = await alpaca.getAccount();
    const isMarketOpen = await alpaca.isMarketOpen();

    res.json({
      success: true,
      account: {
        cash: account.cash,
        portfolioValue: account.portfolioValue,
        buyingPower: account.buyingPower,
      },
      marketOpen: isMarketOpen,
      mode: process.env.ALPACA_PAPER !== 'false' ? 'paper' : 'live',
    });
  } catch (error: any) {
    logger.error('Alpaca test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.toString()
    });
  }
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

  // Start automated trading scheduler with all jobs
  tradingScheduler.start();
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
