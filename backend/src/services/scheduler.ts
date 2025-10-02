import cron from 'node-cron';
import { TradingEngine } from './tradingEngine';
import { db } from '../database';
import { logger } from '../utils/logger';

export class TradingScheduler {
  private tradingEngine: TradingEngine;

  constructor() {
    this.tradingEngine = new TradingEngine();
  }

  // Run daily trading at 5pm PST (which is 1am UTC next day)
  // Cron format: minute hour day month dayOfWeek
  // 0 1 * * * = At 1:00 AM UTC (5:00 PM PST previous day)
  startDailyTrading() {
    // 5pm PST = 1am UTC (next day during standard time)
    // 5pm PDT = 12am UTC (next day during daylight time)
    // Using 1am UTC to match PST
    cron.schedule('0 1 * * *', async () => {
      logger.info('=== Starting Daily Trading Session ===');
      logger.info(`Time: ${new Date().toISOString()}`);

      try {
        // Step 1: Monitor and close positions based on exit conditions
        logger.info('Step 1: Monitoring open positions for exit signals...');
        await this.tradingEngine.monitorPositions();

        // Step 2: Analyze watchlist and create new trades
        logger.info('Step 2: Analyzing watchlist for new opportunities...');
        const watchlist = db.getWatchlist();
        logger.info(`Analyzing ${watchlist.length} symbols from watchlist`);

        const results = await this.tradingEngine.analyzeAndTradeWithResults(watchlist);

        // Step 3: Log summary
        const portfolio = db.getPortfolio();
        const stats = this.tradingEngine.getPortfolioStats();

        logger.info('=== Daily Trading Session Complete ===');
        logger.info(`Symbols Analyzed: ${watchlist.length}`);
        logger.info(`Trades Created: ${results.tradesCreated}`);
        logger.info(`Portfolio Cash: $${portfolio.cash.toFixed(2)}`);
        logger.info(`Total Value: $${stats.totalValue.toFixed(2)}`);
        logger.info(`Total Return: ${stats.totalReturn.toFixed(2)}%`);
        logger.info(`Open Positions: ${stats.openTrades}`);
        logger.info(`Closed Trades: ${stats.closedTrades}`);
        logger.info(`Win Rate: ${stats.winRate.toFixed(2)}%`);

      } catch (error) {
        logger.error('Error in daily trading session:', error);
      }
    });

    logger.info('Daily trading scheduler started - will run at 5pm PST (1am UTC)');
  }

  // Manual trigger for testing
  async runManualSession() {
    logger.info('=== Manual Trading Session Triggered ===');

    try {
      await this.tradingEngine.monitorPositions();

      const watchlist = db.getWatchlist();
      const results = await this.tradingEngine.analyzeAndTradeWithResults(watchlist);

      const stats = this.tradingEngine.getPortfolioStats();

      logger.info('=== Manual Session Complete ===');
      logger.info(`Trades Created: ${results.tradesCreated}`);
      logger.info(`Total Value: $${stats.totalValue.toFixed(2)}`);

      return {
        tradesCreated: results.tradesCreated,
        analyzedStocks: results.analyzedStocks,
        stats
      };
    } catch (error) {
      logger.error('Error in manual trading session:', error);
      throw error;
    }
  }
}

export const tradingScheduler = new TradingScheduler();
