/**
 * AXIOM — Data Service Layer v2
 * Yahoo Finance CORS 차단 → corsproxy.io / allorigins.win 경유
 */

const AV_KEY  = import.meta.env.VITE_ALPHA_VANTAGE_KEY || '';
const NEWS_KEY = import.meta.env.VITE_NEWS_API_KEY      || '';
const FRED_KEY = import.meta.env.VITE_FRED_API_KEY      || '';
const CG_KEY   = import.meta.env.VITE_COINGECKO_KEY     || '';

const proxy  = url => `https://corsproxy.io/?${encodeURIComponent(url)}`;
const proxy2 = url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;

// Cache
const cache = new Map();
const TTL = { quote:60_000, chart:300_000, news:300_000, macro:3_600_000, forex:120_000, crypto:60_000 };
function cacheGet(k) { const e=cache.get(k); if(!e) return null; if(Date.now()-e.ts>e.ttl){cache.delete(k);return null;} return e.data; }
function cacheSet(k,data,ttl) { cache.set(k,{data,ts:Date.now(),ttl}); return data; }

async function fetchJSON(url, opts={}) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000), ...opts });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch(e) {
    console.warn('[AXIOM] fetch failed:', url.slice(0,80), e.message);
    return null;
  }
}

async function fetchWithProxy(url) {
  let data = await fetchJSON(proxy(url));
  if(data) return data;
  return await fetchJSON(proxy2(url));
}

