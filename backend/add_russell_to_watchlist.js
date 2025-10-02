const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'trading.db');
const db = new Database(dbPath);

const symbols = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'AMD',
  'NFLX', 'DIS', 'INTC', 'CSCO', 'ADBE', 'PYPL', 'ORCL', 'IBM',
  'BA', 'GE', 'CAT', 'MMM', 'HON', 'UPS', 'LMT', 'RTX',
  'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'USB', 'PNC',
  'JNJ', 'PFE', 'ABBV', 'MRK', 'TMO', 'ABT', 'LLY', 'AMGN',
  'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'PSX', 'VLO',
  'WMT', 'HD', 'NKE', 'MCD', 'SBUX', 'TGT', 'LOW', 'COST',
  'V', 'MA', 'AXP', 'BLK', 'SPGI', 'CME', 'ICE', 'SCHW',
  'T', 'VZ', 'TMUS', 'CMCSA', 'CHTR', 'DISH', 'FOXA', 'PARA',
  'PG', 'KO', 'PEP', 'PM', 'MO', 'CL', 'EL', 'KMB',
  'UNH', 'CVS', 'CI', 'HUM', 'ANTM', 'MOH', 'HCA', 'CNC',
  'QCOM', 'AVGO', 'TXN', 'AMAT', 'LRCX', 'KLAC', 'MCHP', 'ADI',
];

// Get existing watchlist
const existing = db.prepare('SELECT symbol FROM watchlist').all();
const existingSymbols = new Set(existing.map(row => row.symbol));

// Insert new symbols
const insert = db.prepare('INSERT OR IGNORE INTO watchlist (symbol, added_at) VALUES (?, datetime("now"))');
let added = 0;

symbols.forEach(symbol => {
  if (!existingSymbols.has(symbol)) {
    insert.run(symbol);
    added++;
    console.log(`Added ${symbol}`);
  } else {
    console.log(`${symbol} already in watchlist`);
  }
});

db.close();
console.log(`\nDone! Added ${added} new symbols to watchlist.`);
console.log(`Total watchlist size: ${existing.length + added} symbols`);
