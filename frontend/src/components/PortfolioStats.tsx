import React from 'react';
import { PortfolioStats as PortfolioStatsType } from '../types';
import { DollarSign, TrendingUp, Target, Award } from 'lucide-react';

interface PortfolioStatsProps {
  stats: PortfolioStatsType;
}

const PortfolioStats: React.FC<PortfolioStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-900/50 rounded-lg">
            <DollarSign className="text-blue-400" size={24} />
          </div>
          <div>
            <p className="text-slate-400 text-sm">Total Value</p>
            <p className="text-2xl font-bold text-white">${(stats?.totalValue ?? 0).toFixed(2)}</p>
            <p className="text-xs text-slate-400">Cash: ${(stats?.accountBalance ?? 0).toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg ${
            (stats?.totalPnL ?? 0) >= 0 ? 'bg-green-900/50' : 'bg-red-900/50'
          }`}>
            <TrendingUp className={(stats?.totalPnL ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'} size={24} />
          </div>
          <div>
            <p className="text-slate-400 text-sm">Total P&L</p>
            <p className={`text-2xl font-bold ${
              (stats?.totalPnL ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {(stats?.totalPnL ?? 0) >= 0 ? '+' : ''}${(stats?.totalPnL ?? 0).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-900/50 rounded-lg">
            <Target className="text-purple-400" size={24} />
          </div>
          <div>
            <p className="text-slate-400 text-sm">Open Trades</p>
            <p className="text-2xl font-bold text-white">{stats?.openTrades ?? 0}</p>
            <p className="text-xs text-slate-400">Invested: ${(stats?.investedCapital ?? 0).toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-900/50 rounded-lg">
            <Award className="text-amber-400" size={24} />
          </div>
          <div>
            <p className="text-slate-400 text-sm">Win Rate</p>
            <p className="text-2xl font-bold text-white">{(stats?.winRate ?? 0).toFixed(1)}%</p>
            <p className="text-xs text-slate-400">{stats?.closedTrades ?? 0} closed trades</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioStats;
