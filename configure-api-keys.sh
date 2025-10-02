#!/bin/bash

# Interactive API Key Configuration Script

echo "==========================================" 
echo "🔑 API Key Configuration"
echo "=========================================="
echo ""

# Check if .env exists
if [ ! -f "backend/.env" ]; then
    echo "Error: backend/.env not found. Run ./setup.sh first."
    exit 1
fi

echo "This script will help you configure your API keys."
echo ""
echo "Get free API keys from:"
echo "  • Alpha Vantage: https://www.alphavantage.co/support/#api-key"
echo "  • Alpaca (Paper Trading): https://alpaca.markets"
echo ""

# Alpha Vantage
read -p "Enter Alpha Vantage API Key (or press Enter to skip): " ALPHA_KEY
if [ ! -z "$ALPHA_KEY" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/ALPHA_VANTAGE_API_KEY=.*/ALPHA_VANTAGE_API_KEY=$ALPHA_KEY/" backend/.env
    else
        sed -i "s/ALPHA_VANTAGE_API_KEY=.*/ALPHA_VANTAGE_API_KEY=$ALPHA_KEY/" backend/.env
    fi
    echo "✓ Alpha Vantage API key configured"
fi

# Alpaca API Key
read -p "Enter Alpaca API Key (or press Enter to skip): " ALPACA_KEY
if [ ! -z "$ALPACA_KEY" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/ALPACA_API_KEY=.*/ALPACA_API_KEY=$ALPACA_KEY/" backend/.env
    else
        sed -i "s/ALPACA_API_KEY=.*/ALPACA_API_KEY=$ALPACA_KEY/" backend/.env
    fi
    echo "✓ Alpaca API key configured"
fi

# Alpaca Secret
read -p "Enter Alpaca Secret Key (or press Enter to skip): " ALPACA_SECRET
if [ ! -z "$ALPACA_SECRET" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/ALPACA_SECRET_KEY=.*/ALPACA_SECRET_KEY=$ALPACA_SECRET/" backend/.env
    else
        sed -i "s/ALPACA_SECRET_KEY=.*/ALPACA_SECRET_KEY=$ALPACA_SECRET/" backend/.env
    fi
    echo "✓ Alpaca Secret key configured"
fi

# Enable Alpaca
echo ""
read -p "Enable Alpaca paper trading? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/USE_ALPACA=.*/USE_ALPACA=true/" backend/.env
    else
        sed -i "s/USE_ALPACA=.*/USE_ALPACA=true/" backend/.env
    fi
    echo "✓ Alpaca paper trading enabled"
else
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/USE_ALPACA=.*/USE_ALPACA=false/" backend/.env
    else
        sed -i "s/USE_ALPACA=.*/USE_ALPACA=false/" backend/.env
    fi
    echo "✓ Using simulation mode"
fi

echo ""
echo "=========================================="
echo "✅ Configuration Complete!"
echo "=========================================="
echo ""
echo "Your API keys have been saved to backend/.env"
echo ""
echo "Start the application with:"
echo "  cd backend && npm run dev"
echo ""
