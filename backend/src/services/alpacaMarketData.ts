import { createAlpacaService } from './alpacaService';
import { config } from '../config';
import { logger } from '../utils/logger';
import { StockData } from '../types';
import { db } from '../database';

class AlpacaMarketDataService {
  private alpacaService: ReturnType<typeof createAlpacaService> | null = null;
  private quoteCache: Map<string, { data: any; timestamp: number }> = new Map();
  private dailyDataCache: Map<string, { data: StockData[]; timestamp: number }> = new Map();
  private readonly CACHE_DURATION_MS = 300000; // 5 minute cache (was 1 min)
  private apiCallCount = 0;
  private lastResetTime = Date.now();
  private readonly API_LIMIT_PER_MINUTE = 100; // Target 50% of 200 limit

  constructor() {
    if (config.alpaca.keyId && config.alpaca.secretKey) {
      this.alpacaService = createAlpacaService(config.alpaca);
    } else {
      logger.warn('Alpaca credentials not configured. Market data service will not be available.');
    }
  }

  private resetApiCounter() {
    const now = Date.now();
    if (now - this.lastResetTime >= 60000) {
      this.apiCallCount = 0;
      this.lastResetTime = now;
    }
  }

  private async waitForRateLimit(): Promise<void> {
    this.resetApiCounter();
    if (this.apiCallCount >= this.API_LIMIT_PER_MINUTE) {
      const waitTime = 60000 - (Date.now() - this.lastResetTime);
      if (waitTime > 0) {
        logger.warn(`Rate limit reached. Waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.apiCallCount = 0;
        this.lastResetTime = Date.now();
      }
    }
    this.apiCallCount++;
  }

  private getCached<T>(cache: Map<string, { data: T; timestamp: number }>, key: string): T | null {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION_MS) {
      return cached.data;
    }
    return null;
  }

  private isMarketHours(): boolean {
    const now = new Date();
    const day = now.getDay();
    if (day === 0 || day === 6) return false; // Weekend

    const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const hours = estTime.getHours();
    const minutes = estTime.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    const marketOpen = 9 * 60 + 30;  // 9:30 AM EST
    const marketClose = 16 * 60;      // 4:00 PM EST

    return totalMinutes >= marketOpen && totalMinutes < marketClose;
  }

  // Get real-time quote
  async getQuote(symbol: string): Promise<{
    symbol: string;
    price: number;
    change: number;
    changePercent: string;
    volume: number;
    previousClose: number;
    open: number;
    high: number;
    low: number;
  }> {
    if (!this.alpacaService) {
      throw new Error('Alpaca service not initialized');
    }

    // Check memory cache first (5 min)
    const memCached = this.getCached(this.quoteCache, symbol);
    if (memCached) {
      return memCached;
    }

    // During off-market hours, use longer database cache (60 min)
    // During market hours, use shorter database cache (5 min)
    const dbCacheMinutes = this.isMarketHours() ? 5 : 60;
    const dbCached = db.getCachedQuote(symbol, dbCacheMinutes);
    if (dbCached) {
      const result = {
        symbol: dbCached.symbol,
        price: dbCached.price,
        change: dbCached.change,
        changePercent: dbCached.changePercent,
        volume: dbCached.volume,
        previousClose: dbCached.previousClose,
        open: dbCached.open,
        high: dbCached.high,
        low: dbCached.low,
      };
      // Store in memory cache
      this.quoteCache.set(symbol, { data: result, timestamp: Date.now() });
      return result;
    }

    try {
      await this.waitForRateLimit();
      const quote = await this.alpacaService.getQuote(symbol);

      await this.waitForRateLimit();
      // Get previous day's close to calculate change
      const bars = await this.alpacaService.getHistoricalBars(symbol, '1Day', 2);
      const previousClose = bars.length >= 2 ? bars[1].close : quote.price;
      const open = bars.length >= 1 ? bars[0].open : quote.price;
      const high = bars.length >= 1 ? bars[0].high : quote.price;
      const low = bars.length >= 1 ? bars[0].low : quote.price;
      const volume = bars.length >= 1 ? bars[0].volume : 0;

      const change = quote.price - previousClose;
      const changePercent = previousClose > 0 ? ((change / previousClose) * 100).toFixed(2) + '%' : '0%';

      const result = {
        symbol: quote.symbol,
        price: quote.price,
        change,
        changePercent,
        volume,
        previousClose,
        open,
        high,
        low,
      };

      // Cache in both memory and database
      this.quoteCache.set(symbol, { data: result, timestamp: Date.now() });
      db.cacheQuote(symbol, result);

      return result;
    } catch (error) {
      logger.error(`Error fetching quote for ${symbol}:`, error);
      throw error;
    }
  }

  // Get historical daily data
  async getDailyData(symbol: string, outputSize: 'compact' | 'full' = 'compact'): Promise<StockData[]> {
    if (!this.alpacaService) {
      throw new Error('Alpaca service not initialized');
    }

    // Check cache first
    const cacheKey = `${symbol}_${outputSize}`;
    const cached = this.getCached(this.dailyDataCache, cacheKey);
    if (cached) {
      return cached;
    }

    try {
      await this.waitForRateLimit();
      // Compact = 100 days, Full = 1000 days
      const limit = outputSize === 'compact' ? 100 : 1000;

      const bars = await this.alpacaService.getHistoricalBars(symbol, '1Day', limit);

      // Check if we got data
      if (!bars || bars.length === 0) {
        logger.warn(`No historical data available for ${symbol} from Alpaca. Your account may not have data access. Consider upgrading to Alpaca Premium for full market data.`);
        throw new Error('No historical data available - upgrade Alpaca account for market data access');
      }

      // Convert Alpaca format to StockData format
      const stockData: StockData[] = bars.map(bar => ({
        date: new Date(bar.timestamp).toISOString().split('T')[0],
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
      }));

      // Sort by date descending (most recent first)
      stockData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Cache the result
      this.dailyDataCache.set(cacheKey, { data: stockData, timestamp: Date.now() });

      return stockData;
    } catch (error) {
      logger.error(`Error fetching daily data for ${symbol}:`, error);
      throw error;
    }
  }

  // Clear all caches (useful for testing or manual refresh)
  clearCache(): void {
    this.quoteCache.clear();
    this.dailyDataCache.clear();
    logger.info('All caches cleared');
  }

  // Get current API usage stats
  getApiStats() {
    return {
      callsThisMinute: this.apiCallCount,
      limit: this.API_LIMIT_PER_MINUTE,
      percentUsed: ((this.apiCallCount / this.API_LIMIT_PER_MINUTE) * 100).toFixed(1) + '%',
      quoteCacheSize: this.quoteCache.size,
      dailyDataCacheSize: this.dailyDataCache.size,
    };
  }
}

export const alpacaMarketDataService = new AlpacaMarketDataService();
