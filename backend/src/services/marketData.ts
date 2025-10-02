import axios from 'axios';
import { config } from '../config';
import { StockData } from '../types';
import { logger } from '../utils/logger';
import { db } from '../database';

class MarketDataService {
  private baseUrl = 'https://www.alphavantage.co/query';
  private apiKey = config.alphaVantageApiKey;
  private requestQueue: Promise<any>[] = [];
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 12000; // 12 seconds (5 requests per minute for free tier)

  private async throttle(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const delay = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
  }

  async getQuote(symbol: string): Promise<any> {
    try {
      await this.throttle();

      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol,
          apikey: this.apiKey,
        },
      });

      if (response.data['Error Message']) {
        throw new Error(`API Error: ${response.data['Error Message']}`);
      }

      if (response.data['Note']) {
        logger.warn('API rate limit reached, using cached data if available');
        const cached = db.getCachedPriceData(symbol, 1);
        if (cached.length > 0) {
          return this.formatCachedQuote(cached[0]);
        }
        throw new Error('Rate limit reached and no cached data available');
      }

      const quote = response.data['Global Quote'];
      return {
        symbol: quote['01. symbol'],
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changePercent: quote['10. change percent'],
        volume: parseInt(quote['06. volume']),
        previousClose: parseFloat(quote['08. previous close']),
        open: parseFloat(quote['02. open']),
        high: parseFloat(quote['03. high']),
        low: parseFloat(quote['04. low']),
      };
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

      // Use cache if less than 1 hour old
      if (cached.length > 0 && cacheAge < 3600000) {
        logger.info(`Using cached data for ${symbol}`);
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

      await this.throttle();

      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'TIME_SERIES_DAILY',
          symbol,
          outputsize,
          apikey: this.apiKey,
        },
      });

      if (response.data['Error Message']) {
        throw new Error(`API Error: ${response.data['Error Message']}`);
      }

      if (response.data['Note']) {
        logger.warn('API rate limit reached for daily data');
        if (cached.length > 0) return cached as StockData[];
        throw new Error('Rate limit reached and no cached data available');
      }

      const timeSeries = response.data['Time Series (Daily)'];
      if (!timeSeries) {
        throw new Error('No time series data received');
      }

      const data: StockData[] = Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
        symbol,
        timestamp: date,
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: parseInt(values['5. volume']),
      }));

      // Cache the data
      db.cachePriceData(symbol, data);

      return data;
    } catch (error) {
      logger.error(`Error fetching daily data for ${symbol}:`, error);
      throw error;
    }
  }

  async getIntradayData(symbol: string, interval: '1min' | '5min' | '15min' | '30min' | '60min' = '5min'): Promise<StockData[]> {
    try {
      await this.throttle();

      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'TIME_SERIES_INTRADAY',
          symbol,
          interval,
          apikey: this.apiKey,
        },
      });

      if (response.data['Error Message']) {
        throw new Error(`API Error: ${response.data['Error Message']}`);
      }

      const timeSeries = response.data[`Time Series (${interval})`];
      if (!timeSeries) {
        throw new Error('No intraday data received');
      }

      return Object.entries(timeSeries).map(([timestamp, values]: [string, any]) => ({
        symbol,
        timestamp,
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: parseInt(values['5. volume']),
      }));
    } catch (error) {
      logger.error(`Error fetching intraday data for ${symbol}:`, error);
      throw error;
    }
  }

  private formatCachedQuote(cached: any) {
    return {
      symbol: cached.symbol,
      price: cached.close,
      change: 0,
      changePercent: '0%',
      volume: cached.volume,
      previousClose: cached.close,
      open: cached.open,
      high: cached.high,
      low: cached.low,
    };
  }
}

export const marketDataService = new MarketDataService();
