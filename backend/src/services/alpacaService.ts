import Alpaca from '@alpacahq/alpaca-trade-api';
import { logger } from '../utils/logger';

interface AlpacaConfig {
  keyId: string;
  secretKey: string;
  paper: boolean;
}

export class AlpacaService {
  private client: Alpaca;
  private isPaper: boolean;

  constructor(config: AlpacaConfig) {
    this.isPaper = config.paper;

    this.client = new Alpaca({
      keyId: config.keyId,
      secretKey: config.secretKey,
      paper: config.paper,
    });

    logger.info(`Alpaca initialized - ${config.paper ? 'Paper Trading' : 'Live Trading'} mode`);
  }

  // Get real-time quote
  async getQuote(symbol: string) {
    try {
      const quote = await this.client.getLatestTrade(symbol);

      return {
        symbol,
        price: quote.Price,
        timestamp: quote.Timestamp,
        exchange: quote.Exchange,
      };
    } catch (error) {
      logger.error(`Error fetching Alpaca quote for ${symbol}:`, error);
      throw error;
    }
  }

  // Get historical bars (candlestick data)
  async getHistoricalBars(symbol: string, timeframe: string = '1Day', limit: number = 100) {
    try {
      const bars = await this.client.getBarsV2(symbol, {
        timeframe,
        limit,
      });

      const data = [];
      for await (const bar of bars) {
        data.push({
          timestamp: bar.Timestamp,
          open: bar.OpenPrice,
          high: bar.HighPrice,
          low: bar.LowPrice,
          close: bar.ClosePrice,
          volume: bar.Volume,
        });
      }

      return data;
    } catch (error) {
      logger.error(`Error fetching historical bars for ${symbol}:`, error);
      throw error;
    }
  }

  // Get account information
  async getAccount() {
    try {
      const account = await this.client.getAccount();

      return {
        cash: parseFloat(account.cash),
        portfolioValue: parseFloat(account.portfolio_value),
        buyingPower: parseFloat(account.buying_power),
        equity: parseFloat(account.equity),
        dayTradeCount: account.daytrade_count,
        patternDayTrader: account.pattern_day_trader,
      };
    } catch (error) {
      logger.error('Error fetching Alpaca account:', error);
      throw error;
    }
  }

  // Get all positions
  async getPositions() {
    try {
      const positions = await this.client.getPositions();

      return positions.map(pos => ({
        symbol: pos.symbol,
        qty: parseFloat(pos.qty),
        avgEntryPrice: parseFloat(pos.avg_entry_price),
        currentPrice: parseFloat(pos.current_price),
        marketValue: parseFloat(pos.market_value),
        costBasis: parseFloat(pos.cost_basis),
        unrealizedPL: parseFloat(pos.unrealized_pl),
        unrealizedPLPercent: parseFloat(pos.unrealized_plpc),
        side: pos.side,
      }));
    } catch (error) {
      logger.error('Error fetching Alpaca positions:', error);
      throw error;
    }
  }

  // Place a market order
  async placeMarketOrder(symbol: string, qty: number, side: 'buy' | 'sell') {
    try {
      const order = await this.client.createOrder({
        symbol,
        qty,
        side,
        type: 'market',
        time_in_force: 'day',
      });

      logger.info(`Alpaca ${side} order placed: ${qty} shares of ${symbol}`);

      return {
        id: order.id,
        symbol: order.symbol,
        qty: parseFloat(order.qty),
        side: order.side,
        type: order.type,
        status: order.status,
        filledQty: parseFloat(order.filled_qty || '0'),
        filledAvgPrice: order.filled_avg_price ? parseFloat(order.filled_avg_price) : null,
      };
    } catch (error) {
      logger.error(`Error placing Alpaca order for ${symbol}:`, error);
      throw error;
    }
  }

