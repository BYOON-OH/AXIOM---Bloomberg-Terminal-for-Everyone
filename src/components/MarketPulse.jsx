import React from 'react';
import { useMarketPulse, useIndices } from '../hooks/useData';
import './MarketPulse.css';

const LEVEL_CONFIG = {
  danger:   { border: '#f87171', bg: 'rgba(248,113,113,.06)', glow: 'rgba(248,113,113,.15)' },
  warning:  { border: '#fb923c', bg: 'rgba(251,146,60,.06)',  glow: 'rgba(251,146,60,.12)' },
  positive: { border: '#4ade80', bg: 'rgba(74,222,128,.06)',  glow: 'rgba(74,222,128,.12)' },
  safe:     { border: '#38bdf8', bg: 'rgba(56,189,248,.06)',  glow: 'rgba(56,189,248,.08)' },
};

function SignalCard({ signal, delay = 0 }) {
  const cfg = LEVEL_CONFIG[signal.level] ?? LEVEL_CONFIG.safe;
  return (
    <div
      className="signal-card fade-up"
      style={{
        '--card-border': cfg.border,
        '--card-bg': cfg.bg,
        '--card-glow': cfg.glow,
        animationDelay: `${delay}ms`,
      }}
    >
      <div className="signal-header">
        <span className="signal-icon">{signal.icon}</span>
        <span className="signal-label">{signal.label}</span>
        <span className={`signal-badge signal-badge--${signal.level}`}>{
          signal.level === 'danger' ? '위험' :
          signal.level === 'warning' ? '주의' :
          signal.level === 'positive' ? '긍정' : '안정'
        }</span>
      </div>
      <p className="signal-message">{signal.message}</p>
    </div>
  );
}

function IndexGrid({ indices }) {
  if (!indices) return null;
  const featured = indices.filter(i => ['S&P 500','NASDAQ','KOSPI','VIX','GOLD','CRUDE OIL'].includes(i.label));

  return (
    <div className="index-grid">
      {featured.map((idx, i) => {
        const up = idx.changePct >= 0;
        const isVix = idx.label === 'VIX';
        const danger = isVix && idx.price > 25;
        return (
          <div key={idx.label} className={`index-card fade-up ${danger ? 'index-card--danger' : ''}`} style={{ animationDelay: `${i * 60}ms` }}>
            <div className="index-label">{idx.label}</div>
            <div className="index-price">
              {idx.price?.toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </div>
            <div className={`index-change ${up ? 'up' : 'down'}`}>
              {up ? '▲' : '▼'} {Math.abs(idx.changePct ?? 0).toFixed(2)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function MarketPulse() {
  const signals  = useMarketPulse();
  const { data: indices, loading } = useIndices();

  return (
    <section className="pulse-section">
      <div className="section-header">
        <div className="section-title-row">
          <span className="live-dot" />
          <h2 className="section-title">Market Pulse</h2>
        </div>
        <p className="section-sub">지금 시장에서 감지된 이상 신호와 핵심 지수</p>
      </div>

      {loading ? (
        <div className="pulse-skeleton">
          {[0,1,2].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 8, animationDelay: `${i * 150}ms` }} />)}
        </div>
      ) : (
        <>
          <IndexGrid indices={indices} />
          <div className="signal-list">
            {signals.map((s, i) => <SignalCard key={s.label} signal={s} delay={i * 80} />)}
          </div>
        </>
      )}
    </section>
  );
}
