# 🚀 Automated Trading Algorithm

A production-ready automated stock trading system with Alpaca paper trading integration, real-time market data, and intelligent trade execution. Built with TypeScript, React, Express, and SQLite.

## ⚡ Quick Start (One Command Setup)

Clone and run this on any server:

```bash
git clone https://github.com/YOUR_USERNAME/trading-algo.git
cd trading-algo
chmod +x setup.sh
./setup.sh
```

That's it! The script will:
- ✅ Install all dependencies
- ✅ Set up the database
- ✅ Configure environment files
- ✅ Install PM2 for production (optional)
- ✅ Guide you through API key setup

## 🎯 Features

### Automated Trading
- **🤖 Daily Automated Trading**: Runs automatically at 5pm PST
- **💰 $100,000 Starting Capital**: Simulated portfolio tracking
- **📊 3,269 Stock Watchlist**: Russell 3000 pre-loaded
- **🎯 Smart Position Management**: Auto-close based on exit signals
- **🔒 Risk Management**: Automatic stop-loss and take-profit orders

### Alpaca Integration
- **📈 Real-time Market Data**: Live quotes from Alpaca
- **📝 Paper Trading**: Practice with $100k virtual account
- **⚡ Bracket Orders**: Auto stop-loss (5%) and take-profit (10%)
- **📱 Order Tracking**: Monitor in Alpaca dashboard
- **🔄 Dual Mode**: Switch between simulation and Alpaca

### Core Functionality
- **Market Data Integration**: Real-time data via Yahoo Finance & Alpaca
- **Proven Trading Strategy**: RSI + Moving Average Crossover
- **Stock Screening**: Automated screening of 3,269 stocks
- **Trade Tracking**: Complete history with P&L analysis
- **Interactive Dashboard**: Charts, stats, and live updates

### Trading Strategy

The system implements a proven RSI + Moving Average Crossover strategy:

**BUY Signals:**
- RSI below 30 (oversold)
- 20-period MA crosses above 50-period MA (bullish crossover)

**SELL Signals:**
- RSI above 70 (overbought)
- 20-period MA crosses below 50-period MA (bearish crossover)

**Risk Management:**
- Stop Loss: 2 ATR below entry or at support level
- Take Profit: 3:1 risk-reward ratio
- Position sizing based on account risk (2% per trade)
- Maximum position size: 10% of account

## Tech Stack

**Backend:**
- Node.js + Express
- TypeScript
- SQLite (better-sqlite3)
- Yahoo Finance 2 (market data)
- Winston (logging)

**Frontend:**
- React + TypeScript
- Vite
- Tailwind CSS
- Chart.js
- React Router

## Installation

### Prerequisites
- Node.js 18+ and npm

### Setup

1. **Install dependencies:**
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
cd ..
```

2. **Start the application:**
```bash
# Start both backend and frontend (from root directory)
npm run dev

# Or start them separately:
# Terminal 1 - Backend (runs on port 3001)
npm run backend

# Terminal 2 - Frontend (runs on port 3000)
npm run frontend
```

3. **Access the dashboard:**
Open your browser to http://localhost:3000

## Usage

### 1. Add Stocks to Watchlist

In the Dashboard, use the watchlist panel to add stock symbols (e.g., AAPL, MSFT, GOOGL, TSLA).

### 2. Run Analysis

Run the analysis script to screen your watchlist and generate trades:

```bash
cd backend
npm run analyze
```

This will:
- Screen all watchlist symbols against your criteria
- Generate buy/sell signals based on the trading strategy
- Create simulated trades with entry/exit criteria
- Monitor existing positions for exit signals

### 3. View Trades

Navigate to the **Trade Bank** to see:
- All open and closed positions
- Entry/exit prices and criteria
- P&L for each trade
- Technical indicators at entry

### 4. Analyze Individual Stocks

Use the **Analysis** page to:
- Analyze any stock symbol
- View technical indicators (RSI, Moving Averages, Support/Resistance)
- Get buy/sell signals
- See suggested stop loss and take profit levels

### 5. Monitor Dashboard

The Dashboard provides:
- Portfolio statistics (total value, P&L, win rate)
- Watchlist with current prices and signals
- Interactive price charts
- Auto-refresh every 60 seconds

## Configuration

Edit `backend/.env` to customize:

```bash
# Trading Parameters
INITIAL_CAPITAL=10000        # Starting capital
MAX_POSITION_SIZE=0.1        # Max 10% per position
RISK_PER_TRADE=0.02         # Risk 2% per trade

