import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import Ticker from './components/Ticker.jsx';
import SearchBar from './components/SearchBar.jsx';
import AssetPanel from './components/AssetPanel.jsx';
import MarketPulse from './components/MarketPulse.jsx';
import NewsTranslator from './components/NewsTranslator.jsx';
import MacroDecoder from './components/MacroDecoder.jsx';
import QuickWidgets from './components/QuickWidgets.jsx';
import './styles/App.css';

export default function App() {
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  function handleSearch(asset) {
    setSelectedAsset(asset);
    // 부드럽게 스크롤
    setTimeout(() => {
      document.getElementById('asset-panel-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  const TABS = [
    { key: 'home',    label: '홈' },
    { key: 'pulse',   label: 'Market Pulse' },
    { key: 'news',    label: 'News Translator' },
    { key: 'macro',   label: 'Macro Decoder' },
  ];

  return (
    <div className="app">
      <Header currentTime={currentTime} />
      <Ticker />

      <main className="main-content">
        <div className="container">

          {/* ─── Hero / 검색 섹션 ─── */}
          <section className="hero-section">
            <div className="hero-eyebrow">
              <span className="eyebrow-dot" />
              <span>Bloomberg Terminal for Everyone</span>
            </div>
            <h1 className="hero-title">
              정보를 더 주지 않는다.<br />
              <span className="hero-accent">이해 가능한 문장으로 번역한다.</span>
            </h1>
            <p className="hero-sub">
              기관이 보는 시장 신호를 일반 투자자 언어로 — 매수/매도 추천 없이 맥락만
            </p>
            <SearchBar onSelect={handleSearch} />
            <div className="hero-hints">
              <span className="hint-text">예시:</span>
              {['AAPL', 'TSLA', '삼성전자', 'BTC-USD', 'SPY'].map(s => (
                <button
                  key={s}
                  className="hint-chip"
                  onClick={() => handleSearch({ symbol: s, name: s })}
                >
                  {s}
                </button>
              ))}
            </div>
          </section>

          {/* ─── 종목 패널 ─── */}
          <div id="asset-panel-anchor" />
          {selectedAsset && (
            <AssetPanel
              asset={selectedAsset}
              onClose={() => setSelectedAsset(null)}
            />
          )}

          {/* ─── 탭 네비게이션 ─── */}
          <div className="tab-nav">
            {TABS.map(tab => (
              <button
                key={tab.key}
                className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ─── 홈 탭 — 전체 보기 ─── */}
          {(activeTab === 'home') && (
            <>
              <QuickWidgets />
              <MarketPulse />
              <div className="two-col-layout">
                <NewsTranslator />
                <MacroDecoder />
              </div>
            </>
          )}

          {activeTab === 'pulse' && <MarketPulse />}
          {activeTab === 'news'  && <NewsTranslator />}
          {activeTab === 'macro' && <MacroDecoder />}

        </div>
      </main>

      <footer className="app-footer">
        <div className="container footer-inner">
          <div className="footer-brand">⬡ AXIOM</div>
          <div className="footer-links">
            <a href="https://www.alphavantage.co" target="_blank" rel="noopener noreferrer">Alpha Vantage</a>
            <a href="https://finance.yahoo.com" target="_blank" rel="noopener noreferrer">Yahoo Finance</a>
            <a href="https://fred.stlouisfed.org" target="_blank" rel="noopener noreferrer">FRED</a>
            <a href="https://www.coingecko.com" target="_blank" rel="noopener noreferrer">CoinGecko</a>
          </div>
          <p className="footer-disclaimer">
            이 서비스는 교육·정보 목적으로만 제공됩니다. 투자 판단의 책임은 전적으로 본인에게 있습니다.
          </p>
        </div>
      </footer>
    </div>
  );
}
