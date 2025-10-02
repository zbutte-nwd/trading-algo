import { db } from '../database';
import { Trade } from '../types';
import { TradingStrategy } from './strategy';
import { logger } from '../utils/logger';
import { config } from '../config';
import { createAlpacaService } from './alpacaService';

export class TradingEngine {
  private alpacaService?: ReturnType<typeof createAlpacaService>;

  constructor() {
    // Initialize Alpaca service if enabled
    if (config.trading.useAlpaca) {
      this.alpacaService = createAlpacaService(config.alpaca);
      logger.info('Trading engine using Alpaca for execution');
    } else {
      logger.info('Trading engine using simulation mode');
    }
  }

  // Execute a trade (Alpaca paper trading or simulation)
  async executeTrade(trade: Omit<Trade, 'id'>): Promise<number> {
    try {
      const portfolio = db.getPortfolio();
      const cost = trade.entryPrice * trade.quantity;

      // Check if we have enough cash
      if (trade.action === 'BUY' && cost > portfolio.cash) {
        logger.warn(`Insufficient funds for ${trade.symbol}. Need $${cost}, have $${portfolio.cash}`);
        throw new Error('Insufficient funds');
      }

      // Execute on Alpaca if enabled
      if (this.alpacaService && config.trading.useAlpaca) {
        try {
          // Place bracket order with automatic stop-loss and take-profit
          const stopLoss = trade.stopLoss || trade.entryPrice * 0.95; // 5% stop loss
          const takeProfit = trade.takeProfit || trade.entryPrice * 1.10; // 10% take profit

          const alpacaOrder = await this.alpacaService.placeBracketOrder(
            trade.symbol,
            trade.quantity,
            trade.action.toLowerCase() as 'buy' | 'sell',
            stopLoss,
            takeProfit
          );

          logger.info(`Alpaca order placed: ${alpacaOrder.id} for ${trade.symbol}`);

          // Store Alpaca order ID in trade notes
          const tradeWithOrderId = {
            ...trade,
            notes: `Alpaca Order ID: ${alpacaOrder.id}`,
          };

          const tradeId = db.createTrade(tradeWithOrderId);

          // Update cash balance for buy trades
          if (trade.action === 'BUY') {
            const newCash = portfolio.cash - cost;
            db.updatePortfolioCash(newCash);
            logger.info(`Executed BUY on Alpaca: ${trade.quantity} shares of ${trade.symbol} at $${trade.entryPrice}. New cash: $${newCash.toFixed(2)}`);
          }

          return tradeId;
        } catch (alpacaError) {
          logger.error('Alpaca order failed, falling back to simulation:', alpacaError);
          // Fall through to simulation mode
        }
      }

      // Simulated trade execution
      const tradeId = db.createTrade(trade);

      // Update cash balance for buy trades
      if (trade.action === 'BUY') {
        const newCash = portfolio.cash - cost;
        db.updatePortfolioCash(newCash);
        logger.info(`Executed BUY (simulated): ${trade.quantity} shares of ${trade.symbol} at $${trade.entryPrice}. New cash: $${newCash.toFixed(2)}`);
      }

      return tradeId;
    } catch (error) {
      logger.error('Error executing trade:', error);
      throw error;
    }
  }

  // Close a trade
  async closeTrade(tradeId: number): Promise<void> {
    try {
      const trade = db.getTrade(tradeId);
      if (!trade) {
        throw new Error(`Trade ${tradeId} not found`);
      }

      if (trade.status === 'CLOSED') {
        logger.warn(`Trade ${tradeId} is already closed`);
        return;
      }

      const exitCheck = await TradingStrategy.checkExitConditions(trade);

      db.closeTrade(
        tradeId,
        exitCheck.currentPrice,
        new Date().toISOString(),
        exitCheck.reason
      );

      // Update cash balance
      const portfolio = db.getPortfolio();
      if (trade.action === 'BUY') {
        const proceeds = exitCheck.currentPrice * trade.quantity;
        db.updatePortfolioCash(portfolio.cash + proceeds);
      } else {
        const cost = exitCheck.currentPrice * trade.quantity;
        db.updatePortfolioCash(portfolio.cash - cost);
      }

      const closedTrade = db.getTrade(tradeId);
      logger.info(`Closed trade ${tradeId}: ${closedTrade?.symbol} P&L: $${closedTrade?.pnl?.toFixed(2)}`);
    } catch (error) {
      logger.error(`Error closing trade ${tradeId}:`, error);
      throw error;
    }
  }

