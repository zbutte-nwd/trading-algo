# Quick Setup Guide

Follow these steps to get your trading assistant up and running.

## Step 1: Get an API Key

1. Go to https://www.alphavantage.co/support/#api-key
2. Enter your email and click "GET FREE API KEY"
3. Copy your API key (you'll need it in Step 3)

## Step 2: Install Dependencies

Open your terminal and run:

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

## Step 3: Configure API Key

```bash
# Create environment file from template
cp backend/.env.example backend/.env

# Open the .env file in your editor
# Replace 'your_api_key_here' with your actual Alpha Vantage API key
```

Example `.env` file:
```
ALPHA_VANTAGE_API_KEY=ABC123XYZ456
PORT=3001
INITIAL_CAPITAL=10000
```

## Step 4: Start the Application

From the root directory:

```bash
npm run dev
```

This will start:
- Backend server on http://localhost:3001
- Frontend dashboard on http://localhost:3000

## Step 5: Add Stocks to Watch

1. Open http://localhost:3000 in your browser
2. In the Watchlist panel, add some stock symbols:
   - AAPL (Apple)
   - MSFT (Microsoft)
   - GOOGL (Google)
   - TSLA (Tesla)
   - NVDA (NVIDIA)

## Step 6: Run Your First Analysis

Open a new terminal and run:

```bash
cd backend
npm run analyze
```

This will:
- Analyze all stocks in your watchlist
- Generate trading signals
- Create simulated trades
- Display portfolio statistics

## Step 7: View Your Trades

1. Go to the **Trade Bank** tab in the dashboard
2. View all generated trades with entry/exit criteria
3. Click on trades to see detailed information
4. Close positions manually or let the system monitor them

## Step 8: Explore Features

### Dashboard
- View portfolio statistics
- Monitor watchlist with real-time prices
- Interactive price charts

### Trade Bank
- Filter open/closed trades
- View P&L for each trade
- Close positions manually
- See entry/exit criteria for each trade

### Analysis
- Analyze any stock symbol
- View technical indicators
- Get buy/sell signals
- See support/resistance levels

## Troubleshooting

### API Rate Limit Errors
- Free tier allows 5 requests/minute
- System automatically caches data
- Wait a few minutes between analyses

### No Trades Generated
- Check if watchlist symbols meet screening criteria
- Adjust parameters in `.env` file
- Try different stocks or market conditions

### Port Already in Use
- Change `PORT=3001` in `.env` to another port
- Update proxy in `frontend/vite.config.ts` to match

## Next Steps

1. **Customize Strategy**: Edit `.env` to adjust RSI thresholds, moving average periods, risk parameters
2. **Schedule Analysis**: Set up a cron job to run analysis daily
3. **Monitor Positions**: Check dashboard regularly for exit signals
4. **Track Performance**: Review closed trades to evaluate strategy

## Getting Help

- Check `README.md` for detailed documentation
- Review API endpoints for custom integrations
- Modify strategy parameters for your trading style

---

**Happy Trading!** (Remember: this is a simulation tool for educational purposes)
