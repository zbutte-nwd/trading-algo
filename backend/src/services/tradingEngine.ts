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

  // Monitor open positions and sync with Alpaca
  async monitorPositions(): Promise<void> {
    if (!this.alpacaService || !config.trading.useAlpaca) {
      logger.info('Alpaca not enabled, skipping position monitoring');
      return;
    }

    try {
      // Get live positions from Alpaca
      const alpacaPositions = await this.alpacaService.getPositions();
      const localTrades = db.getOpenTrades();

      logger.info(`Monitoring ${alpacaPositions.length} Alpaca positions (${localTrades.length} local trades)`);

      // Log current positions with P&L
      for (const position of alpacaPositions) {
        const pnlPercent = (position.unrealizedPLPercent * 100).toFixed(2);
        const pnlColor = position.unrealizedPL >= 0 ? '+' : '';
        logger.info(`${position.symbol}: ${pnlColor}$${position.unrealizedPL.toFixed(2)} (${pnlColor}${pnlPercent}%) @ $${position.currentPrice}`);
      }

      // Sync: close local trades that are no longer in Alpaca (stopped out or took profit)
      for (const localTrade of localTrades) {
        const stillOpen = alpacaPositions.some(p => p.symbol === localTrade.symbol);

        if (!stillOpen && localTrade.notes?.includes('Alpaca Order ID:')) {
          logger.info(`Position ${localTrade.symbol} closed in Alpaca, updating local database`);
          // Position was closed by bracket order (stop loss or take profit)
          await this.closeTrade(localTrade.id!);
        }
      }
    } catch (error) {
      logger.error('Error monitoring Alpaca positions:', error);
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
  async getPortfolioStats() {
    const stats = db.getStats();
    const portfolio = db.getPortfolio();
    const openTrades = db.getOpenTrades();

    let accountBalance = portfolio.cash;
    let totalValue = portfolio.cash;

    // If using Alpaca, get real account data
    if (this.alpacaService && config.trading.useAlpaca) {
      try {
        const alpacaAccount = await this.alpacaService.getAccount();
        const alpacaPositions = await this.alpacaService.getPositions();

        accountBalance = alpacaAccount.cash;
        totalValue = alpacaAccount.portfolioValue;

        logger.info(`Alpaca account: $${accountBalance} cash, $${totalValue} total value, ${alpacaPositions.length} positions`);
      } catch (error) {
        logger.error('Failed to fetch Alpaca account data, using local data:', error);
      }
    }

    const investedCapital = openTrades.reduce((sum, trade) => {
      if (trade.action === 'BUY') {
        return sum + (trade.entryPrice * trade.quantity);
      }
      return sum;
    }, 0);

    return {
      accountBalance,
      cash: portfolio.cash,
      initialCash: portfolio.initialCash,
      investedCapital,
      totalValue,
      totalReturn: ((totalValue - portfolio.initialCash) / portfolio.initialCash) * 100,
      ...stats,
    };
  }

  // Screen stocks for signals (used by end-of-day screening)
  async screenStocksForSignals(watchlist: string[]): Promise<{ picks: any[] }> {
    const strategy = new TradingStrategy();
    const picks: any[] = [];

    for (const symbol of watchlist) {
      try {
        const analysis = await strategy.analyze(symbol);

        if (analysis.signal !== 'HOLD') {
          picks.push({
            symbol,
            signal: analysis.signal,
            price: analysis.currentPrice,
            rsi: analysis.rsi,
            maShort: analysis.maShort,
            maLong: analysis.maLong,
            stopLoss: analysis.stopLoss,
            takeProfit: analysis.takeProfit,
            reason: analysis.reason
          });
        }
      } catch (error) {
        // Skip stocks that error
        continue;
      }
    }

    return { picks };
  }

  // Execute screened picks (used by pre-market execution)
  async executeScreenedPicks(picks: any[]): Promise<{ entered: number; skipped: number }> {
    let entered = 0;
    let skipped = 0;

    for (const pick of picks) {
      try {
        const portfolio = db.getPortfolio();
        const cost = pick.price * 100; // Default 100 shares

        if (cost > portfolio.cash) {
          skipped++;
          continue;
        }

        const trade: Omit<Trade, 'id'> = {
          symbol: pick.symbol,
          type: 'STOCK',
          action: pick.signal === 'BUY' ? 'BUY' : 'SELL',
          quantity: 100,
          entryPrice: pick.price,
          entryDate: new Date().toISOString(),
          stopLoss: pick.stopLoss,
          takeProfit: pick.takeProfit,
          status: 'OPEN',
          strategy: 'RSI_MA_CROSSOVER',
          entryReason: pick.reason,
          exitCriteria: `SL: ${pick.stopLoss.toFixed(2)}, TP: ${pick.takeProfit.toFixed(2)}`,
          rsi: pick.rsi,
          maShort: pick.maShort,
          maLong: pick.maLong
        };

        await this.executeTrade(trade);
        db.markScreeningResultExecuted(pick.id);
        entered++;
      } catch (error) {
        logger.error(`Error executing pick for ${pick.symbol}:`, error);
        skipped++;
      }
    }

    return { entered, skipped };
  }

  // Check exit conditions for a single trade
  async checkExitConditions(trade: Trade): Promise<void> {
    try {
      const strategy = new TradingStrategy();
      const analysis = await strategy.analyze(trade.symbol);

      // Check stop loss
      if (analysis.currentPrice <= trade.stopLoss) {
        logger.info(`Stop loss hit for ${trade.symbol} at ${analysis.currentPrice}`);
        db.closeTrade(trade.id, analysis.currentPrice, new Date().toISOString(), 'Stop loss triggered');
        return;
      }

      // Check take profit
      if (analysis.currentPrice >= trade.takeProfit) {
        logger.info(`Take profit hit for ${trade.symbol} at ${analysis.currentPrice}`);
        db.closeTrade(trade.id, analysis.currentPrice, new Date().toISOString(), 'Take profit triggered');
        return;
      }

      // Check signal reversal
      if (trade.action === 'BUY' && analysis.signal === 'SELL') {
        logger.info(`Exit signal for ${trade.symbol} at ${analysis.currentPrice}`);
        db.closeTrade(trade.id, analysis.currentPrice, new Date().toISOString(), analysis.reason);
      }
    } catch (error) {
      logger.error(`Error checking exit conditions for ${trade.symbol}:`, error);
    }
  }

  // Quick price check (for hourly watchlist polling)
  async quickPriceCheck(symbol: string): Promise<void> {
    try {
      if (this.alpacaService) {
        const quote = await this.alpacaService.getQuote(symbol);
        logger.info(`${symbol}: $${quote.price}`);
      }
    } catch (error) {
      // Silent fail for watchlist checks
    }
  }
}