# Strategy Parameters
RSI_PERIOD=14
RSI_OVERSOLD=30
RSI_OVERBOUGHT=70
MA_SHORT_PERIOD=20
MA_LONG_PERIOD=50

# Screening Criteria
MIN_PRICE=5                 # Minimum stock price
MAX_PRICE=500              # Maximum stock price
MIN_VOLUME=1000000         # Minimum daily volume
MIN_RSI=25                 # RSI lower bound for screening
MAX_RSI=35                 # RSI upper bound for screening
```

## API Endpoints

### Trades
- `GET /api/trades` - Get all trades
- `GET /api/trades/open` - Get open trades
- `GET /api/trades/closed` - Get closed trades
- `GET /api/trades/:id` - Get single trade
- `POST /api/trades/:id/close` - Close a trade
- `GET /api/trades/stats/portfolio` - Get portfolio statistics

### Market Data
- `GET /api/market/quote/:symbol` - Get real-time quote
- `GET /api/market/daily/:symbol` - Get daily historical data
- `GET /api/market/analyze/:symbol` - Analyze stock and get signals
- `POST /api/market/screen` - Screen multiple symbols

### Watchlist
- `GET /api/watchlist` - Get watchlist symbols
- `GET /api/watchlist/details` - Get watchlist with current prices
- `POST /api/watchlist` - Add symbol to watchlist
- `DELETE /api/watchlist/:symbol` - Remove from watchlist

## Database Schema

The SQLite database includes:
- **trades**: All trade records with entry/exit data
- **watchlist**: Symbols being monitored
- **price_cache**: Cached market data to reduce API calls

## Data Source

Yahoo Finance provides:
- **Unlimited free API requests**
- Real-time quotes
- Historical data (daily, intraday)
- No API key required

The system implements:
- Price data caching (1 hour)
- Graceful fallback to cached data

## Production Deployment

1. **Build the application:**
```bash
npm run build
```

2. **Set production environment variables**

3. **Run with PM2 or similar:**
```bash
pm2 start backend/dist/index.js --name trading-algo
```

4. **Serve frontend** with nginx or similar

5. **Schedule analysis** with cron:
```cron
# Run analysis every weekday at 4:30 PM (after market close)
30 16 * * 1-5 cd /path/to/trading-algo/backend && npm run analyze
```

## Automated Trading Schedule

For automated trading, set up a cron job:

```bash
# Edit crontab
crontab -e

# Add this line to run analysis every weekday at 4:30 PM EST
30 16 * * 1-5 cd /path/to/trading-algo/backend && npm run analyze >> /var/log/trading-algo.log 2>&1
```

## Important Notes

- **This is a SIMULATION tool** - trades are saved to the database, not executed with a real broker
- Always review trades before considering real execution
- Past performance does not guarantee future results
- Test thoroughly with paper trading before using real capital
- The strategy parameters can be customized based on your risk tolerance
- Monitor API usage to stay within rate limits

## Future Enhancements

Potential improvements:
- Options trading support with Greeks calculation
- Backtesting engine with historical data
- Multiple strategy support
- Paper trading mode with real-time execution
- Real broker API integration (Alpaca, Interactive Brokers)
- Email/SMS notifications for trade signals
- Advanced risk management (portfolio heat, correlation analysis)
- Machine learning for signal optimization

## License

ISC

## Disclaimer

This software is for educational and informational purposes only. It does not constitute financial advice. Trading stocks and options involves risk. Always do your own research and consult with a financial advisor before making investment decisions.
