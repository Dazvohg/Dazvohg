/**
 * Mango Prices Worker — Cloudflare Worker
 *
 * Resuelve el problema de CORS de Yahoo Finance en producción.
 * El Worker corre server-side (sin CORS) y devuelve todos los precios
 * en un objeto plano { SYMBOL: price_usd }.
 *
 * También calcula el TEM implícito de LECAPs desde su precio de mercado en BYMA.
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

// LECAPs del Tesoro Nacional — letras de capitalización en pesos (cupón cero).
// Formato de ticker BYMA: S{DD}{M}{AA}.BA
// Mes: E=ene F=feb M=mar A=abr Y=may J=jun L=jul G=ago P=sep O=oct N=nov D=dic
//
// ⚠️ Actualizar ~cada 3 meses cuando el Tesoro emita nuevas letras.
// Tickers vigentes: https://www.byma.com.ar/renta-fija → Letras del Tesoro
const LECAP_CANDIDATES: Array<{ symbol: string; maturity: string }> = [
  { symbol: "S29Y6.BA", maturity: "2026-05-29" },
  { symbol: "S30J6.BA", maturity: "2026-06-30" },
  { symbol: "S31L6.BA", maturity: "2026-07-31" },
  { symbol: "S29G6.BA", maturity: "2026-08-28" },
  { symbol: "S30P6.BA", maturity: "2026-09-30" },
  { symbol: "S31O6.BA", maturity: "2026-10-30" },
  { symbol: "S28N6.BA", maturity: "2026-11-27" },
  { symbol: "S19D6.BA", maturity: "2026-12-18" },
  { symbol: "S30E7.BA", maturity: "2027-01-30" },
  { symbol: "S27F7.BA", maturity: "2027-02-27" },
];

const YAHOO = "https://query1.finance.yahoo.com/v7/finance/quote";
const YAHOO_HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; MangoApp/1.0)" };

type QuoteResult = { symbol: string; regularMarketPrice: number };
type YahooResponse = { quoteResponse?: { result?: QuoteResult[] } };

/**
 * Calcula el TEM implícito de una LECAP desde su precio de mercado.
 *
 * Maneja cualquier convención de cotización de BYMA/Yahoo Finance:
 * la función normaliza el precio a una ratio [0.80, 1.00] antes de calcular.
 * Retorna null si el precio no parece válido o el TEM cae fuera de rango.
 */
function calcLecapTEM(rawPrice: number, maturity: string): number | null {
  const now = Date.now();
  const days = Math.ceil((new Date(maturity).getTime() - now) / 86400000);
  if (days < 3) return null; // demasiado cerca del vencimiento

  // Normalizar a ratio [0, 1] sin importar si Yahoo muestra en pesos,
  // centavos, porcentaje de par u otra escala.
  // Una LECAP que aún no venció siempre cotiza entre 80% y 100% de su VN.
  let ratio = 0;
  if      (rawPrice >= 0.80    && rawPrice < 1.00)    ratio = rawPrice;
  else if (rawPrice >= 80      && rawPrice < 100)     ratio = rawPrice / 100;
  else if (rawPrice >= 800     && rawPrice < 1000)    ratio = rawPrice / 1000;
  else if (rawPrice >= 8_000   && rawPrice < 10_000)  ratio = rawPrice / 10_000;
  else if (rawPrice >= 80_000  && rawPrice < 100_000) ratio = rawPrice / 100_000;
  else return null;

  const tem = (Math.pow(1 / ratio, 30 / days) - 1) * 100;
  if (tem < 0.5 || tem > 15) return null; // rango esperado para AR en condiciones normales
  return +tem.toFixed(2);
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    try {
      // Filtrar LECAPs ya vencidas antes de pedir precios
      const today = new Date().toISOString().slice(0, 10);
      const activeLecaps = LECAP_CANDIDATES.filter((l) => l.maturity > today);
      const lecapSymbols = activeLecaps.map((l) => l.symbol).join(",");

      // Fetch paralelo: stocks USD + bonos ARS + tipo de cambio MEP + LECAPs
      const [stocksRes, bonosRes, dolarRes, lecapsRes] = await Promise.allSettled([
        fetch(`${YAHOO}?symbols=${STOCK_SYMBOLS}&fields=regularMarketPrice`, { headers: YAHOO_HEADERS }),
        fetch(`${YAHOO}?symbols=${BONO_SYMBOLS_BA}&fields=regularMarketPrice`, { headers: YAHOO_HEADERS }),
        fetch("https://dolarapi.com/v1/dolares/bolsa"),
        lecapSymbols
          ? fetch(`${YAHOO}?symbols=${lecapSymbols}&fields=regularMarketPrice`, { headers: YAHOO_HEADERS })
          : Promise.reject("no active LECAPs"),
      ]);

      const result: Record<string, number> = {};

      // ── Stocks y CEDEARs (USD directo) ────────────────────────────────────
      if (stocksRes.status === "fulfilled" && stocksRes.value.ok) {
        const data = await stocksRes.value.json() as YahooResponse;
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
        const data = await bonosRes.value.json() as YahooResponse;
        for (const q of data.quoteResponse?.result ?? []) {
          if (!q.symbol || !q.regularMarketPrice) continue;
          const id = q.symbol.replace(".BA", "");       // "AL30.BA" → "AL30"
          const arsPrice = q.regularMarketPrice / 100;  // centavos → pesos
          result[id] = parseFloat((arsPrice / mep).toFixed(4)); // ARS → USD
        }
      }

      // ── LECAPs: TEM implícito desde precio de mercado BYMA ────────────────
      // Buscar el LECAP con vencimiento más próximo (mayor liquidez y representatividad).
      if (lecapsRes.status === "fulfilled" && lecapsRes.value.ok) {
        const data = await lecapsRes.value.json() as YahooResponse;
        const quotes = data.quoteResponse?.result ?? [];

        // Ordenar los candidatos activos por fecha de vencimiento (más próximo primero)
        const sorted = [...activeLecaps].sort((a, b) => a.maturity.localeCompare(b.maturity));

        for (const candidate of sorted) {
          const quote = quotes.find((q) => q.symbol === candidate.symbol);
          if (!quote?.regularMarketPrice) continue;
          const tem = calcLecapTEM(quote.regularMarketPrice, candidate.maturity);
          if (tem !== null) {
            result["LECAP_TEM"]    = tem;
            result["LECAP_LIVE"]   = 1;
            break; // con el primero válido alcanza
          }
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
