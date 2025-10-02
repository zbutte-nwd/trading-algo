import { StockData, Trade, ScreeningCriteria } from '../types';
import { TechnicalAnalysis } from './indicators';
import { yahooMarketDataService } from './yahooMarketData';
import { config } from '../config';
import { logger } from '../utils/logger';

export class TradingStrategy {
  // RSI + Moving Average Crossover Strategy
  static async analyzeStock(symbol: string): Promise<{
    shouldTrade: boolean;
    action: 'BUY' | 'SELL' | 'HOLD';
    indicators: any;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    reason: string;
  }> {
    try {
      // Get historical data
      const dailyData = await yahooMarketDataService.getDailyData(symbol, 'compact');

      if (dailyData.length < config.strategy.maLongPeriod + 10) {
        throw new Error(`Insufficient data for analysis`);
      }

      // Calculate indicators
      const indicators = TechnicalAnalysis.getIndicators(dailyData);
      const atr = TechnicalAnalysis.calculateATR(dailyData);
      const supportResistance = TechnicalAnalysis.calculateSupportResistance(dailyData);

      const currentPrice = dailyData[0].close;
      const { rsi, maShort, maLong, signal } = indicators;

      // Determine if we should trade
      let shouldTrade = false;
      let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
      let reason = '';
      let stopLoss = 0;
      let takeProfit = 0;

      // BUY Signal: RSI oversold + MA bullish crossover
      if (signal === 'BUY') {
        shouldTrade = true;
        action = 'BUY';
        reason = `RSI oversold (${rsi.toFixed(2)}) with bullish MA crossover (MA${config.strategy.maShortPeriod}: ${maShort.toFixed(2)} > MA${config.strategy.maLongPeriod}: ${maLong.toFixed(2)})`;

        // Stop loss: 2 ATR below entry or at recent support
        stopLoss = Math.max(currentPrice - (2 * atr), supportResistance.support * 0.98);

        // Take profit: 3:1 risk-reward ratio
        const risk = currentPrice - stopLoss;
        takeProfit = currentPrice + (risk * 3);
      }
      // SELL Signal: RSI overbought + MA bearish crossover
      else if (signal === 'SELL') {
        shouldTrade = true;
        action = 'SELL';
        reason = `RSI overbought (${rsi.toFixed(2)}) with bearish MA crossover (MA${config.strategy.maShortPeriod}: ${maShort.toFixed(2)} < MA${config.strategy.maLongPeriod}: ${maLong.toFixed(2)})`;

        // For short positions
        stopLoss = Math.min(currentPrice + (2 * atr), supportResistance.resistance * 1.02);
        const risk = stopLoss - currentPrice;
        takeProfit = currentPrice - (risk * 3);
      }
      else {
        reason = `No clear signal. RSI: ${rsi.toFixed(2)}, MA${config.strategy.maShortPeriod}: ${maShort.toFixed(2)}, MA${config.strategy.maLongPeriod}: ${maLong.toFixed(2)}`;
      }

      return {
        shouldTrade,
        action,
        indicators: {
          rsi,
          maShort,
          maLong,
          atr,
          support: supportResistance.support,
          resistance: supportResistance.resistance,
        },
        entryPrice: currentPrice,
        stopLoss,
        takeProfit,
        reason,
      };
    } catch (error) {
      logger.error(`Error analyzing ${symbol}:`, error);
      throw error;
    }
  }

  // Screen stocks based on criteria
  static async screenStocks(symbols: string[], criteria?: ScreeningCriteria): Promise<Array<{
    symbol: string;
    analysis: any;
  }>> {
    const results: Array<{ symbol: string; analysis: any }> = [];
    const screenCriteria = criteria || config.screening;

    for (const symbol of symbols) {
      try {
        logger.info(`Screening ${symbol}...`);

        const analysis = await this.analyzeStock(symbol);

        // Apply screening criteria
        const meetsPrice = analysis.entryPrice >= (screenCriteria.minPrice || 0) &&
                          analysis.entryPrice <= (screenCriteria.maxPrice || Infinity);

        const meetsRsi = analysis.indicators.rsi >= (screenCriteria.minRsi || 0) &&
                        analysis.indicators.rsi <= (screenCriteria.maxRsi || 100);

        const meetsCrossover = !screenCriteria.requireMaCrossover ||
                              (analysis.indicators.maShort > analysis.indicators.maLong);

        if (meetsPrice && meetsRsi && meetsCrossover && analysis.shouldTrade) {
          results.push({ symbol, analysis });
          logger.info(`${symbol} passed screening`);
        }
      } catch (error) {
        logger.error(`Error screening ${symbol}:`, error);
        // Continue with next symbol
      }
    }

    return results;
  }

