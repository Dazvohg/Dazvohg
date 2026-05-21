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
//   Variable 25 = IPC mensual (INDEC)
//   Variable 5  = Riesgo País EMBI (puntos básicos)
const BCRA_IPC  = "https://api.bcra.gob.ar/estadisticas/v3.0/Monetarias/25?limit=1";
const BCRA_EMBI = "https://api.bcra.gob.ar/estadisticas/v3.0/Monetarias/5?limit=1";

// Usados solo si ambas llamadas al BCRA fallan completamente
const FALLBACK_INFLATION_MONTHLY = 3.7;
const FALLBACK_COUNTRY_RISK      = 700;

type BcraBody = { results?: Array<{ valor: number }> };

async function fetchBcraVariable(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const body = (await res.json()) as BcraBody;
    const valor = body?.results?.[0]?.valor;
    return typeof valor === "number" ? valor : null;
  } catch {
    return null;
  }
}

export async function fetchLiveData(current: LiveData): Promise<LiveData> {
  // Fetch paralelo: inflación + riesgo país
  const [ipcVal, embiVal] = await Promise.all([
    fetchBcraVariable(BCRA_IPC),
    fetchBcraVariable(BCRA_EMBI),
  ]);

  const inflationMonthly = ipcVal ?? (current.inflationMonthly ?? FALLBACK_INFLATION_MONTHLY);
  const inflationSource  = ipcVal != null ? "live" as const : "referencial" as const;

  // Validar rango razonable para EMBI (100–5000 puntos básicos)
  const embiIsValid = embiVal != null && embiVal >= 100 && embiVal <= 5000;
  const countryRisk = embiIsValid
    ? embiVal
    : (current.countryRisk ?? FALLBACK_COUNTRY_RISK);
  const countryRiskSource = embiIsValid ? "live" as const : "referencial" as const;

  const inflationAnnual = Math.round(((1 + inflationMonthly / 100) ** 12 - 1) * 100);

  return {
    inflationMonthly,
    inflationAnnual,
    countryRisk,
    countryRiskSource,
    updatedAt: Date.now(),
    source: inflationSource,
  };
}
