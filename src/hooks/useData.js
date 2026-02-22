import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchIndices, fetchForex, fetchCrypto,
  fetchFinanceNews, fetchMacroIndicators,
  fetchQuote, fetchHistory, searchAsset,
  fetchAssetNews, interpretNews, detectAnomalies,
} from '../services/dataService';

// ─── 범용 폴링 훅 ───────────────────────────────────────────────────
export function usePolling(fetcher, interval = 60000, deps = []) {
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const result = await fetcher();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, deps); // eslint-disable-line

  useEffect(() => {
    setLoading(true);
    load();
    timerRef.current = setInterval(load, interval);
    return () => clearInterval(timerRef.current);
  }, [load, interval]);

  return { data, loading, error, refresh: load };
}

// ─── 지수 훅 ───────────────────────────────────────────────────────
export function useIndices() {
  return usePolling(fetchIndices, 60_000);
}

// ─── 환율 훅 ───────────────────────────────────────────────────────
export function useForex() {
  return usePolling(fetchForex, 120_000);
}

// ─── 암호화폐 훅 ──────────────────────────────────────────────────
export function useCrypto() {
  return usePolling(fetchCrypto, 60_000);
}

// ─── 뉴스 훅 ──────────────────────────────────────────────────────
export function useNews(query = 'finance market economy') {
  return usePolling(() => fetchFinanceNews(query), 300_000, [query]);
}

// ─── 거시 훅 ──────────────────────────────────────────────────────
export function useMacro() {
  return usePolling(fetchMacroIndicators, 3_600_000);
}

// ─── 단일 종목 훅 ─────────────────────────────────────────────────
export function useQuote(symbol) {
  return usePolling(() => symbol ? fetchQuote(symbol) : Promise.resolve(null), 60_000, [symbol]);
}

// ─── 차트 히스토리 훅 ─────────────────────────────────────────────
export function useHistory(symbol, range = '1mo') {
  return usePolling(
    () => symbol ? fetchHistory(symbol, range) : Promise.resolve([]),
    300_000,
    [symbol, range]
  );
}

// ─── 검색 훅 ──────────────────────────────────────────────────────
export function useSearch() {
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const timerRef = useRef(null);

  const search = useCallback((query) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query?.trim()) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      const res = await searchAsset(query);
      setResults(res);
      setLoading(false);
    }, 300);
  }, []);

  return { results, loading, search };
}

// ─── Market Pulse (이상 감지) 훅 ─────────────────────────────────
export function useMarketPulse() {
  const { data: indices } = useIndices();
  const [signals, setSignals] = useState([]);

  useEffect(() => {
    if (!indices?.length) return;

    const newSignals = [];

    // VIX 경고
    const vix = indices.find(i => i.label === 'VIX');
    if (vix?.price) {
      if (vix.price > 25) newSignals.push({ level: 'danger', icon: '🚨', label: 'VIX 급등', message: `변동성 지수(VIX)가 ${vix.price.toFixed(1)}로 상승 — 공포 구간 진입. 기관은 헤지를 늘리는 시기.` });
      else if (vix.price > 20) newSignals.push({ level: 'warning', icon: '⚠️', label: 'VIX 주의', message: `변동성 지수(VIX) ${vix.price.toFixed(1)} — 평온 구간을 벗어나는 중. 방향성 베팅 리스크 증가.` });
      else newSignals.push({ level: 'safe', icon: '✅', label: 'VIX 안정', message: `변동성 지수(VIX) ${vix.price.toFixed(1)} — 시장이 상대적으로 안정된 환경.` });
    }

    // 나스닥 급락
    const nasdaq = indices.find(i => i.label === 'NASDAQ');
    if (nasdaq?.changePct) {
      if (nasdaq.changePct < -2) newSignals.push({ level: 'danger', icon: '📉', label: 'NASDAQ 급락', message: `나스닥이 하루 ${nasdaq.changePct.toFixed(2)}% 하락 — 성장주 포지션 청산이 동반되는 패턴.` });
      else if (nasdaq.changePct > 2) newSignals.push({ level: 'positive', icon: '📈', label: 'NASDAQ 강세', message: `나스닥 +${nasdaq.changePct.toFixed(2)}% — 리스크 온 환경. 기술주·성장주 선호도 상승.` });
    }

    // 금 vs 달러 괴리
    const gold = indices.find(i => i.label === 'GOLD');
    if (gold?.changePct && gold.changePct > 1.5) {
      newSignals.push({ level: 'warning', icon: '🥇', label: '안전자산 수요', message: `금이 ${gold.changePct.toFixed(2)}% 상승 — 불확실성 확대 시 나타나는 안전자산 선호 패턴.` });
    }

    // 코스피 신호
    const kospi = indices.find(i => i.label === 'KOSPI');
    if (kospi?.changePct && Math.abs(kospi.changePct) > 1.5) {
      const dir = kospi.changePct > 0 ? '상승' : '하락';
      newSignals.push({ level: kospi.changePct > 0 ? 'positive' : 'warning', icon: '🇰🇷', label: `KOSPI ${dir}`, message: `코스피 ${kospi.changePct > 0 ? '+' : ''}${kospi.changePct.toFixed(2)}% — 외국인 수급 동향과 원/달러 환율 연동 여부 확인 필요.` });
    }

    setSignals(newSignals.length ? newSignals : [{ level: 'safe', icon: '🟢', label: '시장 평온', message: '현재 주요 이상 신호 없음. 뉴스·발언 모니터링 지속 중.' }]);
  }, [indices]);

  return signals;
}

// ─── 뉴스 해석 훅 ────────────────────────────────────────────────
export function useNewsInterpretation(article) {
  const [interpretation, setInterpretation] = useState(null);

  useEffect(() => {
    if (!article) return;
    const result = interpretNews(article);
    setInterpretation(result);
  }, [article?.title]);

  return interpretation;
}

// ─── 종목별 뉴스 훅 ───────────────────────────────────────────────
export function useAssetNews(symbol, name) {
  return usePolling(
    () => (symbol ? fetchAssetNews(symbol, name) : Promise.resolve([])),
    300_000,
    [symbol, name]
  );
}
