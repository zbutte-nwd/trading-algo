# Alpaca Paper Trading Setup

## Overview

This trading algorithm can use **Alpaca Markets** for real-time market data and paper trading. Alpaca provides:
- Real-time stock quotes and market data
- Paper trading with simulated $100,000 account
- Automatic order execution with stop-loss and take-profit
- No real money at risk

## Step 1: Create Alpaca Account

1. Visit [https://alpaca.markets](https://alpaca.markets)
2. Click **"Sign Up"** in the top right
3. Create a free account
4. Verify your email address

## Step 2: Get API Keys (Paper Trading)

1. Log in to your Alpaca account
2. Go to **"Paper Trading"** section (left sidebar)
3. Click on **"Generate API Keys"**
4. You'll see:
   - **API Key ID** (starts with `PK...`)
   - **Secret Key** (starts with `...`)
5. **Copy both keys** - you'll need them in the next step

  **Important**: These are PAPER TRADING keys - no real money involved!

## Step 3: Configure Environment Variables

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Copy the example env file:
   ```bash
   cp .env.example .env
   ```

3. Open `.env` in your text editor and update these values:
   ```env
   # Alpaca API Configuration
   ALPACA_API_KEY=PKxxxxxxxxxxxxxxxx  # Your paper trading API key
   ALPACA_SECRET_KEY=xxxxxxxxxxxxxxxx # Your paper trading secret key
   ALPACA_PAPER=true                  # Keep this as true for paper trading

   # Enable Alpaca
   USE_ALPACA=true  # Set to true to use Alpaca instead of simulation
   ```

4. Save the file

## Step 4: Restart the Application

If the backend is running, restart it to pick up the new configuration:

```bash
# Stop the backend (Ctrl+C)
# Then restart
npm run dev
```

You should see in the logs:
```
Alpaca initialized - Paper Trading mode
Trading engine using Alpaca for execution
```

## How It Works

### Simulation Mode (Default)
- `USE_ALPACA=false` in `.env`
- Uses Yahoo Finance for quotes
- Simulates trades in local database
- No external order execution

### Alpaca Paper Trading Mode
- `USE_ALPACA=true` in `.env`
- Uses Alpaca for real-time quotes
- Places actual paper trading orders in Alpaca system
- Orders include automatic bracket orders:
  - **Stop Loss**: 5% below entry price
  - **Take Profit**: 10% above entry price
- Tracks orders in both local database and Alpaca

### Automated Daily Trading

When using Alpaca, the daily 5pm PST scheduler will:
1. Check open positions for exit signals
2. Close positions via Alpaca API if needed
3. Analyze watchlist for new opportunities
4. Place bracket orders on Alpaca for buy signals
5. Log all activity

## Monitoring Your Paper Trading

### View Orders in Alpaca Dashboard

1. Log in to [https://alpaca.markets](https://alpaca.markets)
2. Go to **"Paper Trading"** ’ **"Orders"**
3. You'll see all orders placed by the algorithm
4. Check positions, fills, and P&L

### View in Your Application

- Dashboard shows all trades
- Portfolio stats include Alpaca positions
- Logs show Alpaca order IDs

## Testing the Integration

### 1. Check Alpaca Connection

```bash
curl http://localhost:3001/api/trades/stats/portfolio
```

Should show your portfolio with Alpaca-synced data.

### 2. Trigger Manual Analysis

```bash
curl -X POST http://localhost:3001/api/screening/analyze-watchlist
```

This will:
- Analyze stocks
- Place orders on Alpaca if signals found
- Log Alpaca order IDs

### 3. Check Logs

Look for entries like:
```
Alpaca order placed: a1b2c3d4-... for AAPL
Executed BUY on Alpaca: 10 shares of AAPL at $150.00
```

## Switching Between Modes

### To Use Simulation Mode
```env
USE_ALPACA=false
```

### To Use Alpaca Paper Trading
```env
USE_ALPACA=true
```

Restart the backend after changing this setting.

## API Features Available

The Alpaca integration includes:

-  **Real-time quotes**: `getQuote(symbol)`
-  **Historical data**: `getHistoricalBars(symbol)`
-  **Account info**: `getAccount()`
-  **Positions**: `getPositions()`
-  **Market orders**: `placeMarketOrder()`
-  **Limit orders**: `placeLimitOrder()`
-  **Bracket orders**: `placeBracketOrder()` (auto SL/TP)
-  **Order status**: `getOrder(orderId)`
-  **Cancel orders**: `cancelOrder(orderId)`
-  **Market hours**: `isMarketOpen()`

## Troubleshooting

### Error: "Invalid API credentials"
- Double-check API keys in `.env`
- Ensure you copied the PAPER TRADING keys (not live trading)
- Keys should start with `PK...` for paper trading

### Error: "Alpaca order failed, falling back to simulation"
- Check if market is open (Alpaca only trades during market hours)
- Verify symbol is tradeable on Alpaca (some OTC stocks not supported)
- Check Alpaca dashboard for error details

### Orders Not Appearing in Alpaca
- Verify `USE_ALPACA=true` in `.env`
- Restart backend to apply changes
- Check logs for "Trading engine using Alpaca for execution"

### Rate Limiting
- Alpaca has rate limits (200 requests/minute for paper trading)
- The algorithm respects these limits
- If needed, reduce watchlist size

## Important Notes

  **Paper Trading Only**: This setup uses Alpaca's paper trading - no real money is involved

  **Market Hours**: Alpaca orders only execute during market hours (9:30am - 4pm ET, Mon-Fri)

  **API Keys Security**: Never commit `.env` file to git. The `.env.example` is for reference only

  **Account Reset**: Your Alpaca paper trading account can be reset anytime from their dashboard

## Next Steps

1.  Complete Alpaca setup above
2.  Test with manual analysis endpoint
3.  Monitor first automated daily run (5pm PST)
4.  Review orders in Alpaca dashboard
5.  Compare performance vs simulation mode
6.  Adjust strategy parameters if needed

## Resources

- **Alpaca Docs**: https://docs.alpaca.markets
- **Paper Trading Dashboard**: https://alpaca.markets/paper-trading
- **API Reference**: https://docs.alpaca.markets/reference
- **Status Page**: https://status.alpaca.markets

Enjoy paper trading with real market data! =€=È
