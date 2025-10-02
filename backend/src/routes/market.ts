import express from 'express';
import { yahooFinanceService } from '../services/yahooFinanceService';
import { alpacaMarketDataService } from '../services/alpacaMarketData';
import { TradingStrategy } from '../services/strategy';
import { logger } from '../utils/logger';
import { config } from '../config';

const router = express.Router();

// Get quote for a symbol
router.get('/quote/:symbol', async (req, res) => {
  try {
    const quote = config.trading.useAlpacaMarketData
      ? await alpacaMarketDataService.getQuote(req.params.symbol)
      : await yahooFinanceService.getQuote(req.params.symbol);
    res.json(quote);
  } catch (error) {
    logger.error('Error fetching quote:', error);
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
});

// Get daily data
router.get('/daily/:symbol', async (req, res) => {
  try {
    if (config.trading.useAlpacaMarketData) {
      const outputSize = req.query.outputsize === 'full' ? 'full' : 'compact';
      const data = await alpacaMarketDataService.getDailyData(req.params.symbol, outputSize);
      res.json(data);
    } else {
      const days = req.query.outputsize === 'full' ? 365 : 100;
      const data = await yahooFinanceService.getHistoricalData(req.params.symbol, days);
      res.json(data);
    }
  } catch (error) {
    logger.error('Error fetching daily data:', error);
    res.status(500).json({ error: 'Failed to fetch daily data' });
  }
});

// Get intraday data - Not supported by Alpaca free tier, return error
router.get('/intraday/:symbol', async (req, res) => {
  try {
    res.status(501).json({ error: 'Intraday data not available with Alpaca' });
  } catch (error) {
    logger.error('Error fetching intraday data:', error);
    res.status(500).json({ error: 'Failed to fetch intraday data' });
  }
});

// Analyze a symbol
router.get('/analyze/:symbol', async (req, res) => {
  try {
    const analysis = await TradingStrategy.analyzeStock(req.params.symbol);
    res.json(analysis);
  } catch (error) {
    logger.error('Error analyzing symbol:', error);
    res.status(500).json({ error: 'Failed to analyze symbol' });
  }
});

// Screen multiple symbols
router.post('/screen', async (req, res) => {
  try {
    const { symbols, criteria } = req.body;

    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({ error: 'symbols array is required' });
    }

    const results = await TradingStrategy.screenStocks(symbols, criteria);
    res.json(results);
  } catch (error) {
    logger.error('Error screening stocks:', error);
    res.status(500).json({ error: 'Failed to screen stocks' });
  }
});

// Search for symbols - Not supported, return empty array
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q as string;

    if (!query) {
      return res.status(400).json({ error: 'query parameter "q" is required' });
    }

    // Symbol search not available with Alpaca, return empty array
    res.json([]);
  } catch (error) {
    logger.error('Error searching symbols:', error);
    res.status(500).json({ error: 'Failed to search symbols' });
  }
});

export default router;
