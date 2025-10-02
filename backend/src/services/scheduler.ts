import cron from 'node-cron';
import { TradingEngine } from './tradingEngine';
import { db } from '../database';
import { logger } from '../utils/logger';
import { createAlpacaService } from './alpacaService';
import { config } from '../config';

export class TradingScheduler {
  private tradingEngine: TradingEngine;
  private alpacaService?: ReturnType<typeof createAlpacaService>;
  private apiCallCount = 0;
  private lastResetTime = Date.now();
  private readonly API_LIMIT_PER_MINUTE = 100; // Target 50% of 200 limit (same as alpacaMarketData)

  constructor() {
    this.tradingEngine = new TradingEngine();
    if (config.trading.useAlpaca) {
      this.alpacaService = createAlpacaService(config.alpaca);
    }
  }

  private resetApiCounter() {
    const now = Date.now();
    if (now - this.lastResetTime >= 60000) { // Reset every minute
      this.apiCallCount = 0;
      this.lastResetTime = now;
    }
  }

  private async canMakeApiCall(): Promise<boolean> {
    this.resetApiCounter();
    return this.apiCallCount < this.API_LIMIT_PER_MINUTE;
  }

  private incrementApiCall() {
    this.apiCallCount++;
  }

  private async waitForRateLimit(): Promise<void> {
    this.resetApiCounter();
    if (this.apiCallCount >= this.API_LIMIT_PER_MINUTE) {
      const waitTime = 60000 - (Date.now() - this.lastResetTime);
      if (waitTime > 0) {
        logger.warn(`Scheduler: Rate limit reached. Waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.apiCallCount = 0;
        this.lastResetTime = Date.now();
      }
    }
    this.apiCallCount++;
  }

  // 4:00 PM EST (9:00 PM UTC) - End of day stock screening
  startEndOfDayScreening() {
    cron.schedule('0 21 * * 1-5', async () => {
      logger.info('=== END OF DAY SCREENING (4:00 PM EST) ===');

      try {
        const watchlist = db.getWatchlist();
        logger.info(`Screening ${watchlist.length} stocks for tomorrow's trades`);

        const results = await this.tradingEngine.screenStocksForSignals(watchlist);

        // Store picks in database for pre-market execution
        db.storeScreeningResults(results.picks);

        logger.info(`Found ${results.picks.length} stock picks for tomorrow`);
        logger.info(`BUY signals: ${results.picks.filter(p => p.signal === 'BUY').length}`);
        logger.info(`SELL signals: ${results.picks.filter(p => p.signal === 'SELL').length}`);
      } catch (error) {
        logger.error('Error in end-of-day screening:', error);
      }
    });

    logger.info('End-of-day screening scheduler started - runs at 4pm EST (market close)');
  }

  // 9:30 AM EST (2:30 PM UTC) - Pre-market position entry
  startPreMarketExecution() {
    cron.schedule('30 14 * * 1-5', async () => {
      logger.info('=== PRE-MARKET EXECUTION (9:30 AM EST) ===');

      try {
        const picks = db.getStoredScreeningResults();
        logger.info(`Executing ${picks.length} positions from yesterday's screening`);

        const results = await this.tradingEngine.executeScreenedPicks(picks);

        logger.info(`Positions entered: ${results.entered}`);
        logger.info(`Positions skipped: ${results.skipped}`);
      } catch (error) {
        logger.error('Error in pre-market execution:', error);
      }
    });

    logger.info('Pre-market execution scheduler started - runs at 9:30am EST (market open)');
  }

  // Every 5 minutes during market hours - Monitor active positions
  startActivePositionMonitoring() {
    // Market hours: 9:30am - 4:00pm EST (14:30 - 21:00 UTC)
    // Run every 5 minutes during market hours on weekdays
    cron.schedule('*/5 14-20 * * 1-5', async () => {
      if (!(await this.canMakeApiCall())) {
        logger.warn('API rate limit reached, skipping position monitoring');
        return;
      }

      try {
        const openTrades = db.getOpenTrades();
        if (openTrades.length === 0) return;

        logger.info(`Monitoring ${openTrades.length} active positions`);

        for (const trade of openTrades) {
          if (!(await this.canMakeApiCall())) {
            logger.warn('API rate limit reached, stopping position monitoring');
            break;
          }

          this.incrementApiCall();
          await this.tradingEngine.checkExitConditions(trade);
        }
      } catch (error) {
        logger.error('Error monitoring active positions:', error);
      }
    });

    logger.info('Active position monitoring started - every 5 minutes during market hours');
  }

  // Every hour during market hours - Poll watchlist (non-active stocks)
  startHourlyWatchlistPolling() {
    // Run every hour during market hours
    cron.schedule('0 14-20 * * 1-5', async () => {
      if (!(await this.canMakeApiCall())) {
        logger.warn('API rate limit reached, skipping watchlist polling');
        return;
      }

      try {
        const watchlist = db.getWatchlist();
        const openPositions = db.getOpenTrades().map(t => t.symbol);

        // Only poll stocks we don't have positions in
        const nonActiveStocks = watchlist.filter(w => !openPositions.includes(w.symbol));

        logger.info(`Hourly poll: Checking ${nonActiveStocks.length} non-active watchlist stocks`);

        // Sample max 50 stocks per hour to conserve API calls
        const sampled = nonActiveStocks.slice(0, 50);

        for (const stock of sampled) {
          if (!(await this.canMakeApiCall())) {
            logger.warn('API rate limit reached, stopping watchlist polling');
            break;
          }

          this.incrementApiCall();
          await this.tradingEngine.quickPriceCheck(stock.symbol);
        }
      } catch (error) {
        logger.error('Error in hourly watchlist polling:', error);
      }
    });

    logger.info('Hourly watchlist polling started - during market hours');
  }

  // Start all schedulers
  start() {
    this.startEndOfDayScreening();
    this.startPreMarketExecution();
    this.startActivePositionMonitoring();
    this.startHourlyWatchlistPolling();

    logger.info('=== Automated Trading Scheduler Initialized ===');
    logger.info('Schedule:');
    logger.info('  - 4:00 PM EST: End-of-day stock screening');
    logger.info('  - 9:30 AM EST: Execute screened positions');
    logger.info('  - Every 5 min (9:30am-4pm): Monitor active positions');
    logger.info('  - Every hour (9:30am-4pm): Poll non-active watchlist stocks');
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
