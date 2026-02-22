import React from 'react';
import './Header.css';

export default function Header({ currentTime }) {
  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="header-brand">
          <span className="brand-hex">⬡</span>
          <div className="brand-text">
            <span className="brand-name">AXIOM</span>
            <span className="brand-tagline">시장을 읽는 새로운 언어</span>
          </div>
        </div>

        <div className="header-center">
          <span className="header-badge">BETA</span>
          <span className="header-disclaimer">투자 추천 아님 — 맥락 이해 도구</span>
        </div>

        <div className="header-right">
          <div className="header-clock">
            <span className="clock-label">UTC</span>
            <span className="clock-time">{currentTime?.toUTCString().slice(17, 25)}</span>
          </div>
          <a
            href="https://www.alphavantage.co/support/#api-key"
            target="_blank"
            rel="noopener noreferrer"
            className="header-setup-link"
          >
            API 설정 →
          </a>
        </div>
      </div>
    </header>
  );
}
