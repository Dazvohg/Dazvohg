// Precios en vivo para el simulador.
// Crypto: CoinGecko (gratis, CORS ok, sin clave).
// Stocks/CEDEARs: Yahoo Finance v8 (sin clave, puede tener CORS en prod).
// Ante cualquier fallo, los precios quedan en el último valor conocido.

const COINGECKO =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,cardano,dogecoin,shiba-inu&vs_currencies=usd";

const YAHOO =
  "https://query1.finance.yahoo.com/v7/finance/quote?symbols=AAPL,TSLA,GGAL,YPF&fields=regularMarketPrice";

export async function fetchSimPrices(
  current: Record<string, number>,
): Promise<Record<string, number>> {
  const prices = { ...current };

  await Promise.allSettled([
    fetchCrypto(prices),
    fetchStocks(prices),
  ]);

  return prices;
}

async function fetchCrypto(prices: Record<string, number>): Promise<void> {
  const res = await fetch(COINGECKO, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return;
  const data = await res.json();
  if (data.bitcoin?.usd)       prices.BTC  = data.bitcoin.usd;
  if (data.cardano?.usd)       prices.ADA  = data.cardano.usd;
  if (data.dogecoin?.usd)      prices.DOGE = data.dogecoin.usd;
  if (data["shiba-inu"]?.usd)  prices.SHIB = data["shiba-inu"].usd;
}

async function fetchStocks(prices: Record<string, number>): Promise<void> {
  const res = await fetch(YAHOO, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return;
  const data = await res.json();
  for (const quote of data.quoteResponse?.result ?? []) {
    if (quote.symbol && quote.regularMarketPrice) {
      prices[quote.symbol] = quote.regularMarketPrice;
    }
  }
}