// 1. 시세
export async function fetchQuote(symbol) {
  const cKey = `quote:${symbol}`;
  const hit = cacheGet(cKey);
  if(hit) return hit;

  if(AV_KEY) {
    const data = await fetchJSON(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${AV_KEY}`);
    const q = data?.['Global Quote'];
    if(q?.['05. price']) return cacheSet(cKey, {
      symbol, price:parseFloat(q['05. price']), change:parseFloat(q['09. change']),
      changePct:parseFloat(q['10. change percent']), volume:parseInt(q['06. volume']),
      high:parseFloat(q['03. high']), low:parseFloat(q['04. low']),
      prevClose:parseFloat(q['08. previous close']), source:'alphavantage'
    }, TTL.quote);
  }

  const yData = await fetchWithProxy(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`);
  const meta = yData?.chart?.result?.[0]?.meta;
  if(meta) {
    const price = meta.regularMarketPrice ?? meta.previousClose;
    const prev  = meta.chartPreviousClose ?? meta.previousClose ?? price;
    return cacheSet(cKey, {
      symbol, price, change:parseFloat((price-prev).toFixed(2)),
      changePct:parseFloat(((price-prev)/prev*100).toFixed(2)),
      volume:meta.regularMarketVolume??0, high:meta.regularMarketDayHigh??price,
      low:meta.regularMarketDayLow??price, prevClose:prev, source:'yahoo'
    }, TTL.quote);
  }

  return cacheSet(cKey, getMockQuote(symbol), TTL.quote);
}

// 2. 차트
export async function fetchHistory(symbol, range='1mo') {
  const cKey = `history:${symbol}:${range}`;
  const hit = cacheGet(cKey);
  if(hit) return hit;

  const ivMap = {'5d':'1h','1mo':'1d','3mo':'1d','6mo':'1wk','1y':'1wk'}; const iv = ivMap[range] ?? '1d';
  const data = await fetchWithProxy(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${iv}&range=${range}`);
  const result = data?.chart?.result?.[0];

  if(result) {
    const ts = result.timestamp??[];
    const closes = result.indicators?.quote?.[0]?.close??[];
    const volumes = result.indicators?.quote?.[0]?.volume??[];
    const mapped = ts.map((t,i)=>({
      date: new Date(t*1000).toLocaleDateString('ko-KR',{month:'short',day:'numeric'}),
      price: closes[i]!=null ? parseFloat(closes[i].toFixed(2)) : null,
      volume: volumes[i]??0
    })).filter(d=>d.price!==null&&!isNaN(d.price));
    if(mapped.length>0) return cacheSet(cKey, mapped, TTL.chart);
  }

  return cacheSet(cKey, getMockHistory(symbol), TTL.chart);
}

// 3. 지수
const INDEX_SYMBOLS = [
  {symbol:'^GSPC',label:'S&P 500'},{symbol:'^IXIC',label:'NASDAQ'},
  {symbol:'^DJI',label:'DOW'},{symbol:'^KS11',label:'KOSPI'},
  {symbol:'^N225',label:'NIKKEI'},{symbol:'GC=F',label:'GOLD'},
  {symbol:'CL=F',label:'CRUDE OIL'},{symbol:'^VIX',label:'VIX'},
];

export async function fetchIndices() {
  const cKey='indices:all'; const hit=cacheGet(cKey); if(hit) return hit;
  const results = await Promise.all(INDEX_SYMBOLS.map(async({symbol,label})=>({...await fetchQuote(symbol),label,symbol})));
  return cacheSet(cKey, results, TTL.quote);
}

// 4. 환율
export async function fetchForex() {
  const cKey='forex:all'; const hit=cacheGet(cKey); if(hit) return hit;
  const data = await fetchJSON('https://api.exchangerate-api.com/v4/latest/USD');
  if(data?.rates) {
    const pairs=[{label:'USD/KRW',from:'USD',to:'KRW'},{label:'USD/JPY',from:'USD',to:'JPY'},{label:'EUR/USD',from:'EUR',to:'USD'},{label:'USD/CNY',from:'USD',to:'CNY'}];
    return cacheSet(cKey, pairs.map(({from,to,label})=>{
      let rate=data.rates[to]??null;
      if(from!=='USD'&&data.rates[from]) rate=(1/data.rates[from])*(data.rates[to]??1);
      return {label,rate:rate?parseFloat(rate.toFixed(4)):null,from,to};
    }), TTL.forex);
  }
  return cacheSet(cKey, getMockForex(), TTL.forex);
}

// 5. 암호화폐
export async function fetchCrypto() {
  const cKey='crypto:top'; const hit=cacheGet(cKey); if(hit) return hit;
  const headers = CG_KEY?{'x-cg-demo-api-key':CG_KEY}:{};
  const data = await fetchJSON('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana&order=market_cap_desc&sparkline=false',{headers});
  if(data?.length) return cacheSet(cKey, data.map(c=>({
    symbol:c.symbol.toUpperCase(), label:c.name, price:c.current_price,
    change:c.price_change_24h, changePct:c.price_change_percentage_24h,
    volume:c.total_volume, marketCap:c.market_cap, source:'coingecko'
  })), TTL.crypto);
  return cacheSet(cKey, getMockCrypto(), TTL.crypto);
}

// 6. 뉴스
export async function fetchFinanceNews(query='finance market economy') {
  const cKey=`news:${query}`; const hit=cacheGet(cKey); if(hit) return hit;
  if(NEWS_KEY) {
    const data = await fetchJSON(`https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=20&apiKey=${NEWS_KEY}`);
    if(data?.articles?.length) return cacheSet(cKey, data.articles.map(normalizeArticle), TTL.news);
  }
  const rss = await fetchRSSFallback();
  if(rss?.length) return cacheSet(cKey, rss, TTL.news);
  return cacheSet(cKey, getMockNews(), TTL.news);
}

// 종목별 뉴스 (AssetPanel용)
export async function fetchAssetNews(symbol, name) {
  const cKey=`news:asset:${symbol}`; const hit=cacheGet(cKey); if(hit) return hit;
  const q = name ?? symbol;

  if(NEWS_KEY) {
    const data = await fetchJSON(`https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&language=en&sortBy=publishedAt&pageSize=8&apiKey=${NEWS_KEY}`);
    if(data?.articles?.length) return cacheSet(cKey, data.articles.map(normalizeArticle), TTL.news);
  }

  // Yahoo Finance RSS (프록시 경유)
  const yahooRss = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`;
  const rssData = await fetchJSON(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(yahooRss)}`);
  if(rssData?.items?.length) return cacheSet(cKey, rssData.items.slice(0,8).map(item=>({
    title:item.title,
    description:item.description?.replace(/<[^>]*>/g,'').slice(0,200),
    url:item.link,
    publishedAt:item.pubDate,
    source:{name:'Yahoo Finance'},
    sentiment:inferSentiment(item.title),
    category:inferCategory(item.title),
  })), TTL.news);

  return cacheSet(cKey, getMockAssetNews(symbol), TTL.news);
}

async function fetchRSSFallback() {
  const feeds=['https://feeds.bbci.co.uk/news/business/rss.xml'];
  for(const feed of feeds) {
    const data = await fetchJSON(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed)}`);
    if(data?.items?.length) return data.items.slice(0,15).map(item=>({
      title:item.title,
      description:item.description?.replace(/<[^>]*>/g,'').slice(0,200),
      url:item.link, publishedAt:item.pubDate,
      source:{name:new URL(item.link).hostname.replace('www.','')},
      sentiment:inferSentiment(item.title), category:inferCategory(item.title),
    }));
  }
  return null;
}

