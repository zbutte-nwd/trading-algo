import { StockData, TechnicalIndicators } from '../types';
import { config } from '../config';

export class TechnicalAnalysis {
  // Calculate RSI (Relative Strength Index)
  static calculateRSI(data: StockData[], period: number = config.strategy.rsiPeriod): number {
    if (data.length < period + 1) {
      throw new Error(`Insufficient data for RSI calculation. Need at least ${period + 1} data points`);
    }

    const prices = data.map(d => d.close).reverse();
    let gains = 0;
    let losses = 0;

    // Calculate initial average gain and loss
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Calculate RSI using smoothed averages
    for (let i = period + 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  // Calculate Simple Moving Average
  static calculateSMA(data: StockData[], period: number): number {
    if (data.length < period) {
      throw new Error(`Insufficient data for SMA calculation. Need at least ${period} data points`);
    }

    const sum = data.slice(0, period).reduce((acc, d) => acc + d.close, 0);
    return sum / period;
  }

  // Calculate Exponential Moving Average
  static calculateEMA(data: StockData[], period: number): number {
    if (data.length < period) {
      throw new Error(`Insufficient data for EMA calculation. Need at least ${period} data points`);
    }

    const multiplier = 2 / (period + 1);
    const prices = data.map(d => d.close).reverse();

    // Start with SMA
    let ema = prices.slice(0, period).reduce((acc, p) => acc + p, 0) / period;

    // Calculate EMA
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  // Calculate Bollinger Bands
  static calculateBollingerBands(data: StockData[], period: number = 20, stdDev: number = 2) {
    const sma = this.calculateSMA(data, period);
    const prices = data.slice(0, period).map(d => d.close);

    // Calculate standard deviation
    const squaredDiffs = prices.map(price => Math.pow(price - sma, 2));
    const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / period;
    const standardDeviation = Math.sqrt(variance);

    return {
      upper: sma + (standardDeviation * stdDev),
      middle: sma,
      lower: sma - (standardDeviation * stdDev),
    };
  }

  // Calculate MACD
  static calculateMACD(data: StockData[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) {
    const emaFast = this.calculateEMA(data, fastPeriod);
    const emaSlow = this.calculateEMA(data, slowPeriod);
    const macdLine = emaFast - emaSlow;

    // For signal line, we'd need to calculate EMA of MACD line
    // Simplified version returns just the MACD line
    return {
      macd: macdLine,
      signal: 0, // Simplified
      histogram: macdLine,
    };
  }

  // Get all technical indicators
  static getIndicators(data: StockData[]): TechnicalIndicators {
    const rsi = this.calculateRSI(data);
    const maShort = this.calculateSMA(data, config.strategy.maShortPeriod);
    const maLong = this.calculateSMA(data, config.strategy.maLongPeriod);

    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';

    // RSI + MA Crossover Strategy
    const isOversold = rsi < config.strategy.rsiOversold;
    const isBullishCrossover = maShort > maLong;

    const isOverbought = rsi > config.strategy.rsiOverbought;
    const isBearishCrossover = maShort < maLong;

    if (isOversold && isBullishCrossover) {
      signal = 'BUY';
    } else if (isOverbought && isBearishCrossover) {
      signal = 'SELL';
    }

    return {
      rsi,
      maShort,
      maLong,
      signal,
    };
  }

  // Calculate support and resistance levels
  static calculateSupportResistance(data: StockData[], lookback: number = 20) {
    const recentData = data.slice(0, lookback);
    const highs = recentData.map(d => d.high);
    const lows = recentData.map(d => d.low);

    return {
      resistance: Math.max(...highs),
      support: Math.min(...lows),
    };
  }

  // Calculate Average True Range (ATR) for volatility
  static calculateATR(data: StockData[], period: number = 14): number {
    if (data.length < period + 1) {
      throw new Error(`Insufficient data for ATR calculation`);
    }

    const trueRanges: number[] = [];

    for (let i = 0; i < data.length - 1; i++) {
      const high = data[i].high;
      const low = data[i].low;
      const prevClose = data[i + 1].close;

      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );

      trueRanges.push(tr);
    }

    const atr = trueRanges.slice(0, period).reduce((acc, tr) => acc + tr, 0) / period;
    return atr;
  }
}
