import React from 'react';
import { Trade } from '../types';
import { TrendingUp, TrendingDown, X } from 'lucide-react';

interface TradeCardProps {
  trade: Trade;
  onClose?: (id: number) => void;
}

const TradeCard: React.FC<TradeCardProps> = ({ trade, onClose }) => {
  const isProfit = trade.pnl ? trade.pnl > 0 : false;
  const isOpen = trade.status === 'OPEN';

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-xl font-bold text-white">{trade.symbol}</h3>
          <span className={`text-sm px-2 py-1 rounded ${
            trade.action === 'BUY' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
          }`}>
            {trade.action}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isOpen ? (
            <span className="px-2 py-1 bg-blue-900 text-blue-300 text-xs rounded">OPEN</span>
          ) : (
            <span className={`px-2 py-1 text-xs rounded ${
              isProfit ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
            }`}>
              CLOSED
            </span>
          )}
          {isOpen && onClose && (
            <button
              onClick={() => onClose(trade.id)}
              className="p-1 hover:bg-slate-700 rounded transition-colors"
              title="Close position"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-slate-400 text-sm">Quantity</p>
          <p className="text-white font-semibold">{trade.quantity}</p>
        </div>
        <div>
          <p className="text-slate-400 text-sm">Entry Price</p>
          <p className="text-white font-semibold">${trade.entryPrice.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-slate-400 text-sm">Stop Loss</p>
          <p className="text-red-400 font-semibold">${trade.stopLoss.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-slate-400 text-sm">Take Profit</p>
          <p className="text-green-400 font-semibold">${trade.takeProfit.toFixed(2)}</p>
        </div>
      </div>

      {!isOpen && trade.pnl !== undefined && (
        <div className={`p-3 rounded mb-3 ${
          isProfit ? 'bg-green-900/30' : 'bg-red-900/30'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">P&L</span>
            <div className="flex items-center gap-2">
              {isProfit ? <TrendingUp size={16} className="text-green-400" /> : <TrendingDown size={16} className="text-red-400" />}
              <span className={`font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                ${Math.abs(trade.pnl).toFixed(2)} ({trade.pnlPercent?.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-slate-700 pt-3">
        <p className="text-slate-400 text-sm mb-1">Entry Reason:</p>
        <p className="text-slate-300 text-sm mb-3">{trade.entryReason}</p>

        <details className="text-sm">
          <summary className="text-slate-400 cursor-pointer hover:text-slate-300">
            Exit Criteria
          </summary>
          <pre className="text-slate-300 text-xs mt-2 whitespace-pre-wrap bg-slate-900 p-2 rounded">
            {trade.exitCriteria}
          </pre>
        </details>

        {trade.exitReason && (
          <div className="mt-3">
            <p className="text-slate-400 text-sm">Exit Reason:</p>
            <p className="text-slate-300 text-sm">{trade.exitReason}</p>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-3 text-xs text-slate-400">
        {trade.rsi && <span>RSI: {trade.rsi.toFixed(2)}</span>}
        {trade.maShort && <span>MA20: ${trade.maShort.toFixed(2)}</span>}
        {trade.maLong && <span>MA50: ${trade.maLong.toFixed(2)}</span>}
      </div>
    </div>
  );
};

export default TradeCard;