function normalizeArticle(a) {
  return {
    title:a.title, description:a.description, url:a.url,
    publishedAt:a.publishedAt, source:a.source,
    sentiment:inferSentiment(a.title+' '+(a.description??'')),
    category:inferCategory(a.title),
  };
}

// 7. FRED 거시지표
const FRED_SERIES = {
  fedfunds:    {id:'FEDFUNDS',          label:'Fed Funds Rate', unit:'%',  description:'기준금리'},
  cpi:         {id:'CPIAUCSL',          label:'CPI',            unit:'%',  description:'소비자물가지수'},
  unemployment:{id:'UNRATE',            label:'실업률',          unit:'%',  description:'미국 실업률'},
  gdp:         {id:'A191RL1Q225SBEA',   label:'GDP 성장률',      unit:'%',  description:'실질 GDP 성장률(QoQ)'},
};

export async function fetchMacroIndicators() {
  const cKey='macro:all'; const hit=cacheGet(cKey); if(hit) return hit;
  if(!FRED_KEY) return cacheSet(cKey, getMockMacro(), TTL.macro);

  const results = await Promise.all(Object.entries(FRED_SERIES).map(async([key,meta])=>{
    const fredUrl=`https://api.stlouisfed.org/fred/series/observations?series_id=${meta.id}&api_key=${FRED_KEY}&file_type=json&sort_order=desc&limit=3`;
    const data = await fetchWithProxy(fredUrl);
    const obs = data?.observations??[];
    const valid = obs.filter(o=>o.value!=='.'&&!isNaN(parseFloat(o.value)));
    const latest=valid[0], prev=valid[1];
    if(!latest) return {...getMockMacro().find(m=>m.key===key)??{key,...meta,value:null,change:null}};
    const value=parseFloat(latest.value), prevV=prev?parseFloat(prev.value):null;
    return {key,...meta, value, prev:prevV,
      change:prevV!=null?parseFloat((value-prevV).toFixed(3)):null,
      changePct:prevV!=null?parseFloat(((value-prevV)/Math.abs(prevV)*100).toFixed(2)):null,
      date:latest.date};
  }));

  if(results.every(r=>r.value==null)) return cacheSet(cKey, getMockMacro(), TTL.macro);
  return cacheSet(cKey, results, TTL.macro);
}

