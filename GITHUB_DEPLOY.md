# =€ GitHub Deployment Guide

This guide shows you how to push your trading algorithm to GitHub and deploy it on any server with a single command.

## Step 1: Push to GitHub

### Initialize Git Repository (if not done)

```bash
cd /Users/zakir/Documents/code/trading-algo
git init
git add .
git commit -m "Initial commit: Automated trading algorithm with Alpaca integration"
```

### Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository (e.g., `trading-algo`)
3. **DO NOT** initialize with README (we already have one)
4. Copy the repository URL

### Push to GitHub

```bash
# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/trading-algo.git

# Push to GitHub
git push -u origin main
```

If you're using the `master` branch:
```bash
git push -u origin master
```

## Step 2: Deploy on Another Server

### On Your Server (Linux/macOS)

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/trading-algo.git
cd trading-algo

# Run the setup script
chmod +x setup.sh
./setup.sh
```

The setup script will automatically:
-  Install Node.js (if needed)
-  Install all dependencies
-  Set up environment files
-  Configure database
-  Install PM2 for production (optional)

### Configure API Keys

Edit the `.env` file with your API keys:

```bash
nano backend/.env
```

Add your keys:
```env
ALPACA_API_KEY=your_key_here
ALPACA_SECRET_KEY=your_secret_here
ALPHA_VANTAGE_API_KEY=your_key_here
```

### Start the Application

#### Development Mode
```bash
cd backend
npm run dev
```

#### Production Mode (Recommended)
```bash
# Using PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow the instructions to enable on boot
```

#### Docker Mode
```bash
docker-compose up -d
```

## Step 3: Access Your Application

- **Backend API**: http://your-server-ip:3001
- **Frontend**: http://your-server-ip:3000 (if running)

## Quick Deployment Commands

### For DigitalOcean/AWS/Other VPS:

```bash
# SSH into your server
ssh root@your-server-ip

# Clone and setup
git clone https://github.com/YOUR_USERNAME/trading-algo.git
cd trading-algo
chmod +x setup.sh
./setup.sh

# Configure API keys
nano backend/.env

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### For Local Development:

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/trading-algo.git
cd trading-algo

# Setup
./setup.sh

# Configure
nano backend/.env

# Run
cd backend && npm run dev
```

## Environment Variables Required

Create `backend/.env` with:

```env
# Server
PORT=3001
NODE_ENV=production

# Alpha Vantage (free at https://www.alphavantage.co)
ALPHA_VANTAGE_API_KEY=your_key

# Alpaca (free at https://alpaca.markets)
ALPACA_API_KEY=your_key
ALPACA_SECRET_KEY=your_secret
ALPACA_PAPER=true

# Trading
INITIAL_CAPITAL=100000
USE_ALPACA=true
```

## Automated Trading Schedule

The system runs automatically at 5pm PST daily. No additional setup needed!

To verify the scheduler is running:
```bash
pm2 logs trading-algo-backend | grep "scheduler"
```

You should see:
```
Daily trading scheduler started - will run at 5pm PST (1am UTC)
```

## Monitoring

### View Logs
```bash
# PM2 logs
pm2 logs

# Docker logs
docker-compose logs -f

# Direct logs
tail -f backend/combined.log
```

### Check Status
```bash
# PM2 status
pm2 status

# Docker status
docker-compose ps

# Manual check
curl http://localhost:3001/api/trades/stats/portfolio
```

## Updating the Application

To update from GitHub:

```bash
cd trading-algo
git pull
npm install
pm2 restart all
```

## Backup Important Data

```bash
# Backup database
cp backend/trading.db backend/trading.db.backup

# Backup .env
cp backend/.env backend/.env.backup
```

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 3001
lsof -ti:3001 | xargs kill -9

# Restart
pm2 restart all
```

### Dependencies Issue
```bash
# Clean install
rm -rf backend/node_modules
cd backend && npm install
```

### Database Issues
```bash
# Reset database (WARNING: deletes all data)
rm backend/trading.db
# Database will be recreated on next start
```

## Security Notes

  **NEVER commit `.env` to GitHub** - it contains your API keys!

The `.gitignore` file already excludes:
- `.env` files
- Database files (`*.db`)
- Log files (`*.log`)
- `node_modules/`

## Server Requirements

**Minimum:**
- 1 GB RAM
- 1 CPU core
- 10 GB storage
- Ubuntu 20.04+ or similar

**Recommended:**
- 2 GB RAM
- 2 CPU cores
- 20 GB storage
- Ubuntu 22.04 LTS

## Cost Estimate

**Free Options:**
- Railway.app (free tier)
- Render.com (free tier)

**Paid Options:**
- DigitalOcean: $12/month (2GB RAM droplet)
- AWS EC2: $15-30/month (t3.small)
- Linode: $12/month (2GB plan)

## Support

For issues or questions:
1. Check logs: `pm2 logs` or `docker-compose logs`
2. Review documentation in the repository
3. Ensure API keys are correctly configured

---

<¯ **That's it!** Your automated trading system is now deployed and running 24/7!
