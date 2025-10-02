export interface StockData {
  symbol: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  rsi: number;
  maShort: number;
  maLong: number;
  signal: 'BUY' | 'SELL' | 'HOLD';
}

export interface ScreeningCriteria {
  minPrice?: number;
  maxPrice?: number;
  minVolume?: number;
  minRsi?: number;
  maxRsi?: number;
  requireMaCrossover?: boolean;
}

export interface Trade {
  id?: number;
  symbol: string;
  type: 'STOCK' | 'OPTION';
  action: 'BUY' | 'SELL';
  quantity: number;
  entryPrice: number;
  entryDate: string;
  exitPrice?: number;
  exitDate?: string;
  stopLoss: number;
  takeProfit: number;
  status: 'OPEN' | 'CLOSED';
  pnl?: number;
  pnlPercent?: number;
  strategy: string;
  entryReason: string;
  exitCriteria: string;
  exitReason?: string;
  rsi?: number;
  maShort?: number;
  maLong?: number;
}

export interface Position {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

export interface PortfolioStats {
  totalValue: number;
  cash: number;
  invested: number;
  totalPnL: number;
  totalPnLPercent: number;
  openPositions: number;
  closedTrades: number;
  winRate: number;
}

export interface WatchlistItem {
  symbol: string;
  name?: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  rsi?: number;
  signal?: string;
}