// 8. 검색
const ASSET_DB = [
  {symbol:'AAPL',name:'Apple Inc.',type:'EQUITY',exchange:'NASDAQ'},
  {symbol:'MSFT',name:'Microsoft Corporation',type:'EQUITY',exchange:'NASDAQ'},
  {symbol:'NVDA',name:'NVIDIA Corporation',type:'EQUITY',exchange:'NASDAQ'},
  {symbol:'GOOGL',name:'Alphabet Inc.',type:'EQUITY',exchange:'NASDAQ'},
  {symbol:'AMZN',name:'Amazon.com Inc.',type:'EQUITY',exchange:'NASDAQ'},
  {symbol:'META',name:'Meta Platforms Inc.',type:'EQUITY',exchange:'NASDAQ'},
  {symbol:'TSLA',name:'Tesla Inc.',type:'EQUITY',exchange:'NASDAQ'},
  {symbol:'NFLX',name:'Netflix Inc.',type:'EQUITY',exchange:'NASDAQ'},
  {symbol:'AMD',name:'Advanced Micro Devices',type:'EQUITY',exchange:'NASDAQ'},
  {symbol:'INTC',name:'Intel Corporation',type:'EQUITY',exchange:'NASDAQ'},
  {symbol:'ORCL',name:'Oracle Corporation',type:'EQUITY',exchange:'NYSE'},
  {symbol:'PLTR',name:'Palantir Technologies',type:'EQUITY',exchange:'NYSE'},
  {symbol:'JPM',name:'JPMorgan Chase & Co.',type:'EQUITY',exchange:'NYSE'},
  {symbol:'BAC',name:'Bank of America Corp.',type:'EQUITY',exchange:'NYSE'},
  {symbol:'GS',name:'Goldman Sachs Group',type:'EQUITY',exchange:'NYSE'},
  {symbol:'V',name:'Visa Inc.',type:'EQUITY',exchange:'NYSE'},
  {symbol:'XOM',name:'Exxon Mobil Corporation',type:'EQUITY',exchange:'NYSE'},
  {symbol:'BRK-B',name:'Berkshire Hathaway B',type:'EQUITY',exchange:'NYSE'},
  {symbol:'SPY',name:'SPDR S&P 500 ETF',type:'ETF',exchange:'NYSE'},
  {symbol:'QQQ',name:'Invesco QQQ ETF',type:'ETF',exchange:'NASDAQ'},
  {symbol:'GLD',name:'SPDR Gold Shares ETF',type:'ETF',exchange:'NYSE'},
  {symbol:'TLT',name:'iShares 20+ Year Treasury Bond ETF',type:'ETF',exchange:'NASDAQ'},
  {symbol:'ARKK',name:'ARK Innovation ETF',type:'ETF',exchange:'NYSE'},
  {symbol:'BTC-USD',name:'Bitcoin USD',type:'CRYPTO',exchange:'CCC'},
  {symbol:'ETH-USD',name:'Ethereum USD',type:'CRYPTO',exchange:'CCC'},
  {symbol:'SOL-USD',name:'Solana USD',type:'CRYPTO',exchange:'CCC'},
  {symbol:'BNB-USD',name:'BNB USD',type:'CRYPTO',exchange:'CCC'},
  {symbol:'XRP-USD',name:'XRP USD',type:'CRYPTO',exchange:'CCC'},
  {symbol:'^GSPC',name:'S&P 500 Index',type:'INDEX',exchange:'SNP'},
  {symbol:'^IXIC',name:'NASDAQ Composite',type:'INDEX',exchange:'NMS'},
  {symbol:'^DJI',name:'Dow Jones Industrial Average',type:'INDEX',exchange:'DJI'},
  {symbol:'^KS11',name:'KOSPI Index',type:'INDEX',exchange:'KSC'},
  {symbol:'^N225',name:'Nikkei 225',type:'INDEX',exchange:'OSA'},
  {symbol:'^VIX',name:'CBOE Volatility Index',type:'INDEX',exchange:'CBT'},
  {symbol:'GC=F',name:'Gold Futures',type:'FUTURE',exchange:'CMX'},
  {symbol:'CL=F',name:'Crude Oil Futures (WTI)',type:'FUTURE',exchange:'NYM'},
  {symbol:'005930.KS',name:'삼성전자',type:'EQUITY',exchange:'KSC'},
  {symbol:'000660.KS',name:'SK하이닉스',type:'EQUITY',exchange:'KSC'},
  {symbol:'035420.KS',name:'NAVER',type:'EQUITY',exchange:'KSC'},
  {symbol:'035720.KS',name:'카카오',type:'EQUITY',exchange:'KSC'},
  {symbol:'051910.KS',name:'LG화학',type:'EQUITY',exchange:'KSC'},
  {symbol:'006400.KS',name:'삼성SDI',type:'EQUITY',exchange:'KSC'},
  {symbol:'207940.KS',name:'삼성바이오로직스',type:'EQUITY',exchange:'KSC'},
  {symbol:'000270.KS',name:'기아',type:'EQUITY',exchange:'KSC'},
  {symbol:'005380.KS',name:'현대차',type:'EQUITY',exchange:'KSC'},
];

