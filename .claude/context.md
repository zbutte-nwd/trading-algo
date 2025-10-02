# Trading Algorithm Project Context

## Project Overview
Stock trading algorithm application with automated analysis and trade execution based on RSI and Moving Average Crossover strategy.

## Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: SQLite (better-sqlite3)
- **Market Data**: Yahoo Finance API (yahoo-finance2)
- **Logging**: Winston
- **Scheduling**: node-cron
- **Location**: `/backend/`

### Frontend
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Location**: `/frontend/`

## Architecture

### Backend Structure
```
backend/
├── src/
│   ├── index.ts              # Express server entry point
│   ├── database.ts           # SQLite database operations
│   ├── routes/
│   │   ├── market.ts         # Market data & search endpoints
│   │   ├── screening.ts      # Analysis & trading endpoints
│   │   └── trades.ts         # Trade management endpoints
│   ├── services/
│   │   ├── yahooMarketData.ts    # Yahoo Finance integration with caching
│   │   ├── tradingEngine.ts      # Core trading logic
│   │   └── tradingStrategy.ts    # RSI + MA strategy implementation
│   ├── scripts/
│   │   ├── bulkScreening.ts      # Bulk watchlist analysis
│   │   └── importFromCSV.ts      # CSV import with rate limiting
│   └── data/
│       ├── russell3000.txt       # 3000 stock symbols
│       ├── nyse_tickers.txt      # NYSE tickers
│       └── nasdaq_tickers.txt    # NASDAQ tickers
```

### Frontend Structure
```
frontend/
├── src/
│   ├── App.tsx
│   ├── pages/
│   │   └── Dashboard.tsx         # Main dashboard with analysis results
│   ├── components/
│   │   └── WatchlistPanel.tsx    # Watchlist with search autocomplete
│   └── api.ts                    # Backend API client
```

## Key Features

### 1. Trading Strategy
- **RSI (Relative Strength Index)**: 14-period RSI
- **Moving Averages**:
  - Short MA: 20 periods
  - Long MA: 50 periods
- **Buy Signal**: RSI < 30 (oversold) AND short MA crosses above long MA
- **Sell Signal**: RSI > 70 (overbought) AND short MA crosses below long MA

### 2. Caching System
- **Quote Cache**: In-memory Map, 24-hour TTL
- **Price Data Cache**: SQLite database, 24-hour duration
- **Purpose**: Minimize API calls (max once daily per ticker)
- **Implementation**: `yahooMarketData.ts` lines 15-50

### 3. Watchlist Management
- **Current Size**: 3000 stocks (Russell 3000)
- **Search**: Yahoo Finance autocomplete with 300ms debounce
- **Add/Remove**: Real-time updates via API

### 4. Analysis & Results
- **Detailed Tracking**: Shows all analyzed stocks with signals
- **Analysis Results Display**: Toggle view in Dashboard
- **Fields**: Symbol, Action, RSI, Reason, Trade Created
- **Implementation**: `tradingEngine.analyzeAndTradeWithResults()`

### 5. Bulk Operations
- **CSV Import**: Add symbols from CSV files
- **Rate Limiting**: 2-second delays between API requests
- **Script**: `npm run import-csv <path> <delay_ms>`

## Database Schema

### Tables
- **watchlist**: Stock symbols to monitor
- **stock_data**: Historical price data cache
- **trades**: Executed trades history

## API Endpoints

### Market Data
- `GET /api/market/quote/:symbol` - Get stock quote
- `GET /api/market/search?q=query` - Search stocks (autocomplete)

### Analysis
- `POST /api/screening/analyze-watchlist` - Analyze all watchlist stocks
- Returns: `{ symbolsAnalyzed, tradesCreated, analyzedStocks[] }`

### Trades
- `GET /api/trades` - Get all trades
- `GET /api/trades/stats` - Get trade statistics

## Environment Variables
```
ALPHA_VANTAGE_API_KEY=your_key    # (Legacy, not currently used)
PORT=3001                          # Backend port
```

## Important Patterns

### 1. Rate Limiting
Always use delays when making bulk API requests to avoid rate limits:
```typescript
await sleep(delayMs);  // 2000ms recommended for Yahoo Finance
```

### 2. Cache Usage
Check cache before API calls:
```typescript
const cached = this.quoteCache.get(symbol);
if (cached && (now - cached.timestamp) < CACHE_DURATION) {
  return cached.data;
}
```

### 3. Error Handling
Continue processing on individual failures in bulk operations:
```typescript
try {
  // Process symbol
} catch (err) {
  logger.error(`Error for ${symbol}:`, err);
  // Continue to next symbol
}
```

## Scripts

### Backend
- `npm run dev` - Start dev server with watch mode
- `npm run build` - Compile TypeScript
- `npm run analyze` - Run watchlist analysis
- `npm run bulk-screen` - Bulk screening script
- `npm run import-csv <path> [delay]` - Import from CSV

### Frontend
- `npm run dev` - Start dev server (port 5173)
- `npm run build` - Build for production

## Development Notes

### Recent Changes
1. Added analysis results tracking for non-trading stocks
2. Implemented ticker search with autocomplete
3. Added 24-hour caching for quotes and price data
4. Imported Russell 3000 symbols (3000 stocks)
5. Created CSV import script with rate limiting

### Known Limitations
- Yahoo Finance API has rate limits (handled with caching)
- Price data import for 3000 stocks takes ~1.5 hours
- Database grows with historical data (consider cleanup strategy)

### Future Considerations
- Add more trading strategies
- Implement position sizing
- Add paper trading mode
- Create backtesting functionality
- Add real-time WebSocket price updates
