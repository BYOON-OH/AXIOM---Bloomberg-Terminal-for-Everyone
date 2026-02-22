import React from 'react';
import { useForex, useCrypto } from '../hooks/useData';
import './QuickWidgets.css';

function ForexWidget() {
  const { data: forex, loading } = useForex();

  return (
    <div className="widget-card">
      <div className="widget-header">
        <span className="widget-dot" style={{ background: '#f0b429' }} />
        <span className="widget-title">환율</span>
        <a
          href="https://finance.yahoo.com/currencies"
          target="_blank"
          rel="noopener noreferrer"
          className="widget-external"
        >↗</a>
      </div>
      {loading ? (
        <div className="skeleton" style={{ height: 80, borderRadius: 6 }} />
      ) : (
        <div className="forex-list">
          {(forex ?? []).map(f => (
            <div key={f.label} className="forex-row">
              <span className="forex-label">{f.label}</span>
              <span className="forex-rate mono">
                {f.rate?.toLocaleString('en-US', {
                  minimumFractionDigits: f.label.includes('KRW') || f.label.includes('JPY') ? 1 : 4,
                  maximumFractionDigits: f.label.includes('KRW') || f.label.includes('JPY') ? 1 : 4,
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CryptoWidget() {
  const { data: crypto, loading } = useCrypto();

  return (
    <div className="widget-card">
      <div className="widget-header">
        <span className="widget-dot" style={{ background: '#f59e0b' }} />
        <span className="widget-title">암호화폐</span>
        <a
          href="https://www.coingecko.com"
          target="_blank"
          rel="noopener noreferrer"
          className="widget-external"
        >↗</a>
      </div>
      {loading ? (
        <div className="skeleton" style={{ height: 80, borderRadius: 6 }} />
      ) : (
        <div className="crypto-list">
          {(crypto ?? []).map(c => {
            const up = (c.changePct ?? 0) >= 0;
            return (
              <div key={c.symbol} className="crypto-row">
                <span className="crypto-symbol">{c.symbol ?? c.label}</span>
                <div className="crypto-right">
                  <span className="crypto-price mono">
                    ${(c.price ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </span>
                  <span className={`crypto-change ${up ? 'up' : 'down'}`}>
                    {up ? '▲' : '▼'} {Math.abs(c.changePct ?? 0).toFixed(2)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RiskRadarWidget() {
  // VIX 등을 활용한 간단한 위험 신호
  const items = [
    { label: 'FOMC 회의', date: '다음 예정', note: 'fomc.gov 일정 확인', level: 'neutral', link: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm' },
    { label: '거시지표 캘린더', date: '실시간', note: 'economic indicators', level: 'info', link: 'https://www.investing.com/economic-calendar/' },
    { label: '공포탐욕 지수', date: '현재', note: 'CNN Money 기준', level: 'info', link: 'https://edition.cnn.com/markets/fear-and-greed' },
  ];

  return (
    <div className="widget-card">
      <div className="widget-header">
        <span className="widget-dot" style={{ background: '#f87171' }} />
        <span className="widget-title">Risk Radar</span>
      </div>
      <div className="radar-list">
        {items.map(item => (
          <a
            key={item.label}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="radar-item"
          >
            <div className="radar-left">
              <span className="radar-label">{item.label}</span>
              <span className="radar-note">{item.note}</span>
            </div>
            <span className="radar-arrow">→</span>
          </a>
        ))}
      </div>
    </div>
  );
}

export default function QuickWidgets() {
  return (
    <div className="widgets-grid">
      <ForexWidget />
      <CryptoWidget />
      <RiskRadarWidget />
    </div>
  );
}