export async function searchAsset(query) {
  if(!query?.trim()) return [];
  const q=query.toLowerCase().trim();
  const local=ASSET_DB.filter(a=>a.symbol.toLowerCase().includes(q)||a.name.toLowerCase().includes(q)).slice(0,8);
  if(local.length>0) return local;
  const data=await fetchWithProxy(`https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0`);
  if(data?.quotes?.length) return data.quotes.slice(0,8).map(r=>({symbol:r.symbol,name:r.longname??r.shortname??r.symbol,type:r.quoteType,exchange:r.exchange}));
  return [];
}

// 9. Z-Score
export function computeZScore(series) {
  if(!series?.length) return [];
  const values=series.map(d=>d.price??d.value).filter(v=>v!=null);
  const mean=values.reduce((a,b)=>a+b,0)/values.length;
  const std=Math.sqrt(values.map(v=>(v-mean)**2).reduce((a,b)=>a+b,0)/values.length);
  return series.map((d,i)=>({...d,zScore:std>0?((values[i]-mean)/std):0}));
}
export function detectAnomalies(series,threshold=2.0) {
  return computeZScore(series).filter(d=>Math.abs(d.zScore)>=threshold);
}

// 10. 감정/카테고리
const BULL_KW=['surge','rally','soar','gain','rise','beat','record','high','positive','growth','profit','boom','jump'];
const BEAR_KW=['plunge','crash','fall','drop','decline','miss','loss','risk','crisis','cut','fears','warning','slump','recession','tumble'];
export function inferSentiment(text='') {
  const lower=text.toLowerCase();
  const bull=BULL_KW.filter(k=>lower.includes(k)).length;
  const bear=BEAR_KW.filter(k=>lower.includes(k)).length;
  return bull>bear?'bullish':bear>bull?'bearish':'neutral';
}
const CATEGORY_MAP={
  fed:['fed','fomc','powell','rate hike','rate cut','interest rate','monetary'],
  inflation:['cpi','inflation','pce','consumer price'],
  earnings:['earnings','revenue','profit','eps','guidance','quarterly'],
  crypto:['bitcoin','btc','ethereum','crypto','blockchain'],
  geo:['war','sanction','geopolit','china','taiwan','russia','middle east'],
  labor:['jobs','unemployment','payroll','nonfarm','labor','hiring','layoff'],
};
export function inferCategory(text='') {
  const lower=text.toLowerCase();
  for(const[cat,keys] of Object.entries(CATEGORY_MAP)) if(keys.some(k=>lower.includes(k))) return cat;
  return 'general';
}

