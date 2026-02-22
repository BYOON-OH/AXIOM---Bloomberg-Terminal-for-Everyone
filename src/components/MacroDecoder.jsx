import React from 'react';
import { useMacro } from '../hooks/useData';
import './MacroDecoder.css';

const MACRO_CONTEXT = {
  fedfunds: {
    emoji: '🏦',
    hintHigh: '고금리 환경 — 채권 매력 상승, 성장주 밸류에이션 압박',
    hintLow: '저금리 환경 — 유동성 풍부, 위험자산 선호도 상승',
    hintNeutral: '중립 금리 — 경기 사이클의 전환점 모니터링 필요',
    watchFor: '다음 FOMC 회의 점도표 변화',
    marketSignal: (v) => v > 5 ? '❌ 리스크 증가' : v > 3 ? '⚠️ 해석 엇갈림' : '✅ 시장 친화',
  },
  cpi: {
    emoji: '📊',
    hintHigh: '인플레이션 우려 — 금리 인하 기대 약화, 실질 구매력 감소',
    hintLow: '인플레 안정 — 연준 목표 근접, 금리 인하 여건 조성',
    hintNeutral: '인플레 추세 모니터링 중',
    watchFor: '서비스 물가 구성비율과 에너지·식료품 제외 지표(Core CPI)',
    marketSignal: (v) => v > 4 ? '❌ 리스크 증가' : v > 2.5 ? '⚠️ 해석 엇갈림' : '✅ 시장 친화',
  },
  unemployment: {
    emoji: '👷',
    hintHigh: '고용 악화 — 연준 금리 인하 압력, 소비 둔화 우려',
    hintLow: '완전고용 — 임금 상승 → 인플레 지속 가능성',
    hintNeutral: '고용 시장 균형 유지 중',
    watchFor: '임금 상승률(AHE)과 경제활동참가율 변화',
    marketSignal: (v) => v > 5 ? '⚠️ 해석 엇갈림' : v < 3.5 ? '⚠️ 해석 엇갈림' : '✅ 시장 친화',
  },
  gdp: {
    emoji: '📈',
    hintHigh: '강한 성장 — 기업 실적 호조 기대, 연준 금리 유지 여건',
    hintLow: '성장 둔화 — 경기침체 우려, 방어주·채권 선호',
    hintNeutral: '적정 성장 유지 중',
    watchFor: '개인소비 기여도와 기업 투자 항목',
    marketSignal: (v) => v > 3 ? '✅ 시장 친화' : v > 0 ? '⚠️ 해석 엇갈림' : '❌ 리스크 증가',
  },
};

function MacroCard({ indicator, delay = 0 }) {
  const ctx = MACRO_CONTEXT[indicator.key];
  if (!ctx) return null;

  const { value, change, label, unit, description } = indicator;
  const up = change >= 0;
  const signal = ctx.marketSignal?.(value) ?? '⚠️ 해석 엇갈림';
  const signalClass = signal.startsWith('✅') ? 'good' : signal.startsWith('❌') ? 'bad' : 'warn';

  const hint = value > 4 ? ctx.hintHigh : value < 2 ? ctx.hintLow : ctx.hintNeutral;

  return (
    <div className={`macro-card fade-up macro-card--${signalClass}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="macro-top">
        <span className="macro-emoji">{ctx.emoji}</span>
        <div className="macro-title-group">
          <div className="macro-label">{label}</div>
          <div className="macro-desc">{description}</div>
        </div>
        <div className={`macro-signal macro-signal--${signalClass}`}>{signal}</div>
      </div>

      <div className="macro-value-row">
        <span className="macro-value">{value != null ? `${value.toFixed(2)}${unit}` : 'N/A'}</span>
        {change != null && (
          <span className={`macro-change ${up ? 'up' : 'down'}`}>
            {up ? '▲' : '▼'} {Math.abs(change).toFixed(2)}{unit} 전월比
          </span>
        )}
      </div>

      <div className="macro-hint">
        <div className="macro-hint-text">{hint}</div>
      </div>

      <div className="macro-watch">
        <span className="macro-watch-label">📌 주목 포인트</span>
        <span className="macro-watch-text">{ctx.watchFor}</span>
      </div>
    </div>
  );
}

export default function MacroDecoder() {
  const { data: macro, loading } = useMacro();

  return (
    <section className="macro-section">
      <div className="section-header">
        <div className="section-title-row">
          <span className="section-dot macro-dot" />
          <h2 className="section-title">Macro Decoder</h2>
        </div>
        <p className="section-sub">경제지표를 시험 문제 해설지처럼 — 숫자보다 맥락</p>
      </div>

      {loading ? (
        <div className="macro-skeleton">
          {[0,1,2,3].map(i => (
            <div key={i} className="skeleton" style={{ height: 140, borderRadius: 8, animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      ) : (
        <div className="macro-grid">
          {(macro ?? []).map((indicator, i) => (
            <MacroCard key={indicator.key} indicator={indicator} delay={i * 80} />
          ))}
        </div>
      )}

      <div className="macro-legend">
        <span className="legend-item good">✅ 시장 친화</span>
        <span className="legend-item warn">⚠️ 해석 엇갈림</span>
        <span className="legend-item bad">❌ 리스크 증가</span>
        <span className="legend-caption">— 수치 자체보다 추세 방향과 예상치 대비가 더 중요합니다</span>
      </div>
    </section>
  );
}
