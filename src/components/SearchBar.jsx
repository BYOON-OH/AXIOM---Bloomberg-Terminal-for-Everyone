import React, { useState, useRef, useEffect } from 'react';
import { useSearch } from '../hooks/useData';
import './SearchBar.css';

const QUICK_SYMBOLS = [
  { symbol: 'AAPL', name: 'Apple' },
  { symbol: 'TSLA', name: 'Tesla' },
  { symbol: 'NVDA', name: 'NVIDIA' },
  { symbol: '^GSPC', name: 'S&P 500' },
  { symbol: 'BTC-USD', name: 'Bitcoin' },
  { symbol: 'ETH-USD', name: 'Ethereum' },
  { symbol: '^KS11', name: 'KOSPI' },
  { symbol: '005930.KS', name: '삼성전자' },
];

export default function SearchBar({ onSelect }) {
  const [query, setQuery]   = useState('');
  const [open, setOpen]     = useState(false);
  const { results, loading, search } = useSearch();
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    search(query);
  }, [query, search]);

  useEffect(() => {
    function handleClick(e) {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelect(item) {
    setQuery('');
    setOpen(false);
    onSelect?.(item);
  }

  return (
    <div className="search-container" ref={containerRef}>
      <div className={`search-box ${open ? 'open' : ''}`}>
        <div className="search-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
        <input
          ref={inputRef}
          className="search-input"
          type="text"
          placeholder="종목·지수·ETF·코인 검색... (예: AAPL, 삼성전자, BTC)"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
            if (e.key === 'Enter' && results[0]) handleSelect(results[0]);
          }}
          autoComplete="off"
          spellCheck="false"
        />
        {loading && <div className="search-spinner" />}
        {query && (
          <button className="search-clear" onClick={() => { setQuery(''); setOpen(false); }}>✕</button>
        )}
      </div>

      {open && (
        <div className="search-dropdown fade-in">
          {!query && (
            <>
              <div className="search-section-label">⚡ 빠른 검색</div>
              <div className="search-quick-grid">
                {QUICK_SYMBOLS.map(item => (
                  <button key={item.symbol} className="search-quick-chip" onClick={() => handleSelect(item)}>
                    <span className="chip-symbol">{item.symbol}</span>
                    <span className="chip-name">{item.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {query && results.length > 0 && (
            <>
              <div className="search-section-label">검색 결과</div>
              {results.map(item => (
                <button key={item.symbol} className="search-result-item" onClick={() => handleSelect(item)}>
                  <div className="result-left">
                    <span className="result-symbol">{item.symbol}</span>
                    <span className="result-type">{item.type}</span>
                  </div>
                  <span className="result-name">{item.name}</span>
                  <span className="result-exchange">{item.exchange}</span>
                </button>
              ))}
            </>
          )}

          {query && !loading && results.length === 0 && (
            <div className="search-empty">
              <span>"{query}" 검색 결과 없음</span>
              <a
                href={`https://finance.yahoo.com/search?q=${encodeURIComponent(query)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="search-external-link"
              >
                Yahoo Finance에서 검색 →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
