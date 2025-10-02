import yahooFinance from 'yahoo-finance2';
import { StockData } from '../types';
import { logger } from '../utils/logger';
import { db } from '../database';

interface QuoteCache {
  data: any;
  timestamp: number;
}

class YahooMarketDataService {
  private quoteCache: Map<string, QuoteCache> = new Map();
  private readonly QUOTE_CACHE_DURATION = 86400000; // 24 hours in milliseconds

  async getQuote(symbol: string): Promise<any> {
    // Check in-memory cache first
    const cached = this.quoteCache.get(symbol);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.QUOTE_CACHE_DURATION) {
      const ageHours = Math.floor((now - cached.timestamp) / 3600000);
      logger.info(`Using cached quote for ${symbol} (${ageHours}h old)`);
      return cached.data;
    }
    try {
      const result = await yahooFinance.quoteSummary(symbol, { modules: ['price'] });
      const quote = result.price;

      const quoteData = {
        symbol: symbol,
        price: quote?.regularMarketPrice || 0,
        change: quote?.regularMarketChange || 0,
        changePercent: quote?.regularMarketChangePercent?.toFixed(2) + '%' || '0%',
        volume: quote?.regularMarketVolume || 0,
        previousClose: quote?.regularMarketPreviousClose || 0,
        open: quote?.regularMarketOpen || 0,
        high: quote?.regularMarketDayHigh || 0,
        low: quote?.regularMarketDayLow || 0,
      };

      // Cache the result
      this.quoteCache.set(symbol, {
        data: quoteData,
        timestamp: now
      });

      logger.info(`Fetched fresh quote for ${symbol} from Yahoo Finance`);
      return quoteData;
    } catch (error) {
      logger.error(`Error fetching quote for ${symbol}:`, error);
      throw error;
    }
  }

  async getDailyData(symbol: string, outputsize: 'compact' | 'full' = 'compact'): Promise<StockData[]> {
    try {
      // Check cache first
      const cached = db.getCachedPriceData(symbol, outputsize === 'compact' ? 100 : 1000);
      const cacheAge = cached.length > 0 ? Date.now() - new Date(cached[0].timestamp).getTime() : Infinity;

      // Use cache if less than 24 hours old (86400000 ms)
      if (cached.length > 0 && cacheAge < 86400000) {
        logger.info(`Using cached data for ${symbol} (${Math.floor(cacheAge / 3600000)}h old)`);
        return cached.map(row => ({
          symbol,
          timestamp: row.timestamp,
          open: row.open,
          high: row.high,
          low: row.low,
          close: row.close,
          volume: row.volume,
        }));
      }

      const endDate = new Date();
      const startDate = new Date();

      // Get more data for 'full' request
      if (outputsize === 'full') {
        startDate.setFullYear(startDate.getFullYear() - 2); // 2 years
      } else {
        startDate.setMonth(startDate.getMonth() - 3); // 3 months
      }

      const result = await yahooFinance.historical(symbol, {
        period1: startDate,
        period2: endDate,
        interval: '1d',
      });

      const data: StockData[] = result.map(row => ({
        symbol,
        timestamp: row.date.toISOString().split('T')[0],
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
        volume: row.volume,
      })).reverse(); // Most recent first

      // Cache the data
      if (data.length > 0) {
        db.cachePriceData(symbol, data);
      }

      return data;
    } catch (error) {
      logger.error(`Error fetching daily data for ${symbol}:`, error);

      // Try to return cached data even if old
      const cached = db.getCachedPriceData(symbol, outputsize === 'compact' ? 100 : 1000);
      if (cached.length > 0) {
        logger.warn(`Using stale cached data for ${symbol}`);
        return cached as StockData[];
      }

      throw error;
    }
  }

  async getIntradayData(symbol: string, interval: '1min' | '5min' | '15min' | '30min' | '60min' = '5min'): Promise<StockData[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // Last 7 days

      // Map our intervals to Yahoo Finance intervals
      const yahooInterval = interval === '60min' ? '1h' : interval.replace('min', 'm');

      const result = await yahooFinance.historical(symbol, {
        period1: startDate,
        period2: endDate,
        interval: yahooInterval as any,
      });

      return result.map(row => ({
        symbol,
        timestamp: row.date.toISOString(),
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
        volume: row.volume,
      })).reverse();
    } catch (error) {
      logger.error(`Error fetching intraday data for ${symbol}:`, error);
      throw error;
    }
  }

  async search(query: string): Promise<any[]> {
    try {
      const results = await yahooFinance.search(query);
      return results.quotes.map(q => ({
        symbol: q.symbol,
        name: q.longname || q.shortname,
        type: q.quoteType,
        exchange: q.exchange,
      }));
    } catch (error) {
      logger.error(`Error searching for ${query}:`, error);
      throw error;
    }
  }
}

export const yahooMarketDataService = new YahooMarketDataService();