  // Monitor open positions and close if exit conditions are met
  async monitorPositions(): Promise<void> {
    const openTrades = db.getOpenTrades();

    logger.info(`Monitoring ${openTrades.length} open positions...`);

    for (const trade of openTrades) {
      try {
        const exitCheck = await TradingStrategy.checkExitConditions(trade);

        if (exitCheck.shouldExit) {
          logger.info(`Exit signal for ${trade.symbol}: ${exitCheck.reason}`);
          await this.closeTrade(trade.id!);
        }
      } catch (error) {
        logger.error(`Error monitoring position ${trade.symbol}:`, error);
      }
    }
  }

  // Run analysis and generate trades for watchlist
  async analyzeAndTrade(symbols: string[]): Promise<void> {
    logger.info(`Analyzing ${symbols.length} symbols...`);

    const screenedStocks = await TradingStrategy.screenStocks(symbols);

    logger.info(`Found ${screenedStocks.length} trading opportunities`);

    for (const { symbol, analysis } of screenedStocks) {
      try {
        // Check if we already have an open position
        const existingTrades = db.getTradesBySymbol(symbol);
        const hasOpenPosition = existingTrades.some(t => t.status === 'OPEN');

        if (hasOpenPosition) {
          logger.info(`Already have open position in ${symbol}, skipping`);
          continue;
        }

        // Create trade using available cash from portfolio
        const portfolio = db.getPortfolio();
        const trade = TradingStrategy.createTradeFromAnalysis(
          symbol,
          analysis,
          portfolio.cash
        );

        if (trade.quantity > 0) {
          const tradeId = await this.executeTrade(trade);
          logger.info(`Created trade ${tradeId} for ${symbol}`);
        } else {
          logger.warn(`Position size for ${symbol} is 0, skipping trade`);
        }
      } catch (error) {
        logger.error(`Error creating trade for ${symbol}:`, error);
      }
    }
  }

  // Run analysis and generate trades with detailed results
  async analyzeAndTradeWithResults(symbols: string[]): Promise<{
    tradesCreated: number;
    analyzedStocks: Array<{
      symbol: string;
      action: string;
      rsi: number;
      reason: string;
      tradeCreated: boolean;
    }>;
  }> {
    logger.info(`Analyzing ${symbols.length} symbols...`);

    const analyzedStocks = [];
    let tradesCreated = 0;

    for (const symbol of symbols) {
      try {
        const analysis = await TradingStrategy.analyzeStock(symbol);

        analyzedStocks.push({
          symbol,
          action: analysis.action,
          rsi: analysis.indicators.rsi,
          reason: analysis.reason,
          tradeCreated: false,
        });

        if (analysis.shouldTrade) {
          // Check if we already have an open position
          const existingTrades = db.getTradesBySymbol(symbol);
          const hasOpenPosition = existingTrades.some(t => t.status === 'OPEN');

          if (!hasOpenPosition) {
            const portfolio = db.getPortfolio();
            const trade = TradingStrategy.createTradeFromAnalysis(
              symbol,
              analysis,
              portfolio.cash
            );

            if (trade.quantity > 0) {
              await this.executeTrade(trade);
              tradesCreated++;
              analyzedStocks[analyzedStocks.length - 1].tradeCreated = true;
              logger.info(`Created trade for ${symbol}`);
            }
          } else {
            logger.info(`Already have open position in ${symbol}, skipping`);
          }
        }
      } catch (error) {
        logger.error(`Error analyzing ${symbol}:`, error);
        analyzedStocks.push({
          symbol,
          action: 'ERROR',
          rsi: 0,
          reason: 'Failed to analyze',
          tradeCreated: false,
        });
      }
    }

    logger.info(`Analysis complete: ${tradesCreated} trades created from ${symbols.length} symbols`);

    return {
      tradesCreated,
      analyzedStocks,
    };
  }

  // Calculate portfolio statistics
  getPortfolioStats() {
    const stats = db.getStats();
    const portfolio = db.getPortfolio();
    const openTrades = db.getOpenTrades();

    const investedCapital = openTrades.reduce((sum, trade) => {
      if (trade.action === 'BUY') {
        return sum + (trade.entryPrice * trade.quantity);
      }
      return sum;
    }, 0);

    const totalValue = portfolio.cash + investedCapital;

    return {
      cash: portfolio.cash,
      initialCash: portfolio.initialCash,
      investedCapital,
      totalValue,
      totalReturn: ((totalValue - portfolio.initialCash) / portfolio.initialCash) * 100,
      ...stats,
    };
  }
}
