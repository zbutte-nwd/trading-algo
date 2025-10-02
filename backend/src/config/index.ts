import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  alphaVantageApiKey: process.env.ALPHA_VANTAGE_API_KEY || '',

  // Alpaca Configuration
  alpaca: {
    keyId: process.env.ALPACA_API_KEY || '',
    secretKey: process.env.ALPACA_SECRET_KEY || '',
    paper: process.env.ALPACA_PAPER === 'true' || true, // Default to paper trading
  },

  trading: {
    initialCapital: parseFloat(process.env.INITIAL_CAPITAL || '100000'),
    maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE || '0.1'),
    riskPerTrade: parseFloat(process.env.RISK_PER_TRADE || '0.02'),
    useAlpaca: process.env.USE_ALPACA === 'true' || false, // Toggle between Alpaca and simulation
    useAlpacaMarketData: process.env.USE_ALPACA_MARKET_DATA === 'true' || false, // Toggle between Alpaca and Yahoo for historical data
  },

  strategy: {
    rsiPeriod: parseInt(process.env.RSI_PERIOD || '14'),
    rsiOversold: parseInt(process.env.RSI_OVERSOLD || '30'),
    rsiOverbought: parseInt(process.env.RSI_OVERBOUGHT || '70'),
    maShortPeriod: parseInt(process.env.MA_SHORT_PERIOD || '20'),
    maLongPeriod: parseInt(process.env.MA_LONG_PERIOD || '50'),
  },

  screening: {
    minPrice: parseFloat(process.env.MIN_PRICE || '5'),
    maxPrice: parseFloat(process.env.MAX_PRICE || '500'),
    minVolume: parseInt(process.env.MIN_VOLUME || '1000000'),
    minRsi: parseFloat(process.env.MIN_RSI || '25'),
    maxRsi: parseFloat(process.env.MAX_RSI || '35'),
  },

  database: {
    path: './trading.db',
  },
};
