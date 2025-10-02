import Database from 'better-sqlite3';
import { config } from '../config';
import { Trade } from '../types';
import { logger } from '../utils/logger';

class DatabaseManager {
  private db: Database.Database;

  constructor() {
    this.db = new Database(config.database.path);
    this.initialize();
  }

  private initialize() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        type TEXT NOT NULL,
        action TEXT NOT NULL,
        quantity REAL NOT NULL,
        entryPrice REAL NOT NULL,
        entryDate TEXT NOT NULL,
        exitPrice REAL,
        exitDate TEXT,
        stopLoss REAL NOT NULL,
        takeProfit REAL NOT NULL,
        status TEXT NOT NULL,
        pnl REAL,
        pnlPercent REAL,
        strategy TEXT NOT NULL,
        entryReason TEXT NOT NULL,
        exitCriteria TEXT NOT NULL,
        exitReason TEXT,
        rsi REAL,
        maShort REAL,
        maLong REAL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS watchlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT UNIQUE NOT NULL,
        addedAt TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS price_cache (
        symbol TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        open REAL NOT NULL,
        high REAL NOT NULL,
        low REAL NOT NULL,
        close REAL NOT NULL,
        volume INTEGER NOT NULL,
        PRIMARY KEY (symbol, timestamp)
      );

