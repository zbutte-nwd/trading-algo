#!/bin/sh

# Start backend with PM2
cd /app/backend && pm2 start dist/index.js --name "trading-backend" --no-daemon &

# Start frontend with serve
cd /app/frontend && serve -s dist -l 3000 &

# Keep container running and show logs
pm2 logs
