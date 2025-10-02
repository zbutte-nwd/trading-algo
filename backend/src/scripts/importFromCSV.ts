import fs from 'fs';
import path from 'path';
import { db } from '../database';
import { yahooMarketDataService } from '../services/yahooMarketData';
import { logger } from '../utils/logger';

interface CSVRow {
  Symbol: string;
  Security?: string;
  [key: string]: any;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function importFromCSV(csvPath: string, delayMs: number = 1000) {
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());

  // Parse CSV header
  const headers = lines[0].split(',').map(h => h.trim());
  const symbolIndex = headers.findIndex(h => h.toLowerCase() === 'symbol');

  if (symbolIndex === -1) {
    throw new Error('CSV must have a "Symbol" column');
  }

  const symbols: string[] = [];

  // Parse symbols from CSV
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const symbol = values[symbolIndex];
    if (symbol && symbol !== 'Symbol') {
      symbols.push(symbol);
    }
  }

  logger.info(`Found ${symbols.length} symbols in CSV`);

  // Add symbols to watchlist
  logger.info('Adding symbols to watchlist...');
  for (const symbol of symbols) {
    try {
      db.addToWatchlist(symbol);
      logger.info(`Added ${symbol} to watchlist`);
    } catch (err: any) {
      if (err.message.includes('UNIQUE')) {
        logger.info(`${symbol} already in watchlist`);
      } else {
        logger.error(`Error adding ${symbol} to watchlist:`, err);
      }
    }
  }

  // Bulk import price data with rate limiting
  logger.info(`Starting bulk price data import with ${delayMs}ms delay between requests...`);
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    try {
      logger.info(`[${i + 1}/${symbols.length}] Fetching data for ${symbol}...`);

      // Fetch daily data (this will cache it)
      const dailyData = await yahooMarketDataService.getDailyData(symbol, 'compact');

      if (dailyData.length > 0) {
        successCount++;
        logger.info(`✓ Imported ${dailyData.length} data points for ${symbol}`);
      } else {
        logger.warn(`No data returned for ${symbol}`);
      }

      // Rate limiting delay
      if (i < symbols.length - 1) {
        await sleep(delayMs);
      }
    } catch (err: any) {
      errorCount++;
      logger.error(`✗ Error fetching data for ${symbol}:`, err.message);

      // Continue with next symbol even if one fails
      if (i < symbols.length - 1) {
        await sleep(delayMs);
      }
    }
  }

  logger.info(`\n=== Import Complete ===`);
  logger.info(`Total symbols processed: ${symbols.length}`);
  logger.info(`Successful: ${successCount}`);
  logger.info(`Errors: ${errorCount}`);
  logger.info(`Watchlist size: ${db.getWatchlist().length}`);
}

// Main execution
const csvPath = process.argv[2] || path.join(__dirname, '../data/sp500.csv');
const delayMs = parseInt(process.argv[3] || '2000', 10); // Default 2 second delay

logger.info(`Starting CSV import from: ${csvPath}`);
logger.info(`Rate limit delay: ${delayMs}ms between requests`);

importFromCSV(csvPath, delayMs)
  .then(() => {
    logger.info('Import script completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    logger.error('Import script failed:', err);
    process.exit(1);
  });
