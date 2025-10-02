import React, { useState } from 'react';
import { analyzeStock } from '../api';
import { Search, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const Analysis: React.FC = () => {
  const [symbol, setSymbol] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await analyzeStock(symbol.toUpperCase());
      setAnalysis(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to analyze stock');
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'BUY':
        return <TrendingUp className="text-green-400" size={32} />;
      case 'SELL':
        return <TrendingDown className="text-red-400" size={32} />;
      default:
        return <Minus className="text-slate-400" size={32} />;
    }
  };

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'BUY':
        return 'text-green-400';
      case 'SELL':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Stock Analysis</h1>

      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <form onSubmit={handleAnalyze} className="flex gap-3">
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="Enter stock symbol (e.g., AAPL)"
            className="flex-1 px-4 py-3 bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={loading || !symbol.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white rounded transition-colors flex items-center gap-2"
          >
            <Search size={20} />
            Analyze
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {loading && (
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Analyzing {symbol}...</p>
        </div>
      )}

      {analysis && !loading && (
        <div className="space-y-6">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <div className="flex items-center gap-4 mb-6">
              {getSignalIcon(analysis.action)}
              <div>
                <h2 className="text-2xl font-bold text-white">{symbol.toUpperCase()}</h2>
                <p className={`text-xl font-semibold ${getSignalColor(analysis.action)}`}>
                  {analysis.action} Signal
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-slate-400 text-sm">Current Price</p>
                <p className="text-white text-xl font-semibold">${analysis.entryPrice.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Stop Loss</p>
                <p className="text-red-400 text-xl font-semibold">${analysis.stopLoss.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Take Profit</p>
                <p className="text-green-400 text-xl font-semibold">${analysis.takeProfit.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Risk/Reward</p>
                <p className="text-white text-xl font-semibold">1:3</p>
              </div>
            </div>

            <div className="border-t border-slate-700 pt-4">
              <h3 className="text-lg font-semibold text-white mb-3">Analysis Reason</h3>
              <p className="text-slate-300">{analysis.reason}</p>
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Technical Indicators</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-slate-400 text-sm">RSI</p>
                <p className="text-white text-lg font-semibold">{analysis.indicators.rsi.toFixed(2)}</p>
                <p className={`text-xs ${
                  analysis.indicators.rsi < 30 ? 'text-green-400' :
                  analysis.indicators.rsi > 70 ? 'text-red-400' :
                  'text-slate-400'
                }`}>
                  {analysis.indicators.rsi < 30 ? 'Oversold' :
                   analysis.indicators.rsi > 70 ? 'Overbought' :
                   'Neutral'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">MA20</p>
                <p className="text-white text-lg font-semibold">${analysis.indicators.maShort.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">MA50</p>
                <p className="text-white text-lg font-semibold">${analysis.indicators.maLong.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">ATR</p>
                <p className="text-white text-lg font-semibold">${analysis.indicators.atr.toFixed(2)}</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <p className="text-slate-400 text-sm">Support Level</p>
                <p className="text-green-400 text-lg font-semibold">${analysis.indicators.support.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Resistance Level</p>
                <p className="text-red-400 text-lg font-semibold">${analysis.indicators.resistance.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {analysis.shouldTrade && (
            <div className={`rounded-lg border p-6 ${
              analysis.action === 'BUY'
                ? 'bg-green-900/20 border-green-700'
                : 'bg-red-900/20 border-red-700'
            }`}>
              <h3 className="text-lg font-semibold text-white mb-2">
                Trading Opportunity Detected!
              </h3>
              <p className="text-slate-300">
                This stock meets the screening criteria and shows a {analysis.action} signal.
                Review the analysis and consider adding this trade to your portfolio.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Analysis;
