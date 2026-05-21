import type { LiveData, Rates } from "../domain/types";

// ── Cotizaciones dólar ────────────────────────────────────────────────────────
export async function fetchRates(current: Rates): Promise<Rates> {
  try {
    const response = await fetch("https://dolarapi.com/v1/dolares");
    if (!response.ok) throw new Error("rate fetch failed");
    const data = (await response.json()) as Array<{ casa: string; venta: number }>;
    const next = { ...current, source: "live" as const, updatedAt: Date.now() };
    for (const item of data) {
      if (item.casa === "oficial") next.oficial = item.venta;
      if (item.casa === "bolsa")   next.mep     = item.venta;
      if (item.casa === "contadoconliqui") next.ccl = item.venta;
      if (item.casa === "blue")    next.blue    = item.venta;
      if (item.casa === "cripto")  next.cripto  = item.venta;
    }
    // Snapshot diario (máx 30 días)
    const today = new Date().toISOString().slice(0, 10);
    const history = current.history ?? [];
    if (history[history.length - 1]?.date !== today && next.mep > 0 && next.blue > 0) {
      next.history = [...history, { date: today, mep: next.mep, blue: next.blue, oficial: next.oficial }].slice(-30);
    } else {
      next.history = history;
    }
    return next;
  } catch {
    return current;
  }
}

// ── Datos macro Argentina ─────────────────────────────────────────────────────
// BCRA API pública CORS-habilitada: https://api.bcra.gob.ar/estadisticas/v3.0/Monetarias/{id}
//
//   Variable 6  = Tasa de política monetaria / pases pasivos (TNA %)
//   Variable 7  = BADLAR bancos privados (TNA %)
//   Variable 25 = IPC mensual (INDEC, %)
//   Variable 5  = Riesgo País EMBI (puntos básicos)
//
// De BADLAR y pases se derivan las tasas de referencia para FCI MM, Plazo Fijo y Caución.

const BCRA = (id: number) =>
  `https://api.bcra.gob.ar/estadisticas/v3.0/Monetarias/${id}?limit=1`;

// Rangos de validación para descartar datos erróneos si el BCRA cambia variable IDs
const VALID = {
  inflation: { min: 0.1,  max: 50   },   // % mensual
  embi:      { min: 100,  max: 5000  },   // puntos básicos
  tna:       { min: 1,    max: 200   },   // % TNA (tasas monetarias)
};

type BcraBody = { results?: Array<{ valor: number }> };

async function fetchVar(id: number, valid: { min: number; max: number }): Promise<number | null> {
  try {
    const res = await fetch(BCRA(id), { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const body = (await res.json()) as BcraBody;
    const v = body?.results?.[0]?.valor;
    if (typeof v !== "number") return null;
    return v >= valid.min && v <= valid.max ? v : null;
  } catch {
    return null;
  }
}

// Fallbacks educativos usados solo si el BCRA falla completamente
const FALLBACK = {
  inflationMonthly: 3.7,
  countryRisk:      700,
  badlarTNA:        38,
  pasesTNA:         32,
};

export async function fetchLiveData(current: LiveData): Promise<LiveData> {
  // Cuatro fetches paralelos al BCRA
  const [ipc, embi, badlar, pases] = await Promise.all([
    fetchVar(25, VALID.inflation),
    fetchVar(5,  VALID.embi),
    fetchVar(7,  VALID.tna),
    fetchVar(6,  VALID.tna),
  ]);

  const inflationMonthly = ipc   ?? (current.inflationMonthly ?? FALLBACK.inflationMonthly);
  const countryRisk      = embi  ?? (current.countryRisk      ?? FALLBACK.countryRisk);
  const badlarTNA        = badlar ?? (current.badlarTNA        ?? FALLBACK.badlarTNA);
  const pasesTNA         = pases  ?? (current.pasesTNA         ?? FALLBACK.pasesTNA);

  return {
    inflationMonthly,
    inflationAnnual: Math.round(((1 + inflationMonthly / 100) ** 12 - 1) * 100),
    countryRisk,
    countryRiskSource: embi   != null ? "live" : "referencial",
    badlarTNA,
    pasesTNA,
    ratesSource:      badlar != null ? "live" : "referencial",
    updatedAt: Date.now(),
    source: ipc != null ? "live" : "referencial",
  };
}
