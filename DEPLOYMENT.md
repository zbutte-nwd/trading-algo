# Trading Algorithm - Deployment Guide

## Overview

This guide will help you deploy the trading algorithm to run continuously on a server with:
- **Automated daily trading** at 5pm PST
- **$100,000 starting capital**
- **Portfolio tracking** over weeks/months
- **3,269 stocks** in the watchlist

## What's Been Implemented

### ✅ Automated Trading Features
1. **Portfolio Management**
   - Starting cash: $100,000
   - Real-time cash tracking
   - Position sizing based on available funds
   - Total portfolio value calculation

2. **Automated Scheduler**
   - Runs daily at 5pm PST (1am UTC)
   - Step 1: Monitor and close open positions
   - Step 2: Analyze watchlist for new opportunities
   - Step 3: Execute trades automatically

3. **Trading Logic**
   - RSI + Moving Average Crossover strategy
   - Automatic buy/sell signal detection
   - Position limits (max 1 position per stock)
   - Cash management (insufficient funds protection)

## Deployment Options

### Option 1: Docker Deployment (Recommended)

#### Prerequisites
- Docker and Docker Compose installed
- Server with at least 2GB RAM

#### Steps

1. **Clone/Upload your project** to the server

2. **Build and run with Docker Compose**:
   ```bash
   cd /path/to/trading-algo
   docker-compose up -d
   ```

3. **Verify it's running**:
   ```bash
   docker-compose logs -f
   ```

4. **Access the application**:
   - Frontend: `http://your-server-ip:3000`
   - Backend API: `http://your-server-ip:3001`

5. **Monitor logs**:
   ```bash
   # Real-time logs
   docker-compose logs -f trading-algo

   # Check for scheduler messages
   docker-compose logs | grep "Daily trading"
   ```

### Option 2: DigitalOcean/AWS Deployment

#### DigitalOcean Droplet

1. **Create a Droplet**
   - Choose Ubuntu 22.04 LTS
   - At least $12/month plan (2GB RAM)
   - Add SSH key for access

2. **Connect and setup**:
   ```bash
   ssh root@your-droplet-ip

   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh

   # Install Docker Compose
   apt install docker-compose
   ```

3. **Upload your project**:
   ```bash
   # On your local machine
   scp -r trading-algo root@your-droplet-ip:/root/
   ```

4. **Run the application**:
   ```bash
   cd /root/trading-algo
   docker-compose up -d
   ```

5. **Setup firewall**:
   ```bash
   ufw allow 3000
   ufw allow 3001
   ufw enable
   ```

#### AWS EC2

1. **Launch EC2 instance**
   - AMI: Ubuntu 22.04
   - Instance type: t3.small (2GB RAM)
   - Security Group: Allow ports 3000, 3001, 22

2. **Follow same Docker setup as DigitalOcean**

### Option 3: Railway.app (Easy, No Server Management)

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and deploy**:
   ```bash
   cd trading-algo
   railway login
   railway init
   railway up
   ```

3. **Set environment variables** in Railway dashboard:
   - `TZ=America/Los_Angeles`
   - `NODE_ENV=production`

### Option 4: Render.com

1. **Create account** at render.com

2. **Create new Web Service**:
   - Connect your GitHub repo
   - Build Command: `cd backend && npm install && npm run build`
   - Start Command: `cd backend && npm start`
   - Add environment variable: `TZ=America/Los_Angeles`

## Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
PORT=3001
NODE_ENV=production
TZ=America/Los_Angeles
```

### Scheduler Configuration

The scheduler is configured to run at:
- **5pm PST** = 1am UTC (next day)
- Adjust in `backend/src/services/scheduler.ts` if needed:

```typescript
// Current: 5pm PST
cron.schedule('0 1 * * *', async () => {
  // Trading logic
});

// For different times:
// 9:30am EST market open: '30 14 * * 1-5'
// 4pm EST market close: '0 21 * * 1-5'
```

## Monitoring & Logs

### View Trading Activity

1. **Check logs**:
   ```bash
   # Docker
   docker-compose logs -f

   # Direct file
   tail -f backend/combined.log
   ```

2. **Look for daily session logs**:
   ```
   === Starting Daily Trading Session ===
   Step 1: Monitoring open positions...
   Step 2: Analyzing watchlist...
   Trades Created: 5
   Portfolio Cash: $95,432.10
   Total Value: $101,234.56
   Total Return: 1.23%
   ```

### Database Backup

The SQLite database (`trading.db`) contains all your portfolio data:

```bash
# Backup database
cp trading.db trading.db.backup-$(date +%Y%m%d)

# Setup automatic backups (cron)
0 2 * * * cp /path/to/trading.db /path/to/backups/trading.db.$(date +\%Y\%m\%d)
```

## Testing the System

### Manual Trading Session

Trigger a trading session manually to test:

```bash
curl -X POST http://localhost:3001/api/screening/analyze-watchlist
```

### Check Portfolio Status

```bash
curl http://localhost:3001/api/trades/stats/portfolio
```

Expected response:
```json
{
  "cash": 100000,
  "initialCash": 100000,
  "investedCapital": 0,
  "totalValue": 100000,
  "totalReturn": 0,
  "totalTrades": 0,
  "openTrades": 0,
  "closedTrades": 0
}
```

## Troubleshooting

### Scheduler Not Running

1. Check timezone:
   ```bash
   docker exec -it trading-algo_trading-algo_1 date
   # Should show PST/PDT time
   ```

2. Verify scheduler initialization:
   ```bash
   docker logs trading-algo_trading-algo_1 | grep scheduler
   # Should see: "Daily trading scheduler started"
   ```

### Out of Memory

If server runs out of memory:
1. Increase droplet/instance size to 4GB RAM
2. Or reduce watchlist size in database

### No Trades Being Created

1. Check if stocks have sufficient data (need 50+ days)
2. Verify RSI/MA signals are triggering
3. Check available cash in portfolio

## Cost Estimates

### Hosting Costs (Monthly)

- **DigitalOcean**: $12-24 (2-4GB RAM droplet)
- **AWS EC2**: $15-30 (t3.small/medium)
- **Railway.app**: Free tier available, then ~$5-20
- **Render.com**: Free tier available, then $7+

### Recommended Setup

For continuous 24/7 operation:
- **DigitalOcean $12/month droplet**
- 2GB RAM, 50GB SSD
- Backup snapshots: +$1.20/month

## Next Steps

1. **Deploy** using one of the options above
2. **Monitor** for the first few days
3. **Check logs** after first 5pm PST run
4. **Review trades** and portfolio performance weekly
5. **Backup database** regularly

## Important Notes

⚠️ **This is a simulated trading system** - no real money is being traded

⚠️ **Market hours**: The system runs at 5pm PST but doesn't check if markets are open

⚠️ **API limits**: Yahoo Finance has rate limits - the 24-hour cache helps minimize calls

⚠️ **Data persistence**: Make sure to backup `trading.db` - it contains all your portfolio data

## Support

For issues:
1. Check logs first
2. Verify database exists and has portfolio entry
3. Ensure scheduler cron pattern matches your timezone
