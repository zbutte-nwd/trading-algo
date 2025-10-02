#!/usr/bin/env tsx

import { db } from '../database';
import { TradingEngine } from '../services/tradingEngine';
import { logger } from '../utils/logger';

/**
 * Script to run trading analysis and monitor positions
 * Can be run manually or via cron job
 */

async function main() {
  logger.info('Starting trading analysis...');

  const tradingEngine = new TradingEngine();

  try {
    // Get watchlist symbols
    const symbols = db.getWatchlist();

    if (symbols.length === 0) {
      logger.warn('Watchlist is empty. Add symbols to watchlist first.');
      logger.info('Example: Add ["AAPL", "MSFT", "GOOGL", "TSLA"] to start');
      return;
    }

    logger.info(`Analyzing ${symbols.length} symbols from watchlist`);

    // Monitor existing positions
    await tradingEngine.monitorPositions();

    // Analyze and potentially create new trades
    await tradingEngine.analyzeAndTrade(symbols);

    // Display stats
    const stats = tradingEngine.getPortfolioStats();
    logger.info('Portfolio Stats:');
    logger.info(`  Account Balance: $${stats.accountBalance.toFixed(2)}`);
    logger.info(`  Invested Capital: $${stats.investedCapital.toFixed(2)}`);
    logger.info(`  Total Value: $${stats.totalValue.toFixed(2)}`);
    logger.info(`  Total P&L: $${stats.totalPnL.toFixed(2)}`);
    logger.info(`  Win Rate: ${stats.winRate.toFixed(1)}%`);
    logger.info(`  Open Trades: ${stats.openTrades}`);
    logger.info(`  Closed Trades: ${stats.closedTrades}`);

    logger.info('Analysis complete');
  } catch (error) {
    logger.error('Error during analysis:', error);
    process.exit(1);
  }
}

main();
