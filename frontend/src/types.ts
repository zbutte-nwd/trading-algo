export interface Trade {
  id: number;
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

export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: string;
  volume: number;
  previousClose: number;
  open: number;
  high: number;
  low: number;
}

export interface StockData {
  symbol: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface WatchlistItem {
  symbol: string;
  currentPrice: number;
  change: number;
  changePercent: string;
  volume: number;
  signal?: string;
  rsi?: number;
}

export interface PortfolioStats {
  accountBalance: number;
  investedCapital: number;
  totalValue: number;
  totalPnL: number;
  winRate: number;
  openTrades: number;
  closedTrades: number;
}
