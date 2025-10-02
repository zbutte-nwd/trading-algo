import React, { useState, useEffect, useRef } from 'react';
import { WatchlistItem } from '../types';
import { TrendingUp, TrendingDown, Plus, Trash2, Search } from 'lucide-react';
import { searchSymbols } from '../api';

interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
}

interface WatchlistPanelProps {
  items: WatchlistItem[];
  onAdd: (symbol: string) => void;
  onRemove: (symbol: string) => void;
  onSymbolClick: (symbol: string) => void;
}

const WatchlistPanel: React.FC<WatchlistPanelProps> = ({ items, onAdd, onRemove, onSymbolClick }) => {
  const [newSymbol, setNewSymbol] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (newSymbol.length >= 1) {
        setIsSearching(true);
        try {
          const res = await searchSymbols(newSymbol);
          setSearchResults(res.data || []);
          setShowDropdown(true);
        } catch (err) {
          console.error('Search error:', err);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [newSymbol]);

  const handleAdd = (symbol?: string) => {
    const symbolToAdd = symbol || newSymbol.trim();
    if (symbolToAdd) {
      onAdd(symbolToAdd.toUpperCase());
      setNewSymbol('');
      setSearchResults([]);
      setShowDropdown(false);
    }
  };

  const handleSelectResult = (result: SearchResult) => {
    handleAdd(result.symbol);
  };

  const getSignalColor = (signal?: string) => {
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
    <div className="bg-slate-800 rounded-lg border border-slate-700">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-bold text-white mb-3">Watchlist</h2>
        <div className="relative" ref={dropdownRef}>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="Search symbols (e.g., Apple, AAPL)"
                className="w-full px-3 py-2 pl-9 bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              {isSearching && (
                <div className="absolute right-3 top-2.5">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-400 border-t-transparent"></div>
                </div>
              )}
            </div>
            <button
              onClick={() => handleAdd()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex items-center gap-2"
            >
              <Plus size={16} />
              Add
            </button>
          </div>

          {/* Search Results Dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-slate-900 border border-slate-600 rounded shadow-lg max-h-60 overflow-y-auto">
              {searchResults.slice(0, 10).map((result, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectResult(result)}
                  className="p-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700 last:border-0"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-white font-semibold">{result.symbol}</div>
                      <div className="text-sm text-slate-400">{result.name}</div>
                    </div>
                    <div className="text-xs text-slate-500">{result.exchange}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showDropdown && searchResults.length === 0 && !isSearching && newSymbol.length >= 1 && (
            <div className="absolute z-10 w-full mt-1 bg-slate-900 border border-slate-600 rounded shadow-lg p-3 text-slate-400 text-sm">
              No results found for "{newSymbol}"
            </div>
          )}
        </div>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
        {items.length === 0 ? (
          <div className="p-4 text-center text-slate-400">
            No symbols in watchlist. Add some to get started!
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.symbol}
              className="p-3 border-b border-slate-700 hover:bg-slate-700/50 transition-colors cursor-pointer"
              onClick={() => onSymbolClick(item.symbol)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-white font-semibold">{item.symbol}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-bold text-white">
                      ${item.currentPrice.toFixed(2)}
                    </span>
                    <div className={`flex items-center text-sm ${
                      item.change >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {item.change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      <span className="ml-1">
                        {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)} ({item.changePercent})
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-2 text-xs">
                    {item.signal && (
                      <span className={`font-semibold ${getSignalColor(item.signal)}`}>
                        {item.signal}
                      </span>
                    )}
                    {item.rsi && (
                      <span className="text-slate-400">
                        RSI: {item.rsi.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(item.symbol);
                  }}
                  className="p-1 hover:bg-slate-600 rounded transition-colors text-slate-400 hover:text-red-400"
                  title="Remove from watchlist"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default WatchlistPanel;
