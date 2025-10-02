import express from 'express';
import { db } from '../database';
import { alpacaMarketDataService } from '../services/alpacaMarketData';
import { TradingStrategy } from '../services/strategy';
import { logger } from '../utils/logger';

const router = express.Router();

// Get watchlist with pagination
router.get('/', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = db.getWatchlistPaginated(limit, offset);

    res.json({
      symbols: result.symbols,
      total: result.total,
      limit,
      offset,
      hasMore: offset + limit < result.total,
    });
  } catch (error) {
    logger.error('Error fetching watchlist:', error);
    res.status(500).json({ error: 'Failed to fetch watchlist' });
  }
});

// Get watchlist with current data (optimized for API limits)
router.get('/details', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    // Get paginated watchlist directly from database
    const { symbols: symbolsToFetch, total } = db.getWatchlistPaginated(limit, offset);
    const details = [];

    // Use cached screening results when available to avoid analysis calls
    const screeningResults = db.getStoredScreeningResults();
    const screeningMap = new Map(screeningResults.map(r => [r.symbol, r]));

    for (const symbol of symbolsToFetch) {
      try {
        // Only fetch quote - this uses cache and rate limiting (2 API calls max per symbol)
        const quote = await alpacaMarketDataService.getQuote(symbol);

        // Use stored screening result if available (no API calls)
        const screening = screeningMap.get(symbol);

        details.push({
          symbol,
          currentPrice: quote.price,
          change: quote.change,
          changePercent: quote.changePercent,
          volume: quote.volume,
          signal: screening?.signal || 'HOLD',
          rsi: screening?.rsi,
        });
      } catch (error) {
        logger.error(`Error fetching details for ${symbol}:`, error);
        // Continue with other symbols
      }
    }

    res.json({
      data: details,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
      apiStats: alpacaMarketDataService.getApiStats(),
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

// Bulk import from Russell 3000
router.post('/bulk-import/russell3000', async (req, res) => {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    const filePath = path.join(__dirname, '../data/russell3000.txt');
    const content = await fs.readFile(filePath, 'utf-8');
    const symbols = content.split('\n').map(s => s.trim()).filter(s => s.length > 0);

    logger.info(`Importing ${symbols.length} symbols from Russell 3000...`);

    // Clear existing watchlist first
    const existingSymbols = db.getWatchlist();
    for (const symbol of existingSymbols) {
      db.removeFromWatchlist(symbol);
    }

    // Add all symbols (no API calls - just database inserts)
    let imported = 0;
    for (const symbol of symbols) {
      try {
        db.addToWatchlist(symbol.toUpperCase());
        imported++;
      } catch (error) {
        logger.warn(`Failed to import ${symbol}:`, error);
      }
    }

    logger.info(`Successfully imported ${imported} symbols to watchlist`);

    res.json({
      message: 'Russell 3000 imported to watchlist',
      imported,
      total: symbols.length
    });
  } catch (error) {
    logger.error('Error importing Russell 3000:', error);
    res.status(500).json({ error: 'Failed to import Russell 3000' });
  }
});

export default router;
