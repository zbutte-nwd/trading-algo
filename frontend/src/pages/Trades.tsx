import React, { useState, useEffect } from 'react';
import { getOpenTrades, getScreeningPicks, closeTrade as closeTradeAPI } from '../api';
import { Trade } from '../types';
import TradeCard from '../components/TradeCard';
import { RefreshCw, TrendingUp, Target } from 'lucide-react';

interface ScreeningPick {
  id: number;
  symbol: string;
  signal: string;
  price: number;
  rsi: number;
  maShort: number;
  maLong: number;
  stopLoss: number;
  takeProfit: number;
  reason: string;
  screenedAt: string;
  executed: number;
}

const Trades: React.FC = () => {
  const [openTrades, setOpenTrades] = useState<Trade[]>([]);
  const [screeningPicks, setScreeningPicks] = useState<ScreeningPick[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tradesRes, picksRes] = await Promise.all([
        getOpenTrades(),
        getScreeningPicks()
      ]);
      setOpenTrades(tradesRes.data);
      setScreeningPicks(picksRes.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCloseTrade = async (id: number) => {
    if (!confirm('Are you sure you want to close this position?')) {
      return;
    }

    try {
      await closeTradeAPI(id);
      await loadData();
    } catch (err: any) {
      alert('Failed to close trade: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Trade Bank</h1>
        <button
          onClick={loadData}
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

      {/* Section 1: Potential Buys */}
      <div className="bg-slate-800 rounded-lg border border-slate-700">
        <div className="px-6 py-4 border-b border-slate-700 flex items-center gap-2">
          <TrendingUp size={20} className="text-green-400" />
          <h2 className="text-xl font-semibold text-white">Potential Buys</h2>
          <span className="ml-2 px-2 py-1 bg-slate-700 text-slate-300 rounded text-sm">
            {screeningPicks.length}
          </span>
        </div>
        <div className="p-6">
          {screeningPicks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400">No screening picks available</p>
              <p className="text-slate-500 text-sm mt-2">
                Picks are generated daily at 4pm EST market close
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-700">
                  <tr className="text-slate-400 text-left">
                    <th className="pb-3 px-2">Symbol</th>
                    <th className="pb-3 px-2">Signal</th>
                    <th className="pb-3 px-2">Price</th>
                    <th className="pb-3 px-2">RSI</th>
                    <th className="pb-3 px-2">Stop Loss</th>
                    <th className="pb-3 px-2">Take Profit</th>
                    <th className="pb-3 px-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {screeningPicks.map((pick) => (
                    <tr key={pick.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-3 px-2 text-white font-medium">{pick.symbol}</td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          pick.signal === 'BUY' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                        }`}>
                          {pick.signal}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-slate-300">${pick.price.toFixed(2)}</td>
                      <td className="py-3 px-2 text-slate-300">{pick.rsi.toFixed(1)}</td>
                      <td className="py-3 px-2 text-red-400">${pick.stopLoss.toFixed(2)}</td>
                      <td className="py-3 px-2 text-green-400">${pick.takeProfit.toFixed(2)}</td>
                      <td className="py-3 px-2 text-slate-400 text-xs max-w-xs truncate">{pick.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Active Positions */}
      <div className="bg-slate-800 rounded-lg border border-slate-700">
        <div className="px-6 py-4 border-b border-slate-700 flex items-center gap-2">
          <Target size={20} className="text-blue-400" />
          <h2 className="text-xl font-semibold text-white">Active Positions</h2>
          <span className="ml-2 px-2 py-1 bg-slate-700 text-slate-300 rounded text-sm">
            {openTrades.length}
          </span>
        </div>
        <div className="p-6">
          {openTrades.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400">No active positions</p>
              <p className="text-slate-500 text-sm mt-2">
                Positions are entered at 9:30am EST market open
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {openTrades.map(trade => (
                <TradeCard
                  key={trade.id}
                  trade={trade}
                  onClose={handleCloseTrade}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Trades;
