import express from 'express';
import { db } from '../database';
import { yahooMarketDataService } from '../services/yahooMarketData';
import { TradingStrategy } from '../services/strategy';
import { logger } from '../utils/logger';

const router = express.Router();

// Get watchlist
router.get('/', (req, res) => {
  try {
    const symbols = db.getWatchlist();
    res.json(symbols);
  } catch (error) {
    logger.error('Error fetching watchlist:', error);
    res.status(500).json({ error: 'Failed to fetch watchlist' });
  }
});

// Get watchlist with current data
router.get('/details', async (req, res) => {
  try {
    const symbols = db.getWatchlist();
    const limit = parseInt(req.query.limit as string) || 50; // Default to 50
    const offset = parseInt(req.query.offset as string) || 0;

    const symbolsToFetch = symbols.slice(offset, offset + limit);
    const details = [];

    for (const symbol of symbolsToFetch) {
      try {
        const quote = await yahooMarketDataService.getQuote(symbol);
        const dailyData = await yahooMarketDataService.getDailyData(symbol, 'compact');

        let analysis = null;
        if (dailyData.length > 50) {
          analysis = await TradingStrategy.analyzeStock(symbol);
        }

        details.push({
          symbol,
          currentPrice: quote.price,
          change: quote.change,
          changePercent: quote.changePercent,
          volume: quote.volume,
          signal: analysis?.action || 'HOLD',
          rsi: analysis?.indicators.rsi,
        });
      } catch (error) {
        logger.error(`Error fetching details for ${symbol}:`, error);
        // Continue with other symbols
      }
    }

    res.json({
      data: details,
      total: symbols.length,
      limit,
      offset,
      hasMore: offset + limit < symbols.length
    });
  } catch (error) {
    logger.error('Error fetching watchlist details:', error);
    res.status(500).json({ error: 'Failed to fetch watchlist details' });
  }
});

// Add to watchlist
router.post('/', (req, res) => {
  try {
    const { symbol } = req.body;

    if (!symbol) {
      return res.status(400).json({ error: 'symbol is required' });
    }

    db.addToWatchlist(symbol.toUpperCase());
    res.status(201).json({ message: 'Added to watchlist', symbol });
  } catch (error) {
    logger.error('Error adding to watchlist:', error);
    res.status(500).json({ error: 'Failed to add to watchlist' });
  }
});

// Remove from watchlist
router.delete('/:symbol', (req, res) => {
  try {
    db.removeFromWatchlist(req.params.symbol.toUpperCase());
    res.json({ message: 'Removed from watchlist' });
  } catch (error) {
    logger.error('Error removing from watchlist:', error);
    res.status(500).json({ error: 'Failed to remove from watchlist' });
  }
});

export default router;
