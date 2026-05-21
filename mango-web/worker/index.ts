/**
 * Mango Prices Worker — Cloudflare Worker
 *
 * Resuelve el problema de CORS de Yahoo Finance en producción.
 * El Worker corre server-side (sin CORS) y devuelve todos los precios
 * en un objeto plano { SYMBOL: price_usd }.
 *
 * Deploy:
 *   cd worker && npx wrangler deploy
 *
 * Resultado: una URL como https://mango-prices.USUARIO.workers.dev
 * Configurar en mango-web/.env.production:
 *   VITE_PRICES_WORKER_URL=https://mango-prices.USUARIO.workers.dev
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, max-age=55", // 55s cache: fresco sin exceder rate limits
};

// Stocks USA + CEDEARs: precios en USD directos desde Yahoo Finance
const STOCK_SYMBOLS = "AAPL,TSLA,GGAL,YPF,SPY,NVDA";

// Bonos AR: cotizan en ARS en BYMA. Se convierten a USD via MEP.
const BONO_SYMBOLS_BA = "AL30.BA,GD30.BA";

const YAHOO = "https://query1.finance.yahoo.com/v7/finance/quote";
const YAHOO_HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; MangoApp/1.0)" };

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    try {
      // Fetch paralelo: stocks USD + bonos ARS + tipo de cambio MEP
      const [stocksRes, bonosRes, dolarRes] = await Promise.allSettled([
        fetch(`${YAHOO}?symbols=${STOCK_SYMBOLS}&fields=regularMarketPrice`, { headers: YAHOO_HEADERS }),
        fetch(`${YAHOO}?symbols=${BONO_SYMBOLS_BA}&fields=regularMarketPrice`, { headers: YAHOO_HEADERS }),
        fetch("https://dolarapi.com/v1/dolares/bolsa"),
      ]);

      const result: Record<string, number> = {};

      // ── Stocks y CEDEARs (USD directo) ────────────────────────────────────
      if (stocksRes.status === "fulfilled" && stocksRes.value.ok) {
        const data = await stocksRes.value.json() as { quoteResponse?: { result?: Array<{ symbol: string; regularMarketPrice: number }> } };
        for (const q of data.quoteResponse?.result ?? []) {
          if (q.symbol && q.regularMarketPrice) {
            result[q.symbol] = q.regularMarketPrice;
          }
        }
      }

      // ── Bonos AR: ARS → USD via MEP ───────────────────────────────────────
      // AL30.BA y GD30.BA cotizan en centavos de peso por lámina de $1.
      // Precio real en ARS = regularMarketPrice / 100 (BYMA cotiza en centavos).
      // Precio USD ≈ precio_ars / mep
      let mep = 0;
      if (dolarRes.status === "fulfilled" && dolarRes.value.ok) {
        const d = await dolarRes.value.json() as { venta?: number };
        mep = d.venta ?? 0;
      }

      if (bonosRes.status === "fulfilled" && bonosRes.value.ok && mep > 0) {
        const data = await bonosRes.value.json() as { quoteResponse?: { result?: Array<{ symbol: string; regularMarketPrice: number }> } };
        for (const q of data.quoteResponse?.result ?? []) {
          if (!q.symbol || !q.regularMarketPrice) continue;
          const id = q.symbol.replace(".BA", "");       // "AL30.BA" → "AL30"
          const arsPrice = q.regularMarketPrice / 100;  // centavos → pesos
          result[id] = parseFloat((arsPrice / mep).toFixed(4)); // ARS → USD
        }
      }

      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }
  },
};
