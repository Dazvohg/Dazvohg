// Precios en vivo para el simulador.
//
// En PRODUCCIÓN: usa el Cloudflare Worker (worker/index.ts) que proxea Yahoo Finance
//   sin CORS. Configurar VITE_PRICES_WORKER_URL en .env.production.
//
// En DESARROLLO (localhost): intenta Yahoo Finance directo (CORS relajado en dev).
//   Si falla, los precios quedan en el último valor conocido (defaultPrice).
//
// Crypto: CoinGecko — CORS ok en todos los entornos, sin clave necesaria.

const WORKER_URL = import.meta.env.VITE_PRICES_WORKER_URL ?? "";

const COINGECKO =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,cardano,dogecoin,shiba-inu,ethereum&vs_currencies=usd";

// Solo se usa en dev (localhost). En prod el Worker trae estos símbolos.
const YAHOO_DEV =
  "https://query1.finance.yahoo.com/v7/finance/quote?symbols=AAPL,TSLA,GGAL,YPF,SPY,NVDA&fields=regularMarketPrice";

export type SimPricesResult = {
  prices: Record<string, number>;
  lecapTEM?: number;
};

export async function fetchSimPrices(
  current: Record<string, number>,
): Promise<SimPricesResult> {
  const prices = { ...current };
  let lecapTEM: number | undefined;

  await Promise.allSettled([
    fetchCrypto(prices),
    fetchStocks(prices).then((tem) => { lecapTEM = tem; }),
  ]);

  return { prices, lecapTEM };
}

async function fetchCrypto(prices: Record<string, number>): Promise<void> {
  const res = await fetch(COINGECKO, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return;
  const data = await res.json();
  if (data.bitcoin?.usd)      prices.BTC  = data.bitcoin.usd;
  if (data.cardano?.usd)      prices.ADA  = data.cardano.usd;
  if (data.dogecoin?.usd)     prices.DOGE = data.dogecoin.usd;
  if (data["shiba-inu"]?.usd) prices.SHIB = data["shiba-inu"].usd;
  if (data.ethereum?.usd)     prices.ETH  = data.ethereum.usd;
}

async function fetchStocks(prices: Record<string, number>): Promise<number | undefined> {
  if (WORKER_URL) {
    return fetchViaWorker(prices);
  } else {
    await fetchYahooDirect(prices);
    return undefined;
  }
}

// Producción: Worker devuelve { SYMBOL: price_usd } plano, con CORS correcto.
// Incluye AAPL, TSLA, GGAL, YPF, SPY, NVDA, AL30, GD30 y opcionalmente LECAP_TEM.
async function fetchViaWorker(prices: Record<string, number>): Promise<number | undefined> {
  const res = await fetch(WORKER_URL, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) return undefined;
  const data = await res.json() as Record<string, number>;
  let lecapTEM: number | undefined;
  for (const [symbol, price] of Object.entries(data)) {
    if (typeof price !== "number" || price <= 0) continue;
    // LECAP_TEM y LECAP_LIVE son metadatos del Worker, no precios de assets
    if (symbol === "LECAP_TEM") { lecapTEM = price; continue; }
    if (symbol === "LECAP_LIVE") continue;
    prices[symbol] = price;
  }
  return lecapTEM;
}

// Desarrollo (localhost): Yahoo Finance directo, sin AL30/GD30.
async function fetchYahooDirect(prices: Record<string, number>): Promise<void> {
  const res = await fetch(YAHOO_DEV, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return;
  const data = await res.json();
  for (const quote of data.quoteResponse?.result ?? []) {
    if (quote.symbol && quote.regularMarketPrice) {
      prices[quote.symbol] = quote.regularMarketPrice;
    }
  }
}
