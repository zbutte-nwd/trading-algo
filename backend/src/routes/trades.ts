import express from 'express';
import { db } from '../database';
import { TradingEngine } from '../services/tradingEngine';
import { TradingStrategy } from '../services/strategy';
import { logger } from '../utils/logger';

const router = express.Router();
const tradingEngine = new TradingEngine();

// Get all trades
router.get('/', (req, res) => {
  try {
    const trades = db.getAllTrades();
    res.json(trades);
  } catch (error) {
    logger.error('Error fetching trades:', error);
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
});

// Get open trades
router.get('/open', async (req, res) => {
  try {
    // Get local database trades
    const localTrades = db.getOpenTrades();

    // If Alpaca is enabled, fetch real positions
    if (process.env.USE_ALPACA === 'true') {
      try {
        const { createAlpacaService } = await import('../services/alpacaService');
        const alpaca = createAlpacaService({
          keyId: process.env.ALPACA_API_KEY || '',
          secretKey: process.env.ALPACA_SECRET_KEY || '',
          paper: process.env.ALPACA_PAPER !== 'false',
        });

        const positions = await alpaca.getPositions();

        // Map Alpaca positions to trade format
        const alpacaTrades = positions.map(pos => ({
          symbol: pos.symbol,
          type: 'STOCK' as const,
          action: 'BUY' as const,
          quantity: pos.qty,
          entryPrice: pos.avgEntryPrice,
          currentPrice: pos.currentPrice,
          status: 'OPEN' as const,
          pnl: pos.unrealizedPL,
          pnlPercent: pos.unrealizedPLPercent * 100,
          entryDate: new Date().toISOString(),
          strategy: 'ALPACA_POSITION',
          entryReason: 'Existing Alpaca position',
        }));

        return res.json(alpacaTrades);
      } catch (alpacaError) {
        logger.error('Failed to fetch Alpaca positions, using local data:', alpacaError);
      }
    }

    res.json(localTrades);
  } catch (error) {
    logger.error('Error fetching open trades:', error);
    res.status(500).json({ error: 'Failed to fetch open trades' });
  }
});

// Get closed trades
router.get('/closed', (req, res) => {
  try {
    const trades = db.getClosedTrades();
    res.json(trades);
  } catch (error) {
    logger.error('Error fetching closed trades:', error);
    res.status(500).json({ error: 'Failed to fetch closed trades' });
  }
});

// Get single trade
router.get('/:id', (req, res) => {
  try {
    const trade = db.getTrade(parseInt(req.params.id));
    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }
    res.json(trade);
  } catch (error) {
    logger.error('Error fetching trade:', error);
    res.status(500).json({ error: 'Failed to fetch trade' });
  }
});

// Get trades by symbol
router.get('/symbol/:symbol', (req, res) => {
  try {
    const trades = db.getTradesBySymbol(req.params.symbol);
    res.json(trades);
  } catch (error) {
    logger.error('Error fetching trades by symbol:', error);
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
});

// Create manual trade
router.post('/', (req, res) => {
  try {
    const trade = req.body;
    const tradeId = tradingEngine.executeTrade(trade);
    const createdTrade = db.getTrade(tradeId);
    res.status(201).json(createdTrade);
  } catch (error) {
    logger.error('Error creating trade:', error);
    res.status(500).json({ error: 'Failed to create trade' });
  }
});

// Close trade
router.post('/:id/close', async (req, res) => {
  try {
    await tradingEngine.closeTrade(parseInt(req.params.id));
    const trade = db.getTrade(parseInt(req.params.id));
    res.json(trade);
  } catch (error) {
    logger.error('Error closing trade:', error);
    res.status(500).json({ error: 'Failed to close trade' });
  }
});

// Get portfolio stats
router.get('/stats/portfolio', async (req, res) => {
  try {
    const stats = await tradingEngine.getPortfolioStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error fetching portfolio stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get screening picks (potential buys)
router.get('/picks/screening', (req, res) => {
  try {
    const picks = db.getStoredScreeningResults();
    res.json(picks);
  } catch (error) {
    logger.error('Error fetching screening picks:', error);
    res.status(500).json({ error: 'Failed to fetch picks' });
  }
});

export default router;