  // Place a limit order
  async placeLimitOrder(symbol: string, qty: number, side: 'buy' | 'sell', limitPrice: number) {
    try {
      const order = await this.client.createOrder({
        symbol,
        qty,
        side,
        type: 'limit',
        time_in_force: 'day',
        limit_price: limitPrice,
      });

      logger.info(`Alpaca ${side} limit order placed: ${qty} shares of ${symbol} at $${limitPrice}`);

      return {
        id: order.id,
        symbol: order.symbol,
        qty: parseFloat(order.qty),
        side: order.side,
        type: order.type,
        limitPrice,
        status: order.status,
      };
    } catch (error) {
      logger.error(`Error placing Alpaca limit order for ${symbol}:`, error);
      throw error;
    }
  }

  // Place a bracket order (with stop loss and take profit)
  async placeBracketOrder(
    symbol: string,
    qty: number,
    side: 'buy' | 'sell',
    stopLoss: number,
    takeProfit: number
  ) {
    try {
      const order = await this.client.createOrder({
        symbol,
        qty,
        side,
        type: 'market',
        time_in_force: 'day',
        order_class: 'bracket',
        stop_loss: {
          stop_price: stopLoss,
        },
        take_profit: {
          limit_price: takeProfit,
        },
      });

      logger.info(`Alpaca bracket order placed: ${qty} shares of ${symbol}, SL: $${stopLoss}, TP: $${takeProfit}`);

      return {
        id: order.id,
        symbol: order.symbol,
        qty: parseFloat(order.qty),
        side: order.side,
        status: order.status,
        stopLoss,
        takeProfit,
      };
    } catch (error) {
      logger.error(`Error placing Alpaca bracket order for ${symbol}:`, error);
      throw error;
    }
  }

  // Get order status
  async getOrder(orderId: string) {
    try {
      const order = await this.client.getOrder(orderId);

      return {
        id: order.id,
        symbol: order.symbol,
        qty: parseFloat(order.qty),
        side: order.side,
        type: order.type,
        status: order.status,
        filledQty: parseFloat(order.filled_qty || '0'),
        filledAvgPrice: order.filled_avg_price ? parseFloat(order.filled_avg_price) : null,
      };
    } catch (error) {
      logger.error(`Error fetching order ${orderId}:`, error);
      throw error;
    }
  }

  // Cancel an order
  async cancelOrder(orderId: string) {
    try {
      await this.client.cancelOrder(orderId);
      logger.info(`Alpaca order ${orderId} cancelled`);
      return true;
    } catch (error) {
      logger.error(`Error cancelling order ${orderId}:`, error);
      throw error;
    }
  }

  // Get all orders
  async getOrders(status: 'open' | 'closed' | 'all' = 'all') {
    try {
      const orders = await this.client.getOrders({ status });

      return orders.map(order => ({
        id: order.id,
        symbol: order.symbol,
        qty: parseFloat(order.qty),
        side: order.side,
        type: order.type,
        status: order.status,
        filledQty: parseFloat(order.filled_qty || '0'),
        filledAvgPrice: order.filled_avg_price ? parseFloat(order.filled_avg_price) : null,
        createdAt: order.created_at,
      }));
    } catch (error) {
      logger.error('Error fetching Alpaca orders:', error);
      throw error;
    }
  }

  // Check if market is open
  async isMarketOpen() {
    try {
      const clock = await this.client.getClock();
      return clock.is_open;
    } catch (error) {
      logger.error('Error checking market status:', error);
      throw error;
    }
  }

  // Get market calendar
  async getMarketCalendar(start?: Date, end?: Date) {
    try {
      const calendar = await this.client.getCalendar({
        start: start?.toISOString().split('T')[0],
        end: end?.toISOString().split('T')[0],
      });

      return calendar.map(day => ({
        date: day.date,
        open: day.open,
        close: day.close,
      }));
    } catch (error) {
      logger.error('Error fetching market calendar:', error);
      throw error;
    }
  }
}

// Initialize Alpaca service
export const createAlpacaService = (config: AlpacaConfig) => {
  return new AlpacaService(config);
};
