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
      if (item.casa === "bolsa") next.mep = item.venta;
      if (item.casa === "contadoconliqui") next.ccl = item.venta;
      if (item.casa === "blue") next.blue = item.venta;
      if (item.casa === "cripto") next.cripto = item.venta;
    }
    return next;
  } catch {
    return current;
  }
}

// ── Datos macro Argentina ─────────────────────────────────────────────────────
// BCRA API pública: https://api.bcra.gob.ar/estadisticas/v3.0/Monetarias/{id}
// Variable 25 = Inflación mensual IPC (INDEC)
// CORS habilitado en el servidor del BCRA para browsers.
const BCRA_IPC = "https://api.bcra.gob.ar/estadisticas/v3.0/Monetarias/25?limit=1";

// Riesgo país EMBI: sin API pública CORS-compatible disponible.
// Se actualiza como referencia periódica en el código.
const COUNTRY_RISK_REF = 680;

export async function fetchLiveData(current: LiveData): Promise<LiveData> {
  try {
    const res = await fetch(BCRA_IPC, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error("bcra");
    const body = await res.json() as { results?: Array<{ valor: number }> };
    const latest = body?.results?.[0];
    if (typeof latest?.valor !== "number") throw new Error("no data");
    const inflationMonthly = latest.valor;
    const inflationAnnual = Math.round(((1 + inflationMonthly / 100) ** 12 - 1) * 100);
    return {
      inflationMonthly,
      inflationAnnual,
      countryRisk: current.countryRisk ?? COUNTRY_RISK_REF,
      updatedAt: Date.now(),
      source: "live",
    };
  } catch {
    // Mantener valores conocidos o usar referencial educativo
    if (current.inflationMonthly != null) return current;
    return {
      inflationMonthly: 3.7,
      inflationAnnual: 54,
      countryRisk: COUNTRY_RISK_REF,
      updatedAt: Date.now(),
      source: "referencial",
    };
  }
}
