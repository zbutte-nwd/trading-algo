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
router.get('/open', (req, res) => {
  try {
    const trades = db.getOpenTrades();
    res.json(trades);
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
router.get('/stats/portfolio', (req, res) => {
  try {
    const stats = tradingEngine.getPortfolioStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error fetching portfolio stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
