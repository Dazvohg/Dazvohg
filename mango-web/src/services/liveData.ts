import type { Rates } from "../domain/types";

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