  // Calculate position size based on risk management
  static calculatePositionSize(
    accountBalance: number,
    entryPrice: number,
    stopLoss: number
  ): number {
    const riskAmount = accountBalance * config.trading.riskPerTrade;
    const riskPerShare = Math.abs(entryPrice - stopLoss);

    if (riskPerShare === 0) return 0;

    const shares = Math.floor(riskAmount / riskPerShare);

    // Ensure position doesn't exceed max position size
    const maxShares = Math.floor((accountBalance * config.trading.maxPositionSize) / entryPrice);

    return Math.min(shares, maxShares);
  }

  // Generate exit criteria text
  static generateExitCriteria(stopLoss: number, takeProfit: number, action: 'BUY' | 'SELL'): string {
    if (action === 'BUY') {
      return `Exit long position if:\n` +
             `1. Price hits stop loss at $${stopLoss.toFixed(2)} (protect capital)\n` +
             `2. Price hits take profit at $${takeProfit.toFixed(2)} (lock in gains)\n` +
             `3. RSI exceeds 70 (overbought condition)\n` +
             `4. MA${config.strategy.maShortPeriod} crosses below MA${config.strategy.maLongPeriod} (bearish crossover)`;
    } else {
      return `Exit short position if:\n` +
             `1. Price hits stop loss at $${stopLoss.toFixed(2)} (protect capital)\n` +
             `2. Price hits take profit at $${takeProfit.toFixed(2)} (lock in gains)\n` +
             `3. RSI falls below 30 (oversold condition)\n` +
             `4. MA${config.strategy.maShortPeriod} crosses above MA${config.strategy.maLongPeriod} (bullish crossover)`;
    }
  }

  // Create trade from analysis
  static createTradeFromAnalysis(
    symbol: string,
    analysis: any,
    accountBalance: number
  ): Omit<Trade, 'id'> {
    const quantity = this.calculatePositionSize(
      accountBalance,
      analysis.entryPrice,
      analysis.stopLoss
    );

    return {
      symbol,
      type: 'STOCK',
      action: analysis.action,
      quantity,
      entryPrice: analysis.entryPrice,
      entryDate: new Date().toISOString(),
      stopLoss: analysis.stopLoss,
      takeProfit: analysis.takeProfit,
      status: 'OPEN',
      strategy: 'RSI + MA Crossover',
      entryReason: analysis.reason,
      exitCriteria: this.generateExitCriteria(analysis.stopLoss, analysis.takeProfit, analysis.action),
      rsi: analysis.indicators.rsi,
      maShort: analysis.indicators.maShort,
      maLong: analysis.indicators.maLong,
    };
  }

  // Check if open positions should be closed
  static async checkExitConditions(trade: Trade): Promise<{
    shouldExit: boolean;
    reason: string;
    currentPrice: number;
  }> {
    try {
      const quote = await yahooMarketDataService.getQuote(trade.symbol);
      const currentPrice = quote.price;

      // Check stop loss
      if (trade.action === 'BUY' && currentPrice <= trade.stopLoss) {
        return {
          shouldExit: true,
          reason: `Stop loss hit at $${currentPrice.toFixed(2)}`,
          currentPrice,
        };
      }

      if (trade.action === 'SELL' && currentPrice >= trade.stopLoss) {
        return {
          shouldExit: true,
          reason: `Stop loss hit at $${currentPrice.toFixed(2)}`,
          currentPrice,
        };
      }

      // Check take profit
      if (trade.action === 'BUY' && currentPrice >= trade.takeProfit) {
        return {
          shouldExit: true,
          reason: `Take profit target reached at $${currentPrice.toFixed(2)}`,
          currentPrice,
        };
      }

      if (trade.action === 'SELL' && currentPrice <= trade.takeProfit) {
        return {
          shouldExit: true,
          reason: `Take profit target reached at $${currentPrice.toFixed(2)}`,
          currentPrice,
        };
      }

      // Check technical indicators for reversal
      const dailyData = await yahooMarketDataService.getDailyData(trade.symbol, 'compact');
      const indicators = TechnicalAnalysis.getIndicators(dailyData);

      // Exit long if overbought or bearish crossover
      if (trade.action === 'BUY' && (indicators.rsi > 70 || indicators.signal === 'SELL')) {
        return {
          shouldExit: true,
          reason: `Technical reversal signal: RSI ${indicators.rsi.toFixed(2)}, Signal: ${indicators.signal}`,
          currentPrice,
        };
      }

      // Exit short if oversold or bullish crossover
      if (trade.action === 'SELL' && (indicators.rsi < 30 || indicators.signal === 'BUY')) {
        return {
          shouldExit: true,
          reason: `Technical reversal signal: RSI ${indicators.rsi.toFixed(2)}, Signal: ${indicators.signal}`,
          currentPrice,
        };
      }

      return {
        shouldExit: false,
        reason: 'All conditions within acceptable range',
        currentPrice,
      };
    } catch (error) {
      logger.error(`Error checking exit conditions for ${trade.symbol}:`, error);
      throw error;
    }
  }
}
