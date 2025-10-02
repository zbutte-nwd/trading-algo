import React, { useState, useEffect } from 'react';
import { getAllTrades, closeTrade as closeTradeAPI } from '../api';
import { Trade } from '../types';
import TradeCard from '../components/TradeCard';
import { RefreshCw } from 'lucide-react';

const Trades: React.FC = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTrades = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAllTrades();
      setTrades(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load trades');
      console.error('Error loading trades:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrades();
  }, []);

  const handleCloseTrade = async (id: number) => {
    if (!confirm('Are you sure you want to close this position?')) {
      return;
    }

    try {
      await closeTradeAPI(id);
      await loadTrades();
    } catch (err: any) {
      alert('Failed to close trade: ' + (err.response?.data?.error || err.message));
    }
  };

  const filteredTrades = trades.filter(trade => {
    if (filter === 'all') return true;
    return trade.status.toLowerCase() === filter;
  });

  const openTrades = trades.filter(t => t.status === 'OPEN');
  const closedTrades = trades.filter(t => t.status === 'CLOSED');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Trade Bank</h1>
        <button
          onClick={loadTrades}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white rounded transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          All Trades ({trades.length})
        </button>
        <button
          onClick={() => setFilter('open')}
          className={`px-4 py-2 rounded transition-colors ${
            filter === 'open'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Open ({openTrades.length})
        </button>
        <button
          onClick={() => setFilter('closed')}
          className={`px-4 py-2 rounded transition-colors ${
            filter === 'closed'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Closed ({closedTrades.length})
        </button>
      </div>

      {filteredTrades.length === 0 ? (
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-12 text-center">
          <p className="text-slate-400 text-lg">No trades found</p>
          <p className="text-slate-500 text-sm mt-2">
            Run the analysis script to generate trades based on your watchlist
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTrades.map(trade => (
            <TradeCard
              key={trade.id}
              trade={trade}
              onClose={trade.status === 'OPEN' ? handleCloseTrade : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Trades;