// 11. 뉴스 해석
const RULES = {
  fed:{label:'🏦 연준 관련',institution:'연준 스탠스 변화는 전 자산군 리프라이싱을 유발합니다',pastPattern:'금리 인상 서프라이즈 → 주식 -2~5%, 달러 +1~2% 패턴',watchPoint:'점도표(Dot Plot) 변화, 발언 톤(hawkish↔dovish)'},
  inflation:{label:'📊 인플레이션',institution:'인플레 지속은 금리 인하 기대를 약화시켜 성장주에 직격합니다',pastPattern:'CPI 예상치 상회 → 국채금리 급등, 나스닥 하락',watchPoint:'서비스 물가 vs 에너지 물가 구성비율'},
  earnings:{label:'💼 실적',institution:'숫자보다 가이던스와 마진 트렌드를 봅니다',pastPattern:'실적 서프라이즈 후에도 가이던스 하향 시 주가 하락 多',watchPoint:'마진율 변화, 다음 분기 가이던스, 재고 수준'},
  crypto:{label:'₿ 암호화폐',institution:'리스크 온/오프 지표로 활용되며 유동성과 동행합니다',pastPattern:'달러 강세 시 코인 약세, 위험선호 시 알트코인 강세',watchPoint:'BTC 도미넌스, 거래소 유입량'},
  geo:{label:'🌍 지정학',institution:'안전자산 수요(금·달러·국채) 증가를 유발합니다',pastPattern:'분쟁 초기 변동성 급등, 이후 에너지 가격 주목',watchPoint:'에너지/식량 공급망 영향, 제재 범위'},
  labor:{label:'👷 고용',institution:'연준 이중 목표 중 하나로 금리 경로에 영향을 줍니다',pastPattern:'고용 서프라이즈 → 금리 인하 기대 후퇴 → 채권 하락',watchPoint:'임금 상승률(AHE), 참여율 변화'},
  general:{label:'📰 시장 동향',institution:'매크로 맥락과 결합해 해석이 필요합니다',pastPattern:'비슷한 뉴스의 과거 반응은 맥락에 따라 상이합니다',watchPoint:'발생 타이밍(지표 전후), 시장 심리 상태'},
};
export function interpretNews(article) {
  const cat=article.category??inferCategory(article.title);
  const rule=RULES[cat]??RULES.general;
  const sentiment=article.sentiment??inferSentiment(article.title);
  return {...rule,sentiment,impact:sentiment==='bullish'?'단기적으로 위험자산에 우호적인 환경으로 읽힐 수 있습니다.':sentiment==='bearish'?'리스크 관리를 강조하는 시장 환경 신호일 수 있습니다.':'방향성은 추가 데이터 확인이 필요합니다.'};
}

