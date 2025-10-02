// Sample of Russell 2000 stocks - using well-established tickers
// Replace with full list or use a CSV import for all 2000
export const russell2000Symbols = [
  // Use major stocks first to test
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

// Function to load full Russell 2000 list from file/API if needed
export async function loadFullRussell2000(): Promise<string[]> {
  // TODO: Implement CSV or API loading for full 2000 stocks
  return russell2000Symbols;
}
