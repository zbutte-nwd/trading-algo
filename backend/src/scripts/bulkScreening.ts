#!/usr/bin/env tsx

import { db } from '../database';
import { TradingEngine } from '../services/tradingEngine';
import { TradingStrategy } from '../services/strategy';
import { logger } from '../utils/logger';
import { russell2000Symbols } from '../data/russell2000';

/**
 * Bulk screening script for large stock lists
 * Handles API rate limiting automatically
 */

const DELAY_BETWEEN_REQUESTS = 12000; // 12 seconds (5 per minute)
const MAX_DAILY_REQUESTS = 500;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function bulkScreen(symbols: string[], startIndex: number = 0, maxSymbols?: number) {
  logger.info(`Starting bulk screening from index ${startIndex}...`);

  const tradingEngine = new TradingEngine();
  const symbolsToScreen = maxSymbols
    ? symbols.slice(startIndex, startIndex + maxSymbols)
    : symbols.slice(startIndex);

  logger.info(`Screening ${symbolsToScreen.length} symbols (will take ~${Math.ceil(symbolsToScreen.length * 12 / 60)} minutes)`);

  let processed = 0;
  let opportunities = 0;
  let errors = 0;

  for (let i = 0; i < symbolsToScreen.length; i++) {
    const symbol = symbolsToScreen[i];
    const currentIndex = startIndex + i;

    try {
      logger.info(`[${currentIndex + 1}/${symbols.length}] Screening ${symbol}...`);

      const analysis = await TradingStrategy.analyzeStock(symbol);

      if (analysis.shouldTrade) {
        logger.info(`✓ ${symbol} - ${analysis.action} signal found!`);

        // Check if already have open position
        const existingTrades = db.getTradesBySymbol(symbol);
        const hasOpenPosition = existingTrades.some(t => t.status === 'OPEN');

        if (!hasOpenPosition) {
          const trade = TradingStrategy.createTradeFromAnalysis(
            symbol,
            analysis,
            tradingEngine.getAccountBalance()
          );

          if (trade.quantity > 0) {
            const tradeId = tradingEngine.executeTrade(trade);
            logger.info(`  → Created trade ${tradeId}`);
            opportunities++;
          }
        } else {
          logger.info(`  → Already have open position, skipping`);
        }
      }

      processed++;

      // Rate limiting - wait 12 seconds between requests
      if (i < symbolsToScreen.length - 1) {
        await sleep(DELAY_BETWEEN_REQUESTS);
      }

      // Check daily limit
      if (processed >= MAX_DAILY_REQUESTS) {
        logger.warn(`Reached daily API limit (${MAX_DAILY_REQUESTS} requests). Stopping.`);
        logger.info(`Resume tomorrow with: npm run bulk-screen ${currentIndex + 1}`);
        break;
      }

    } catch (error: any) {
      logger.error(`Error screening ${symbol}:`, error.message);
      errors++;

      // Continue with next symbol
      await sleep(DELAY_BETWEEN_REQUESTS);
    }
  }

  // Display results
  logger.info('\n=== Bulk Screening Results ===');
  logger.info(`Processed: ${processed} symbols`);
  logger.info(`Opportunities found: ${opportunities}`);
  logger.info(`Errors: ${errors}`);
  logger.info(`Next index to resume: ${startIndex + processed}`);

  const stats = tradingEngine.getPortfolioStats();
  logger.info('\n=== Portfolio Stats ===');
  logger.info(`Account Balance: $${stats.accountBalance.toFixed(2)}`);
  logger.info(`Total Value: $${stats.totalValue.toFixed(2)}`);
  logger.info(`Open Trades: ${stats.openTrades}`);
  logger.info(`Total P&L: $${stats.totalPnL.toFixed(2)}`);

  if (startIndex + processed < symbols.length) {
    logger.info(`\n${symbols.length - (startIndex + processed)} symbols remaining.`);
    logger.info(`Run: npm run bulk-screen ${startIndex + processed}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const startIndex = args[0] ? parseInt(args[0]) : 0;
  const maxSymbols = args[1] ? parseInt(args[1]) : undefined;

  logger.info('Russell 2000 Bulk Screening Tool');
  logger.info(`Total symbols: ${russell2000Symbols.length}`);
  logger.info(`Starting from index: ${startIndex}`);

  if (maxSymbols) {
    logger.info(`Max symbols to process: ${maxSymbols}`);
  }

  logger.info('\nNOTE: Free API tier allows 500 requests/day at 5 requests/minute');
  logger.info('This will automatically handle rate limiting.\n');

  await bulkScreen(russell2000Symbols, startIndex, maxSymbols);
}

main().catch(error => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
