# ⬡ AXIOM — Bloomberg Terminal for Everyone

> ❝ 정보를 더 주지 않는다. 이해 가능한 문장으로 번역한다. ❞

블룸버그 터미널은 월 수천 달러짜리 기관용 플랫폼입니다.  
AXIOM은 그 핵심 신호만 뽑아서, 누구나 읽을 수 있는 언어로 번역합니다.

매수·매도 추천 없음 — 맥락과 해석만 제공합니다.

---

## ✨ 주요 기능

### 📡 Market Pulse
가격이 아닌 **"이상 움직임"** 만 감지합니다.
- Z-score 기반 변동성 이상 감지
- VIX 급등, 지수 급락, 안전자산 수요 자동 알림
- 노이즈 제거 후 임계값 초과 시에만 표시

### 📰 News Translator
뉴스 원문이 아닌 **기관의 시선으로 번역**합니다.
- 뉴스가 시장에서 어떤 의미인지 해석
- 기관은 왜 이 뉴스를 보는가
- 과거 비슷한 상황에서의 시장 반응 패턴
- 카테고리별 필터 (연준 / 인플레 / 실적 / 코인 / 지정학 / 고용)

### 📊 Macro Decoder
경제지표를 **시험 문제 해설지처럼** 설명합니다.
- CPI, 금리, 실업률, GDP 실시간 추적
- 숫자보다 구성과 맥락 중심 서술
- ✅ 시장 친화 / ⚠️ 해석 엇갈림 / ❌ 리스크 증가 신호

### 🔭 Institutional Lens
**개인 vs 기관이 다르게 보는 포인트**를 나란히 보여줍니다.

### 📈 종목 검색 + 차트
- 주요 종목 즉시 검색 (미국주식, 한국주식, ETF, 코인 포함)
- 실시간 시세 + 기간별 차트 (5일 ~ 1년)
- 종목 관련 최신 뉴스 피드

### 💱 실시간 위젯
- 환율 (USD/KRW, JPY, EUR, CNY)
- 암호화폐 (BTC, ETH, SOL)
- 실시간 Ticker 스크롤

---

## 🚀 빠른 시작

```bash
git clone https://github.com/[your-username]/axiom.git
cd axiom
npm install
cp .env.example .env
# .env 파일에 API 키 입력
npm run dev
```

브라우저에서 http://localhost:5173 접속

> API 키 없이도 Mock 데이터로 전체 UI 확인 가능합니다.

---

## 🔑 API 키 설정

`.env.example`을 `.env`로 복사 후 아래 키들을 입력하세요.

| API | 용도 | 무료 여부 | 발급 링크 |
|-----|------|-----------|-----------|
| Alpha Vantage | 주식 실시간 시세 | ✅ 무료 (25 req/일) | [발급](https://www.alphavantage.co/support/#api-key) |
| NewsAPI | 금융 뉴스 | ✅ 무료 (localhost 한정) | [발급](https://newsapi.org/register) |
| FRED API | 거시경제 지표 | ✅ 완전 무료 | [발급](https://fred.stlouisfed.org/docs/api/api_key.html) |
| CoinGecko | 암호화폐 | ✅ 키 없이 가능 | [발급](https://www.coingecko.com/en/api) |

환율(ExchangeRate-API)과 CoinGecko는 **키 없이도 작동**합니다.

---

## 🏗 아키텍처

```
src/
├── services/
│   └── dataService.js     # API 통신 + 캐싱 + Fallback 체인
├── hooks/
│   └── useData.js         # React 폴링 훅 (자동 갱신)
├── components/
│   ├── Header.jsx         # 헤더 + 실시간 시계
│   ├── Ticker.jsx         # 실시간 시세 스크롤 바
│   ├── SearchBar.jsx      # 종목 검색
│   ├── AssetPanel.jsx     # 종목 상세 + 차트 + 뉴스
│   ├── MarketPulse.jsx    # 이상 신호 감지
│   ├── NewsTranslator.jsx # 뉴스 해석 엔진
│   ├── MacroDecoder.jsx   # 거시지표 디코더
│   └── QuickWidgets.jsx   # 환율·코인·Risk Radar
└── styles/
    ├── globals.css        # 디자인 토큰
    └── App.css            # 레이아웃
```

### 데이터 Fallback 체인

| 기능 | 1순위 | 2순위 | 3순위 |
|------|-------|-------|-------|
| 주식 시세 | Alpha Vantage | Yahoo Finance (프록시) | Mock |
| 차트 | Yahoo Finance (프록시) | — | Mock |
| 환율 | ExchangeRate-API | — | Mock |
| 뉴스 | NewsAPI | Yahoo Finance RSS | Mock |
| 거시지표 | FRED API (프록시) | — | Mock |
| 암호화폐 | CoinGecko | — | Mock |

---

## 🛠 기술 스택

- **Frontend**: React 18 + Vite
- **차트**: Recharts
- **스타일**: CSS Variables (디자인 토큰 기반)
- **폰트**: Space Mono + DM Sans + DM Mono
- **데이터**: Alpha Vantage · Yahoo Finance · FRED · NewsAPI · CoinGecko · ExchangeRate-API

---

## 📋 기능 현황 (MVP)

| 기능 | 상태 |
|------|------|
| Market Pulse (이상 신호 감지) | ✅ 완료 |
| News Translator (뉴스 해석) | ✅ 완료 |
| Macro Decoder (거시 지표) | ✅ 완료 |
| 종목 검색 + 차트 | ✅ 완료 |
| 환율 / 암호화폐 위젯 | ✅ 완료 |
| 기관 시선 필터 | ✅ 완료 |
| 실시간 Ticker | ✅ 완료 |
| 자동매매 | ❌ 제공 안 함 (철학적 이유) |

---

## 💡 프로젝트 철학

- **매수·매도 직접 추천 금지** — "기관 관점의 해석"만 제공
- **한 화면 = 한 메시지** — 정보 과부하 방지
- **숫자보다 맥락** — 수치 나열 대신 의미 중심 서술
- **확신형 문장 없음** — 가능성과 패턴으로 표현

---

## ⚠️ 면책 조항

이 프로젝트는 **교육 및 정보 제공 목적**으로만 제작되었습니다.  
투자 판단의 책임은 전적으로 사용자 본인에게 있습니다.

---

## 📄 License

MIT License
