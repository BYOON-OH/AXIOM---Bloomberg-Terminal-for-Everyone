import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { useQuote, useHistory } from '../hooks/useData';
import { fetchAssetNews, inferSentiment } from '../services/dataService';
import './AssetPanel.css';

const RANGES = [
  { key: '5d',  label: '5일' },
  { key: '1mo', label: '1개월' },
  { key: '3mo', label: '3개월' },
  { key: '6mo', label: '6개월' },
  { key: '1y',  label: '1년' },
];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  return `${Math.floor(hrs / 24)}일 전`;
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <div className="tooltip-date">{d.date}</div>
      <div className="tooltip-price">
        {d.price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
    </div>
  );
}

function AssetNewsFeed({ symbol, name }) {
  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setNews(null);
    fetchAssetNews(symbol, name).then(data => {
      setNews(data);
      setLoading(false);
    });
  }, [symbol, name]);

  const SENT = {
    bullish: { icon: '📈', color: '#4ade80', label: '강세' },
    bearish: { icon: '📉', color: '#f87171', label: '약세' },
    neutral: { icon: '➖', color: '#8fa3b8', label: '중립' },
  };

  if (loading) return (
    <div className="asset-news-section">
      <div className="asset-news-title">관련 뉴스</div>
      {[0,1,2].map(i => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 6, marginBottom: 6 }} />)}
    </div>
  );

  return (
    <div className="asset-news-section">
      <div className="asset-news-title">📰 관련 뉴스</div>
      {(news ?? []).map((article, i) => {
        const sent = SENT[article.sentiment] ?? SENT.neutral;
        return (
          <a
            key={i}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="asset-news-item"
            style={{ '--sent-color': sent.color }}
          >
            <div className="asset-news-meta">
              <span className="asset-news-source">{article.source?.name}</span>
              <span className="asset-news-time">{timeAgo(article.publishedAt)}</span>
              <span className="asset-news-sent" style={{ color: sent.color }}>{sent.icon}</span>
            </div>
            <div className="asset-news-headline">{article.title}</div>
          </a>
        );
      })}
      <a
        href={`https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/news`}
        target="_blank"
        rel="noopener noreferrer"
        className="asset-news-more"
      >
        Yahoo Finance에서 뉴스 더 보기 →
      </a>
    </div>
  );
}

export default function AssetPanel({ asset, onClose }) {
  const [range, setRange] = useState('1mo');
  const { data: quote, loading: qLoading } = useQuote(asset?.symbol);
  const { data: history, loading: hLoading } = useHistory(asset?.symbol, range);

  if (!asset) return null;

  const up = (quote?.changePct ?? 0) >= 0;
  const chartColor = up ? '#4ade80' : '#f87171';

  // Y축 도메인 — 실제 데이터 범위에 맞게
  const prices = (history ?? []).map(d => d.price).filter(Boolean);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 100;
  const padding  = (maxPrice - minPrice) * 0.05;
  const yDomain  = [parseFloat((minPrice - padding).toFixed(2)), parseFloat((maxPrice + padding).toFixed(2))];

  const institutionalLens = [
    { retail: '가격이 올랐다 / 내렸다', institution: '변동률이 평균 변동성 대비 몇 배인지를 봄' },
    { retail: '뉴스가 좋으면 오른다', institution: '뉴스는 이미 가격에 선반영 됐을 가능성 검토' },
    { retail: '실적이 좋으면 오른다', institution: '가이던스·마진 트렌드·섹터 로테이션 유불리 확인' },
    { retail: '거래량이 많으면 신뢰', institution: '거래량 급증의 방향성(매수 vs 매도 주도) 구분' },
  ];

  return (
    <div className="asset-panel fade-up">
      {/* 헤더 */}
      <div className="panel-header">
        <div className="panel-title-group">
          <h2 className="panel-symbol">{asset.symbol}</h2>
          <span className="panel-name">{asset.name}</span>
        </div>
        <div className="panel-header-actions">
          <a
            href={`https://finance.yahoo.com/quote/${encodeURIComponent(asset.symbol)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="panel-yahoo-link"
          >
            Yahoo Finance ↗
          </a>
          <button className="panel-close" onClick={onClose}>✕</button>
        </div>
      </div>

      <div className="panel-body">
        {/* 왼쪽: 시세 + 차트 + 기관 시선 */}
        <div className="panel-left">

          {/* 시세 */}
          {qLoading ? (
            <div className="skeleton" style={{ height: 90, borderRadius: 8, marginBottom: 16 }} />
          ) : quote && (
            <div className="panel-quote">
              <div className="quote-price">
                {quote.price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className={`quote-change ${up ? 'up' : 'down'}`}>
                {up ? '▲' : '▼'} {Math.abs(quote.change ?? 0).toFixed(2)} ({Math.abs(quote.changePct ?? 0).toFixed(2)}%)
              </div>
              <div className="quote-meta-row">
                <span>고가 <strong>{quote.high?.toFixed(2)}</strong></span>
                <span>저가 <strong>{quote.low?.toFixed(2)}</strong></span>
                <span>전일 <strong>{quote.prevClose?.toFixed(2)}</strong></span>
                <span className="source-badge">{quote.source?.toUpperCase()}</span>
              </div>
            </div>
          )}

          {/* 차트 */}
          <div className="chart-section">
            <div className="range-tabs">
              {RANGES.map(r => (
                <button key={r.key} className={`range-tab ${range === r.key ? 'active' : ''}`} onClick={() => setRange(r.key)}>
                  {r.label}
                </button>
              ))}
            </div>
            {hLoading ? (
              <div className="skeleton" style={{ height: 200, borderRadius: 8 }} />
            ) : (
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={history ?? []} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#4a6070', fontSize: 9, fontFamily: 'DM Mono' }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={yDomain}
                      tick={{ fill: '#4a6070', fontSize: 9, fontFamily: 'DM Mono' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={v => {
                        if (v >= 1000) return `${(v/1000).toFixed(1)}K`;
                        return v.toFixed(v < 10 ? 2 : 0);
                      }}
                      width={52}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    {quote?.prevClose && (
                      <ReferenceLine y={quote.prevClose} stroke="rgba(143,163,184,.2)" strokeDasharray="4 4" />
                    )}
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke={chartColor}
                      strokeWidth={1.8}
                      dot={false}
                      activeDot={{ r: 4, fill: chartColor, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* 기관 시선 필터 */}
          <div className="lens-section">
            <div className="lens-header">
              <span>🔭</span>
              <span className="lens-title">기관 시선 필터</span>
              <span className="lens-sub">같은 시장, 다른 해석</span>
            </div>
            <div className="lens-table">
              <div className="lens-row lens-row--header">
                <span>👤 개인 투자자</span>
                <span>🏦 기관 투자자</span>
              </div>
              {institutionalLens.map((row, i) => (
                <div key={i} className="lens-row">
                  <span className="lens-retail">"{row.retail}"</span>
                  <span className="lens-inst">"{row.institution}"</span>
                </div>
              ))}
            </div>
            <p className="lens-note">⚠️ 교육 목적 — 투자 추천 아님</p>
          </div>
        </div>

        {/* 오른쪽: 뉴스 */}
        <div className="panel-right">
          <AssetNewsFeed symbol={asset.symbol} name={asset.name} />
        </div>
      </div>
    </div>
  );
}
