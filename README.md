# Trading Algorithm

Automated stock trading system using Alpaca API with RSI + Moving Average Crossover strategy.

## Features

- **Automated Trading**: 4 scheduled tasks for end-to-day screening, pre-market execution, and position monitoring
- **3,000+ Stocks**: Russell 3000 watchlist for daily screening
- **API Optimization**: Multi-layer caching (memory + SQLite) to stay under 100 API calls/minute
- **Market Hours Aware**: Intelligent caching based on market status (5min during market, 60min off-market)
- **Paper Trading**: Safe testing with Alpaca paper trading
- **Real-time Dashboard**: Monitor positions, portfolio stats, and screening picks

## Quick Start

### Prerequisites

- Docker & Docker Compose (for containerized setup)
- OR Node.js 21+ (for local development)
- Alpaca API keys ([Get free paper trading keys](https://alpaca.markets/))

### Option 1: Docker (Recommended for Windows/Cross-platform)

1. Clone the repository:
```bash
git clone <your-repo-url>
cd trading-algo
```

2. Create `.env` file from example:
```bash
cp .env.example .env
# Edit .env and add your Alpaca API keys
```

3. Run with Docker Compose:
```bash
# Development mode (with hot reload)
docker-compose up

# Production mode
docker-compose --profile production up trading-algo-prod
```

4. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

### Option 2: Local Development

1. Clone and install dependencies:
```bash
git clone <your-repo-url>
cd trading-algo

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

2. Configure environment:
```bash
# Create .env in root directory
cp .env.example .env
# Edit .env and add your Alpaca API keys
```

3. Start services:
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

4. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## API Rate Limiting

The system is optimized for Alpaca's free tier (200 API calls/minute):

- **Target**: 100 calls/minute (50% of limit)
- **3-Tier Caching**:
  - Memory cache: 5 minutes
  - Database cache (market hours): 5 minutes
  - Database cache (off-market): 60 minutes
- **Smart Pagination**: 20 symbols per page on watchlist
- **Monitoring**: Real-time API usage stats in watchlist response

## Trading Schedule

- **4:00 PM EST**: End-of-day stock screening (analyzes entire watchlist)
- **9:30 AM EST**: Execute screened positions from previous day
- **Every 5 min (9:30am-4pm)**: Monitor active positions for exit signals
- **Every hour (9:30am-4pm)**: Poll non-active watchlist stocks

## Technology Stack

- **Backend**: Node.js, TypeScript, Express, SQLite
- **Frontend**: React, TypeScript, Vite, TailwindCSS
- **Trading**: Alpaca Markets API (paper trading)
- **Strategy**: RSI (14) + MA Crossover (20/50)

## Project Structure

```
trading-algo/
├── backend/
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Trading logic, Alpaca integration
│   │   ├── database/      # SQLite operations
│   │   └── index.ts       # Server entry
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/         # React pages
│   │   ├── components/    # Reusable components
│   │   └── api.ts         # API client
│   └── package.json
├── data/                  # SQLite database (auto-created)
├── docker-compose.yml     # Docker orchestration
├── Dockerfile             # Production image
└── Dockerfile.dev         # Development image
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ALPACA_API_KEY` | Your Alpaca API key | Required |
| `ALPACA_SECRET_KEY` | Your Alpaca secret key | Required |
| `ALPACA_PAPER` | Use paper trading | `true` |
| `DATABASE_PATH` | SQLite database path | `./data/trading.db` |
| `PORT` | Backend server port | `3001` |
| `NODE_ENV` | Environment | `development` |

## Windows Setup Notes

When running on Windows:

1. **Docker Desktop**: Install [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
2. **WSL2**: Recommended for better performance with Docker
3. **Line Endings**: Git may convert line endings. Configure:
   ```bash
   git config --global core.autocrlf false
   ```

## API Endpoints

- `GET /api/trades/open` - Get open positions
- `GET /api/trades/picks/screening` - Get daily screening picks
- `GET /api/trades/stats/portfolio` - Get portfolio statistics
- `GET /api/watchlist/details` - Get watchlist with current prices
- `POST /api/trades/:id/close` - Close a position
- `POST /api/screening/analyze-watchlist` - Trigger manual screening

## Docker Commands

```bash
# Development
docker-compose up                    # Start dev environment
docker-compose down                  # Stop and remove containers
docker-compose logs -f               # View logs

# Production
docker-compose --profile production up trading-algo-prod
docker-compose --profile production down

# Rebuild after code changes
docker-compose build --no-cache
```

## License

MIT
