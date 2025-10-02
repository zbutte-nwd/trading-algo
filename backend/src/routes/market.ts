import express from 'express';
import { yahooMarketDataService } from '../services/yahooMarketData';
import { TradingStrategy } from '../services/strategy';
import { logger } from '../utils/logger';

const router = express.Router();

// Get quote for a symbol
router.get('/quote/:symbol', async (req, res) => {
  try {
    const quote = await yahooMarketDataService.getQuote(req.params.symbol);
    res.json(quote);
  } catch (error) {
    logger.error('Error fetching quote:', error);
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
});

// Get daily data
router.get('/daily/:symbol', async (req, res) => {
  try {
    const outputsize = (req.query.outputsize as 'compact' | 'full') || 'compact';
    const data = await yahooMarketDataService.getDailyData(req.params.symbol, outputsize);
    res.json(data);
  } catch (error) {
    logger.error('Error fetching daily data:', error);
    res.status(500).json({ error: 'Failed to fetch daily data' });
  }
});

// Get intraday data
router.get('/intraday/:symbol', async (req, res) => {
  try {
    const interval = (req.query.interval as any) || '5min';
    const data = await yahooMarketDataService.getIntradayData(req.params.symbol, interval);
    res.json(data);
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

// Search for symbols
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q as string;

    if (!query) {
      return res.status(400).json({ error: 'query parameter "q" is required' });
    }

    const results = await yahooMarketDataService.search(query);
    res.json(results);
  } catch (error) {
    logger.error('Error searching symbols:', error);
    res.status(500).json({ error: 'Failed to search symbols' });
  }
});

export default router;
