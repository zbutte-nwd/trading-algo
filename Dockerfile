# Multi-stage build for production
FROM node:21-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Backend build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./

# Frontend build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Production image
FROM node:21-alpine

WORKDIR /app

# Install production dependencies for backend
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --only=production

# Copy built backend
COPY --from=builder /app/backend/src ./src
COPY --from=builder /app/backend/dist ./dist

# Copy built frontend
COPY --from=builder /app/frontend/dist ../frontend/dist

# Create data directory for SQLite
RUN mkdir -p /app/data

# Expose ports
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/trading.db

# Start backend server
CMD ["npx", "tsx", "src/index.ts"]
