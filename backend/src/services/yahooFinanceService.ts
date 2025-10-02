import yahooFinance from 'yahoo-finance2';
import { StockData } from '../types';
import { logger } from '../utils/logger';

class YahooFinanceService {
  private cache: Map<string, { data: StockData[]; timestamp: number }> = new Map();
  private readonly CACHE_DURATION_MS = 3600000; // 1 hour cache for historical data

  /**
   * Get historical daily data for a symbol
   * @param symbol Stock symbol (e.g., 'AAPL')
   * @param days Number of days of historical data (default 100)
   */
  async getHistoricalData(symbol: string, days: number = 100): Promise<StockData[]> {
    // Check cache first
    const cacheKey = `${symbol}_${days}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION_MS) {
      logger.info(`Using cached data for ${symbol}`);
      return cached.data;
    }

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      logger.info(`Fetching ${days} days of historical data for ${symbol} from Yahoo Finance`);

      const result = await yahooFinance.historical(symbol, {
        period1: startDate,
        period2: endDate,
        interval: '1d',
      });

      if (!result || result.length === 0) {
        throw new Error(`No data available for ${symbol}`);
      }

      // Convert Yahoo Finance format to our StockData format
      const stockData: StockData[] = result.map(bar => ({
        date: bar.date.toISOString().split('T')[0],
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
      }));

      // Sort by date descending (most recent first)
      stockData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Cache the result
      this.cache.set(cacheKey, { data: stockData, timestamp: Date.now() });

      logger.info(`Retrieved ${stockData.length} days of data for ${symbol}`);
      return stockData;
    } catch (error) {
      logger.error(`Error fetching Yahoo Finance data for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get current quote for a symbol
   */
  async getQuote(symbol: string) {
    try {
      const quote = await yahooFinance.quote(symbol);

      if (!quote) {
        throw new Error(`No quote data available for ${symbol}`);
      }

      return {
        symbol: quote.symbol,
        price: quote.regularMarketPrice || 0,
        change: quote.regularMarketChange || 0,
        changePercent: `${((quote.regularMarketChangePercent || 0)).toFixed(2)}%`,
        volume: quote.regularMarketVolume || 0,
        previousClose: quote.regularMarketPreviousClose || 0,
        open: quote.regularMarketOpen || 0,
        high: quote.regularMarketDayHigh || 0,
        low: quote.regularMarketDayLow || 0,
      };
    } catch (error) {
      logger.error(`Error fetching Yahoo Finance quote for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Yahoo Finance cache cleared');
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      cacheDurationMinutes: this.CACHE_DURATION_MS / 60000,
    };
  }
}

export const yahooFinanceService = new YahooFinanceService();
