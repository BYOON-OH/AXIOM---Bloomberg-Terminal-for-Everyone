import React, { useState } from 'react';
import { useNews, useNewsInterpretation } from '../hooks/useData';
import { inferSentiment } from '../services/dataService';
import './NewsTranslator.css';

const SENTIMENT_CONFIG = {
  bullish: { icon: '📈', label: '강세', color: '#4ade80', bg: 'rgba(74,222,128,.08)' },
  bearish: { icon: '📉', label: '약세', color: '#f87171', bg: 'rgba(248,113,113,.08)' },
  neutral: { icon: '➖', label: '중립', color: '#8fa3b8', bg: 'rgba(143,163,184,.08)' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  return `${Math.floor(hrs / 24)}일 전`;
}

function NewsCard({ article, onSelect, selected }) {
  const sent = SENTIMENT_CONFIG[article.sentiment] ?? SENTIMENT_CONFIG.neutral;

  return (
    <article
      className={`news-card ${selected ? 'news-card--selected' : ''}`}
      onClick={() => onSelect(selected ? null : article)}
      style={{ '--sent-color': sent.color, '--sent-bg': sent.bg }}
    >
      <div className="news-meta">
        <span className="news-source">{article.source?.name}</span>
        <span className="news-time">{timeAgo(article.publishedAt)}</span>
        <span className="news-sentiment" style={{ color: sent.color }}>
          {sent.icon} {sent.label}
        </span>
      </div>
      <h3 className="news-title">{article.title}</h3>
      {article.description && !selected && (
        <p className="news-desc">{article.description?.slice(0, 120)}...</p>
      )}
      <div className="news-footer">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="news-original-link"
          onClick={e => e.stopPropagation()}
        >
          원문 보기 →
        </a>
        <span className="news-expand">{selected ? '해석 닫기 ↑' : '해석 보기 ↓'}</span>
      </div>
    </article>
  );
}

function NewsInterpretation({ article }) {
  const interp = useNewsInterpretation(article);
  if (!interp) return <div className="interp-loading">해석 중...</div>;

  return (
    <div className="interpretation fade-up">
      <div className="interp-badge">{interp.label} 해석</div>

      <div className="interp-grid">
        <div className="interp-block">
          <div className="interp-block-title">🏦 기관은 왜 이걸 보는가</div>
          <p>{interp.institution}</p>
        </div>
        <div className="interp-block">
          <div className="interp-block-title">📜 과거 비슷한 상황</div>
          <p>{interp.pastPattern}</p>
        </div>
        <div className="interp-block">
          <div className="interp-block-title">🔍 지금 시장이 더 보는 것</div>
          <p>{interp.watchPoint}</p>
        </div>
        <div className="interp-block">
          <div className="interp-block-title">💬 현재 해석</div>
          <p>{interp.impact}</p>
        </div>
      </div>

      <div className="interp-disclaimer">
        ⚠️ 이 해석은 맥락 이해를 돕기 위한 것이며 투자 추천이 아닙니다.
      </div>
    </div>
  );
}

export default function NewsTranslator() {
  const { data: news, loading } = useNews();
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');

  const FILTERS = [
    { key: 'all', label: '전체' },
    { key: 'fed', label: '🏦 연준' },
    { key: 'inflation', label: '📊 인플레' },
    { key: 'earnings', label: '💼 실적' },
    { key: 'crypto', label: '₿ 코인' },
    { key: 'geo', label: '🌍 지정학' },
    { key: 'labor', label: '👷 고용' },
  ];

  const filtered = (news ?? []).filter(a => filter === 'all' || a.category === filter);

  return (
    <section className="news-section">
      <div className="section-header">
        <div className="section-title-row">
          <span className="section-dot news-dot" />
          <h2 className="section-title">News Translator</h2>
        </div>
        <p className="section-sub">뉴스 원문이 아닌 — 기관의 시선으로 번역</p>
      </div>

      <div className="news-filters no-scrollbar">
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`news-filter-btn ${filter === f.key ? 'active' : ''}`}
            onClick={() => { setFilter(f.key); setSelected(null); }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="news-skeleton">
          {[0,1,2].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 8 }} />)}
        </div>
      ) : (
        <div className="news-list">
          {filtered.map((article, i) => (
            <React.Fragment key={article.title}>
              <NewsCard
                article={article}
                selected={selected?.title === article.title}
                onSelect={setSelected}
              />
              {selected?.title === article.title && (
                <NewsInterpretation article={article} />
              )}
            </React.Fragment>
          ))}
          {filtered.length === 0 && (
            <div className="news-empty">해당 카테고리의 최신 뉴스를 불러오는 중...</div>
          )}
        </div>
      )}
    </section>
  );
}
