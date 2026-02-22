import React, { useMemo } from 'react';
import { useIndices, useForex, useCrypto } from '../hooks/useData';
import './Ticker.css';

function TickerItem({ label, price, changePct }) {
  if (price == null) return null;
  const up = changePct >= 0;
  return (
    <span className="ticker-item">
      <span className="ticker-label">{label}</span>
      <span className="ticker-price">{typeof price === 'number' ? price.toLocaleString('en-US', { maximumFractionDigits: 2 }) : price}</span>
      <span className={`ticker-change ${up ? 'up' : 'down'}`}>
        {up ? '▲' : '▼'} {Math.abs(changePct).toFixed(2)}%
      </span>
    </span>
  );
}

export default function Ticker() {
  const { data: indices } = useIndices();
  const { data: forex }   = useForex();
  const { data: crypto }  = useCrypto();

  const items = useMemo(() => {
    const out = [];
    (indices ?? []).forEach(i => out.push({ label: i.label, price: i.price, changePct: i.changePct }));
    (forex ?? []).forEach(f => out.push({ label: f.label, price: f.rate, changePct: 0 }));
    (crypto ?? []).forEach(c => out.push({ label: c.symbol, price: c.price, changePct: c.changePct }));
    return out.filter(i => i.price != null);
  }, [indices, forex, crypto]);

  if (!items.length) return <div className="ticker-bar ticker-empty">데이터 로딩 중...</div>;

  const doubled = [...items, ...items]; // 무한 스크롤을 위해 복제

  return (
    <div className="ticker-bar" aria-label="실시간 시세">
      <div className="ticker-badge">LIVE</div>
      <div className="ticker-track">
        <div className="ticker-scroll">
          {doubled.map((item, i) => <TickerItem key={i} {...item} />)}
        </div>
      </div>
    </div>
  );
}