      CREATE TABLE IF NOT EXISTS quote_cache (
        symbol TEXT PRIMARY KEY,
        price REAL NOT NULL,
        change REAL NOT NULL,
        changePercent TEXT NOT NULL,
        volume INTEGER NOT NULL,
        previousClose REAL NOT NULL,
        open REAL NOT NULL,
        high REAL NOT NULL,
        low REAL NOT NULL,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS portfolio (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        cash REAL NOT NULL DEFAULT 100000,
        initialCash REAL NOT NULL DEFAULT 100000,
        totalValue REAL NOT NULL DEFAULT 100000,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS screening_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        signal TEXT NOT NULL,
        price REAL NOT NULL,
        rsi REAL,
        maShort REAL,
        maLong REAL,
        stopLoss REAL NOT NULL,
        takeProfit REAL NOT NULL,
        reason TEXT NOT NULL,
        screenedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        executed INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
      CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
      CREATE INDEX IF NOT EXISTS idx_price_cache_symbol ON price_cache(symbol);
      CREATE INDEX IF NOT EXISTS idx_screening_executed ON screening_results(executed);
    `);

    // Initialize portfolio if it doesn't exist
    const portfolioExists = this.db.prepare('SELECT COUNT(*) as count FROM portfolio').get() as { count: number };
    if (portfolioExists.count === 0) {
      this.db.prepare('INSERT INTO portfolio (id, cash, initialCash, totalValue) VALUES (1, 100000, 100000, 100000)').run();
      logger.info('Portfolio initialized with $100,000');
    }

    logger.info('Database initialized successfully');
  }

  // Trade operations
  createTrade(trade: Omit<Trade, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO trades (
        symbol, type, action, quantity, entryPrice, entryDate,
        stopLoss, takeProfit, status, strategy, entryReason,
        exitCriteria, rsi, maShort, maLong
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      trade.symbol,
      trade.type,
      trade.action,
      trade.quantity,
      trade.entryPrice,
      trade.entryDate,
      trade.stopLoss,
      trade.takeProfit,
      trade.status,
      trade.strategy,
      trade.entryReason,
      trade.exitCriteria,
      trade.rsi,
      trade.maShort,
      trade.maLong
    );

    logger.info(`Trade created: ${trade.symbol} ${trade.action} at ${trade.entryPrice}`);
    return result.lastInsertRowid as number;
  }

  updateTrade(id: number, updates: Partial<Trade>): void {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return;

    values.push(id);
    const stmt = this.db.prepare(`UPDATE trades SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    logger.info(`Trade ${id} updated`);
  }

  closeTrade(id: number, exitPrice: number, exitDate: string, exitReason: string): void {
    const trade = this.getTrade(id);
    if (!trade) return;

    const pnl = trade.action === 'BUY'
      ? (exitPrice - trade.entryPrice) * trade.quantity
      : (trade.entryPrice - exitPrice) * trade.quantity;

    const pnlPercent = ((exitPrice - trade.entryPrice) / trade.entryPrice) * 100;

    this.updateTrade(id, {
      exitPrice,
      exitDate,
      exitReason,
      status: 'CLOSED',
      pnl,
      pnlPercent,
    });
  }

  getTrade(id: number): Trade | undefined {
    const stmt = this.db.prepare('SELECT * FROM trades WHERE id = ?');
    return stmt.get(id) as Trade | undefined;
  }

  getAllTrades(): Trade[] {
    const stmt = this.db.prepare('SELECT * FROM trades ORDER BY entryDate DESC');
    return stmt.all() as Trade[];
  }

  getOpenTrades(): Trade[] {
    const stmt = this.db.prepare('SELECT * FROM trades WHERE status = ? ORDER BY entryDate DESC');
    return stmt.all('OPEN') as Trade[];
  }

  getClosedTrades(): Trade[] {
    const stmt = this.db.prepare('SELECT * FROM trades WHERE status = ? ORDER BY exitDate DESC');
    return stmt.all('CLOSED') as Trade[];
  }

  getTradesBySymbol(symbol: string): Trade[] {
    const stmt = this.db.prepare('SELECT * FROM trades WHERE symbol = ? ORDER BY entryDate DESC');
    return stmt.all(symbol) as Trade[];
  }

  // Watchlist operations
  addToWatchlist(symbol: string): void {
    try {
      const stmt = this.db.prepare('INSERT INTO watchlist (symbol) VALUES (?)');
      stmt.run(symbol);
      logger.info(`Added ${symbol} to watchlist`);
    } catch (error) {
      // Ignore duplicate errors
      if (!(error instanceof Error && error.message.includes('UNIQUE'))) {
        throw error;
      }
    }
  }

  removeFromWatchlist(symbol: string): void {
    const stmt = this.db.prepare('DELETE FROM watchlist WHERE symbol = ?');
    stmt.run(symbol);
    logger.info(`Removed ${symbol} from watchlist`);
  }

  getWatchlist(): string[] {
    const stmt = this.db.prepare('SELECT symbol FROM watchlist ORDER BY symbol');
    return stmt.all().map((row: any) => row.symbol);
  }

  getWatchlistPaginated(limit: number = 50, offset: number = 0): { symbols: string[]; total: number } {
    const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM watchlist');
    const total = (countStmt.get() as any).count;

    const stmt = this.db.prepare('SELECT symbol FROM watchlist ORDER BY symbol LIMIT ? OFFSET ?');
    const symbols = stmt.all(limit, offset).map((row: any) => row.symbol);

    return { symbols, total };
  }

  // Price cache operations
  cachePriceData(symbol: string, data: any[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO price_cache (symbol, timestamp, open, high, low, close, volume)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insert = this.db.transaction((rows: any[]) => {
      for (const row of rows) {
        stmt.run(symbol, row.timestamp, row.open, row.high, row.low, row.close, row.volume);
      }
    });

    insert(data);
  }

  getCachedPriceData(symbol: string, limit: number = 100): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM price_cache
      WHERE symbol = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    return stmt.all(symbol, limit);
  }

  // Quote cache operations (for current prices)
  cacheQuote(symbol: string, quote: any): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO quote_cache
      (symbol, price, change, changePercent, volume, previousClose, open, high, low, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(
      symbol,
      quote.price,
      quote.change,
      quote.changePercent,
      quote.volume,
      quote.previousClose,
      quote.open,
      quote.high,
      quote.low
    );
  }

  getCachedQuote(symbol: string, maxAgeMinutes: number = 60): any | null {
    const stmt = this.db.prepare(`
      SELECT * FROM quote_cache
      WHERE symbol = ?
      AND datetime(updatedAt) > datetime('now', '-' || ? || ' minutes')
    `);
    return stmt.get(symbol, maxAgeMinutes);
  }

  clearOldQuotesCache(hoursOld: number = 24): void {
    const stmt = this.db.prepare(`
      DELETE FROM quote_cache
      WHERE datetime(updatedAt) < datetime('now', '-' || ? || ' hours')
    `);
    const result = stmt.run(hoursOld);
    if (result.changes > 0) {
      logger.info(`Cleared ${result.changes} old quote cache entries`);
    }
  }

  getStats() {
    const trades = this.getAllTrades();
    const openTrades = trades.filter(t => t.status === 'OPEN');
    const closedTrades = trades.filter(t => t.status === 'CLOSED');

    const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
    const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;

    return {
      totalTrades: trades.length,
      openTrades: openTrades.length,
      closedTrades: closedTrades.length,
      totalPnL,
      winRate,
      avgWin: winningTrades.length > 0
        ? winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / winningTrades.length
        : 0,
      avgLoss: closedTrades.length - winningTrades.length > 0
        ? closedTrades.filter(t => (t.pnl || 0) < 0).reduce((sum, t) => sum + (t.pnl || 0), 0) / (closedTrades.length - winningTrades.length)
        : 0,
    };
  }

  // Portfolio operations
  getPortfolio() {
    const stmt = this.db.prepare('SELECT * FROM portfolio WHERE id = 1');
    return stmt.get() as { id: number; cash: number; initialCash: number; totalValue: number; updatedAt: string };
  }

  updatePortfolioCash(cash: number): void {
    const stmt = this.db.prepare('UPDATE portfolio SET cash = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = 1');
    stmt.run(cash);
  }

  updatePortfolioValue(totalValue: number): void {
    const stmt = this.db.prepare('UPDATE portfolio SET totalValue = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = 1');
    stmt.run(totalValue);
  }

  calculatePortfolioValue(): number {
    const portfolio = this.getPortfolio();
    const openTrades = this.getOpenTrades();

    // This will be updated with current market prices when we calculate
    // For now, just return cash + position values at entry
    const positionsValue = openTrades.reduce((sum, trade) => {
      return sum + (trade.entryPrice * trade.quantity);
    }, 0);

    return portfolio.cash + positionsValue;
  }

  // Screening results operations
  storeScreeningResults(picks: any[]): void {
    // Clear previous day's unexecuted results
    this.db.prepare('DELETE FROM screening_results WHERE executed = 0').run();

    const stmt = this.db.prepare(`
      INSERT INTO screening_results (symbol, signal, price, rsi, maShort, maLong, stopLoss, takeProfit, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insert = this.db.transaction((rows: any[]) => {
      for (const row of rows) {
        stmt.run(
          row.symbol,
          row.signal,
          row.price,
          row.rsi,
          row.maShort,
          row.maLong,
          row.stopLoss,
          row.takeProfit,
          row.reason
        );
      }
    });

    insert(picks);
    logger.info(`Stored ${picks.length} screening results`);
  }

  getStoredScreeningResults(): any[] {
    const stmt = this.db.prepare('SELECT * FROM screening_results WHERE executed = 0 ORDER BY screenedAt DESC');
    return stmt.all();
  }

  markScreeningResultExecuted(id: number): void {
    const stmt = this.db.prepare('UPDATE screening_results SET executed = 1 WHERE id = ?');
    stmt.run(id);
  }

  close(): void {
    this.db.close();
  }
}

export const db = new DatabaseManager();
