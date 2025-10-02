import express from 'express';
import { TradingEngine } from '../services/tradingEngine';
import { db } from '../database';
import { logger } from '../utils/logger';
import { russell2000Symbols } from '../data/russell2000';

const router = express.Router();

// Run analysis on watchlist
router.post('/analyze-watchlist', async (req, res) => {
  try {
    const tradingEngine = new TradingEngine();
    const symbols = db.getWatchlist();

    if (symbols.length === 0) {
      return res.status(400).json({ error: 'Watchlist is empty' });
    }

    logger.info(`Running analysis on ${symbols.length} watchlist symbols`);

    // Monitor existing positions
    await tradingEngine.monitorPositions();

    // Analyze and trade with results tracking
    const analysisResults = await tradingEngine.analyzeAndTradeWithResults(symbols);

    const stats = tradingEngine.getPortfolioStats();

    res.json({
      message: 'Analysis complete',
      symbolsAnalyzed: symbols.length,
      tradesCreated: analysisResults.tradesCreated,
      analyzedStocks: analysisResults.analyzedStocks,
      stats,
    });
  } catch (error: any) {
    logger.error('Error running watchlist analysis:', error);
    res.status(500).json({ error: error.message || 'Failed to run analysis' });
  }
});

// Run bulk screening
router.post('/bulk-screen', async (req, res) => {
  try {
    const { startIndex = 0, maxSymbols = 50 } = req.body;
    const tradingEngine = new TradingEngine();

    const symbolsToScreen = russell2000Symbols.slice(startIndex, startIndex + maxSymbols);

    logger.info(`Bulk screening ${symbolsToScreen.length} symbols from index ${startIndex}`);

    // This will run asynchronously - respond immediately
    res.json({
      message: 'Bulk screening started',
      symbolsToScreen: symbolsToScreen.length,
      startIndex,
      note: 'Check logs for progress. This may take several minutes due to API rate limiting.',
    });

    // Run screening in background
    (async () => {
      try {
        await tradingEngine.analyzeAndTrade(symbolsToScreen);
        logger.info(`Bulk screening complete. Processed ${symbolsToScreen.length} symbols`);
      } catch (error) {
        logger.error('Error in bulk screening:', error);
      }
    })();

  } catch (error: any) {
    logger.error('Error starting bulk screening:', error);
    res.status(500).json({ error: error.message || 'Failed to start bulk screening' });
  }
});

// Get screening status
router.get('/status', async (req, res) => {
  try {
    const tradingEngine = new TradingEngine();
    const stats = tradingEngine.getPortfolioStats();
    const openTrades = db.getOpenTrades();
    const closedTrades = db.getClosedTrades();

    res.json({
      stats,
      openTrades: openTrades.length,
      closedTrades: closedTrades.length,
      recentTrades: db.getAllTrades().slice(0, 10),
    });
  } catch (error: any) {
    logger.error('Error getting screening status:', error);
    res.status(500).json({ error: error.message || 'Failed to get status' });
  }
});

export default router;
