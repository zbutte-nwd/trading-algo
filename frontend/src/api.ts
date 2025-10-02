import axios from 'axios';
import { Trade, Quote, StockData, WatchlistItem, PortfolioStats } from './types';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Trades
export const getAllTrades = () => api.get<Trade[]>('/trades');
export const getOpenTrades = () => api.get<Trade[]>('/trades/open');
export const getClosedTrades = () => api.get<Trade[]>('/trades/closed');
export const getTrade = (id: number) => api.get<Trade>(`/trades/${id}`);
export const closeTrade = (id: number) => api.post<Trade>(`/trades/${id}/close`);
export const getPortfolioStats = () => api.get<PortfolioStats>('/trades/stats/portfolio');
export const getScreeningPicks = () => api.get('/trades/picks/screening');

// Market Data
export const getQuote = (symbol: string) => api.get<Quote>(`/market/quote/${symbol}`);
export const getDailyData = (symbol: string, outputsize: 'compact' | 'full' = 'compact') =>
  api.get<StockData[]>(`/market/daily/${symbol}`, { params: { outputsize } });
export const analyzeStock = (symbol: string) => api.get(`/market/analyze/${symbol}`);
export const searchSymbols = (query: string) => api.get(`/market/search`, { params: { q: query } });

// Watchlist
export const getWatchlist = () => api.get<string[]>('/watchlist');
export const getWatchlistDetails = (limit: number = 50, offset: number = 0) =>
  api.get<{ data: WatchlistItem[]; total: number; limit: number; offset: number; hasMore: boolean }>('/watchlist/details', { params: { limit, offset } });
export const addToWatchlist = (symbol: string) => api.post('/watchlist', { symbol });
export const removeFromWatchlist = (symbol: string) => api.delete(`/watchlist/${symbol}`);

// Screening
export const analyzeWatchlist = () => api.post('/screening/analyze-watchlist');
export const runBulkScreening = (startIndex: number = 0, maxSymbols: number = 50) =>
  api.post('/screening/bulk-screen', { startIndex, maxSymbols });
export const getScreeningStatus = () => api.get('/screening/status');

export default api;