// Mock Data
const MOCK_BASE={'^GSPC':5280,'^IXIC':16500,'^DJI':39200,'GC=F':2350,'CL=F':78,'^VIX':16.5,'^KS11':2680,'^N225':38900,'AAPL':182,'TSLA':175,'NVDA':820,'MSFT':415,'BTC-USD':67000,'ETH-USD':3200,'SOL-USD':145};
function getMockQuote(symbol) {
  const base=MOCK_BASE[symbol]??100, price=base*(1+(Math.random()-0.5)*0.02), prev=price/(1+(Math.random()-0.5)*0.015);
  return {symbol,price:parseFloat(price.toFixed(2)),change:parseFloat((price-prev).toFixed(2)),changePct:parseFloat(((price-prev)/prev*100).toFixed(2)),volume:Math.floor(Math.random()*50_000_000),high:parseFloat((price*1.01).toFixed(2)),low:parseFloat((price*0.99).toFixed(2)),prevClose:parseFloat(prev.toFixed(2)),source:'mock'};
}
function getMockHistory(symbol) {
  const base=MOCK_BASE[symbol]??100; let price=base*0.92; const data=[];
  for(let i=30;i>=0;i--) {
    price=price*(1+(Math.random()-0.47)*0.022);
    const d=new Date(); d.setDate(d.getDate()-i);
    data.push({date:d.toLocaleDateString('ko-KR',{month:'short',day:'numeric'}),price:parseFloat(price.toFixed(2)),volume:Math.floor(Math.random()*4e9)});
  }
  return data;
}
function getMockForex() { return [{label:'USD/KRW',rate:1325.4,from:'USD',to:'KRW'},{label:'USD/JPY',rate:149.82,from:'USD',to:'JPY'},{label:'EUR/USD',rate:1.0842,from:'EUR',to:'USD'},{label:'USD/CNY',rate:7.2341,from:'USD',to:'CNY'}]; }
function getMockCrypto() { return [{symbol:'BTC',label:'Bitcoin',price:67200,change:820,changePct:1.23,source:'mock'},{symbol:'ETH',label:'Ethereum',price:3210,change:-45,changePct:-1.38,source:'mock'},{symbol:'SOL',label:'Solana',price:148,change:3.2,changePct:2.21,source:'mock'}]; }
function getMockMacro() { return [{key:'fedfunds',label:'Fed Funds Rate',unit:'%',value:5.33,change:0,changePct:0,description:'기준금리',date:'2025-01-01'},{key:'cpi',label:'CPI',unit:'%',value:3.2,change:-0.1,changePct:-3,description:'소비자물가지수',date:'2025-01-01'},{key:'unemployment',label:'실업률',unit:'%',value:3.9,change:0.1,changePct:2.6,description:'미국 실업률',date:'2025-01-01'},{key:'gdp',label:'GDP 성장률',unit:'%',value:3.4,change:0.8,changePct:30,description:'실질 GDP 성장률',date:'2024-10-01'}]; }
function getMockNews() { return [{title:'Fed Officials Signal Caution on Rate Cuts as Inflation Proves Sticky',description:'Federal Reserve officials indicated they need more confidence that inflation is moving toward their 2% target.',url:'https://www.wsj.com',publishedAt:new Date(Date.now()-3_600_000).toISOString(),source:{name:'WSJ'},sentiment:'bearish',category:'fed'},{title:'S&P 500 Hits Record High Amid Strong Corporate Earnings Season',description:'Major indexes climbed after a series of strong earnings reports from technology companies.',url:'https://www.bloomberg.com',publishedAt:new Date(Date.now()-7_200_000).toISOString(),source:{name:'Bloomberg'},sentiment:'bullish',category:'earnings'},{title:'Bitcoin Surges Past Key Resistance as ETF Inflows Accelerate',description:'Bitcoin climbed toward recent highs as ETF inflows reached their highest levels in weeks.',url:'https://www.coindesk.com',publishedAt:new Date(Date.now()-10_800_000).toISOString(),source:{name:'CoinDesk'},sentiment:'bullish',category:'crypto'},{title:'Nonfarm Payrolls Surprise to Upside, Complicating Fed Rate-Cut Plans',description:'The US economy added more jobs than expected, pushing back rate cut timelines.',url:'https://reuters.com',publishedAt:new Date(Date.now()-14_400_000).toISOString(),source:{name:'Reuters'},sentiment:'neutral',category:'labor'},{title:'Oil Prices Climb Amid Middle East Tensions and Supply Concerns',description:'Crude oil prices rose as geopolitical risk added to concerns about potential supply disruptions.',url:'https://ft.com',publishedAt:new Date(Date.now()-18_000_000).toISOString(),source:{name:'FT'},sentiment:'bearish',category:'geo'}]; }
function getMockAssetNews(symbol) { return [{title:`${symbol}: Analysts Raise Price Target After Strong Quarter`,description:'Several Wall Street analysts upgraded their outlook following better-than-expected results.',url:`https://finance.yahoo.com/quote/${symbol}`,publishedAt:new Date(Date.now()-3_600_000).toISOString(),source:{name:'Yahoo Finance'},sentiment:'bullish',category:'earnings'},{title:`${symbol} Faces Headwinds as Macro Uncertainty Weighs on Sector`,description:'Broader market concerns and rate sensitivity continue to pressure valuations.',url:`https://finance.yahoo.com/quote/${symbol}`,publishedAt:new Date(Date.now()-7_200_000).toISOString(),source:{name:'MarketWatch'},sentiment:'bearish',category:'general'},{title:`Institutional Investors Increase ${symbol} Holdings in Q4`,description:'Latest 13F filings show major funds added to positions last quarter.',url:`https://finance.yahoo.com/quote/${symbol}`,publishedAt:new Date(Date.now()-86_400_000).toISOString(),source:{name:'Bloomberg'},sentiment:'bullish',category:'general'}]; }
