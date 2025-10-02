import React, { useState, useEffect } from 'react';
import { getWatchlistDetails, getPortfolioStats, addToWatchlist, removeFromWatchlist, getDailyData, analyzeWatchlist, runBulkScreening } from '../api';
import { WatchlistItem, PortfolioStats as PortfolioStatsType, StockData } from '../types';
import WatchlistPanel from '../components/WatchlistPanel';
import PortfolioStats from '../components/PortfolioStats';
import StockChart from '../components/StockChart';
import { RefreshCw, Play, Zap } from 'lucide-react';

interface AnalyzedStock {
  symbol: string;
  action: string;
  rsi: number;
  reason: string;
  tradeCreated: boolean;
}

const Dashboard: React.FC = () => {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [stats, setStats] = useState<PortfolioStatsType | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [chartData, setChartData] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [analyzedStocks, setAnalyzedStocks] = useState<AnalyzedStock[]>([]);
  const [showAnalysisResults, setShowAnalysisResults] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [watchlistRes, statsRes] = await Promise.all([
        getWatchlistDetails(50, 0), // Fetch first 50 items
        getPortfolioStats(),
      ]);

      setWatchlist(watchlistRes.data.data); // Extract data from paginated response
      setStats(statsRes.data);

      // Load chart for first symbol if available
      if (watchlistRes.data.data.length > 0 && !selectedSymbol) {
        const firstSymbol = watchlistRes.data.data[0].symbol;
        setSelectedSymbol(firstSymbol);
        const dailyRes = await getDailyData(firstSymbol);
        setChartData(dailyRes.data.slice(0, 30));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Refresh data every 60 seconds
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleAddSymbol = async (symbol: string) => {
    try {
      await addToWatchlist(symbol);
      await loadData();
    } catch (err: any) {
      alert('Failed to add symbol: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleRemoveSymbol = async (symbol: string) => {
    try {
      await removeFromWatchlist(symbol);
      if (selectedSymbol === symbol) {
        setSelectedSymbol(null);
        setChartData([]);
      }
      await loadData();
    } catch (err: any) {
      alert('Failed to remove symbol: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleSymbolClick = async (symbol: string) => {
    setSelectedSymbol(symbol);
    try {
      const dailyRes = await getDailyData(symbol);
      setChartData(dailyRes.data.slice(0, 30));
    } catch (err: any) {
      console.error('Error loading chart data:', err);
    }
  };

  const handleAnalyzeWatchlist = async () => {
    setAnalyzing(true);
    setError(null);
    setSuccessMessage(null);
    setAnalyzedStocks([]);
    try {
      const res = await analyzeWatchlist();
      const { symbolsAnalyzed, tradesCreated, analyzedStocks: stocks } = res.data;

      setAnalyzedStocks(stocks || []);
      setShowAnalysisResults(true);

      if (tradesCreated > 0) {
        setSuccessMessage(`Analysis complete! Created ${tradesCreated} trade(s) from ${symbolsAnalyzed} symbols`);
      } else {
        setSuccessMessage(`Analysis complete! Analyzed ${symbolsAnalyzed} symbols - no trading opportunities found`);
      }

      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to analyze watchlist');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleBulkScreening = async () => {
    if (!confirm('This will screen 50 stocks and may take several minutes. Continue?')) {
      return;
    }

    setAnalyzing(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await runBulkScreening(0, 50);
      setSuccessMessage(res.data.message + ' - Check Trade Bank for results');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start bulk screening');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <div className="flex gap-2">
          <button
            onClick={handleAnalyzeWatchlist}
            disabled={analyzing || loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white rounded transition-colors"
          >
            <Play size={16} className={analyzing ? 'animate-pulse' : ''} />
            Analyze Watchlist
          </button>
          <button
            onClick={handleBulkScreening}
            disabled={analyzing || loading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 text-white rounded transition-colors"
          >
            <Zap size={16} />
            Bulk Screen (50)
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white rounded transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-900/50 border border-green-700 text-green-200 px-4 py-3 rounded flex justify-between items-center">
          <span>{successMessage}</span>
          {analyzedStocks.length > 0 && (
            <button
              onClick={() => setShowAnalysisResults(!showAnalysisResults)}
              className="text-sm underline hover:text-green-100"
            >
              {showAnalysisResults ? 'Hide Details' : 'View Details'}
            </button>
          )}
        </div>
      )}

      {showAnalysisResults && analyzedStocks.length > 0 && (
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Analysis Results</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-700">
                <tr className="text-slate-400 text-left">
                  <th className="pb-2 px-2">Symbol</th>
                  <th className="pb-2 px-2">Action</th>
                  <th className="pb-2 px-2">RSI</th>
                  <th className="pb-2 px-2">Reason</th>
                  <th className="pb-2 px-2">Trade Created</th>
                </tr>
              </thead>
              <tbody>
                {analyzedStocks.map((stock, idx) => (
                  <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="py-2 px-2 text-white font-medium">{stock.symbol}</td>
                    <td className="py-2 px-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        stock.action === 'BUY' ? 'bg-green-900/50 text-green-400' :
                        stock.action === 'SELL' ? 'bg-red-900/50 text-red-400' :
                        'bg-slate-700 text-slate-400'
                      }`}>
                        {stock.action}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-slate-300">{stock.rsi.toFixed(2)}</td>
                    <td className="py-2 px-2 text-slate-400 text-xs">{stock.reason}</td>
                    <td className="py-2 px-2">
                      {stock.tradeCreated ? (
                        <span className="text-green-400 text-xs">✓ Yes</span>
                      ) : (
                        <span className="text-slate-500 text-xs">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {stats && <PortfolioStats stats={stats} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            {selectedSymbol && chartData.length > 0 ? (
              <StockChart data={chartData} symbol={selectedSymbol} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-400">
                Select a symbol from the watchlist to view chart
              </div>
            )}
          </div>
        </div>

        <div>
          <WatchlistPanel
            items={watchlist}
            onAdd={handleAddSymbol}
            onRemove={handleRemoveSymbol}
            onSymbolClick={handleSymbolClick}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
