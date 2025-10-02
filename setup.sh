#!/bin/bash

# Trading Algorithm - One-Command Setup Script
# This script sets up the entire trading system on a fresh server

set -e  # Exit on any error

echo "=========================================="
echo "=€ Trading Algorithm Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN} $1${NC}"
}

print_error() {
    echo -e "${RED} $1${NC}"
}

print_info() {
    echo -e "${YELLOW}9 $1${NC}"
}

# Check if running as root on Linux
if [[ "$OSTYPE" == "linux-gnu"* ]] && [[ $EUID -ne 0 ]]; then
   print_error "This script should be run as root on Linux servers"
   echo "Please run: sudo ./setup.sh"
   exit 1
fi

echo "Step 1: Checking system requirements..."
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    echo ""
    echo "Installing Node.js..."

    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Install Node.js on Linux
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt-get install -y nodejs
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # Install Node.js on macOS
        if ! command -v brew &> /dev/null; then
            print_error "Homebrew is not installed. Please install from https://brew.sh"
            exit 1
        fi
        brew install node
    fi
    print_success "Node.js installed"
else
    NODE_VERSION=$(node -v)
    print_success "Node.js found: $NODE_VERSION"
fi

# Check for Docker (optional but recommended)
if ! command -v docker &> /dev/null; then
    print_info "Docker not found (optional - you can still run without it)"
else
    DOCKER_VERSION=$(docker -v)
    print_success "Docker found: $DOCKER_VERSION"
fi

echo ""
echo "Step 2: Installing dependencies..."
echo ""

# Install backend dependencies
cd backend
print_info "Installing backend dependencies..."
npm install
print_success "Backend dependencies installed"

# Install frontend dependencies
cd ../frontend
print_info "Installing frontend dependencies..."
npm install
print_success "Frontend dependencies installed"

cd ..

echo ""
echo "Step 3: Setting up environment variables..."
echo ""

# Check if .env exists
if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    print_success "Created backend/.env from example"

    echo ""
    print_info "   IMPORTANT: You need to configure your API keys!"
    echo ""
    echo "Edit backend/.env and add your:"
    echo "  1. ALPHA_VANTAGE_API_KEY (get free at https://www.alphavantage.co)"
    echo "  2. ALPACA_API_KEY (get free at https://alpaca.markets)"
    echo "  3. ALPACA_SECRET_KEY"
    echo ""
    echo "After editing, run this script again or start manually:"
    echo "  cd backend && npm run dev"
    echo ""

    # Open .env in default editor if available
    if command -v nano &> /dev/null; then
        read -p "Do you want to edit .env now? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            nano backend/.env
        fi
    fi
else
    print_success ".env file already exists"
fi

echo ""
echo "Step 4: Setting up database..."
echo ""

# The database will be created automatically on first run
print_success "Database will be initialized on first run"

echo ""
echo "Step 5: Setting up PM2 for production (optional)..."
echo ""

if ! command -v pm2 &> /dev/null; then
    read -p "Install PM2 for production deployment? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npm install -g pm2
        print_success "PM2 installed"

        # Create PM2 ecosystem file
        cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'trading-algo-backend',
    cwd: './backend',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
    },
  }]
}
EOF
        print_success "PM2 ecosystem file created"
    fi
else
    print_success "PM2 already installed"
fi

echo ""
echo "=========================================="
echo " Setup Complete!"
echo "=========================================="
echo ""
echo "=Ë Next Steps:"
echo ""
echo "1. Configure your API keys in backend/.env"
echo "   - ALPHA_VANTAGE_API_KEY"
echo "   - ALPACA_API_KEY"
echo "   - ALPACA_SECRET_KEY"
echo ""
echo "2. Start the application:"
echo ""
echo "   Development mode:"
echo "   $ cd backend && npm run dev"
echo ""
echo "   Production mode (with PM2):"
echo "   $ pm2 start ecosystem.config.js"
echo "   $ pm2 save"
echo "   $ pm2 startup  # Enable on boot"
echo ""
echo "   Docker mode:"
echo "   $ docker-compose up -d"
echo ""
echo "3. Access your application:"
echo "   - Backend API: http://localhost:3001"
echo "   - Frontend: http://localhost:3000"
echo ""
echo "=Ú Documentation:"
echo "   - ALPACA_SETUP.md - Alpaca configuration guide"
echo "   - DEPLOYMENT.md - Full deployment guide"
echo "   - AUTOMATED_TRADING_SUMMARY.md - System overview"
echo ""
echo "<¯ Automated Trading:"
echo "   - Runs daily at 5pm PST"
echo "   - $100,000 starting capital"
echo "   - 3,269 stocks in watchlist"
echo ""
print_success "Happy trading! =€=È"
echo ""
