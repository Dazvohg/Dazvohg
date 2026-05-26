import type { Expense, ExpenseCategory } from "../domain/types";

export type SpendingAnomaly = {
  category: ExpenseCategory;
  currentMonthAmount: number;
  historicalMean: number;
  historicalStd: number;
  zscore: number;
  message: string;
};

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  super: "Supermercado",
  delivery: "Delivery",
  transporte: "Transporte",
  servicios: "Servicios",
  salud: "Salud",
  ocio: "Ocio",
  ropa: "Ropa",
  educacion: "Educación",
  otros: "Otros",
};

function isoMonth(dateStr: string): string {
  return dateStr.slice(0, 7); // "YYYY-MM"
}

function currentYYYYMM(): string {
  return new Date().toISOString().slice(0, 7);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stdDev(values: number[], avg: number): number {
  if (values.length < 2) return 0;
  const variance =
    values.reduce((s, v) => s + (v - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Detect spending anomalies using z-score statistics.
 * Compares current-month spending per category against historical months.
 * Returns anomalies with |z| > 1.5 (roughly 1-in-7 chance under normal distribution).
 *
 * Requires at least 3 historical months to be meaningful.
 */
export function detectSpendingAnomalies(expenses: Expense[]): SpendingAnomaly[] {
  if (expenses.length === 0) return [];

  const thisMonth = currentYYYYMM();

  // Group totals by month + category
  const totals: Record<string, Record<ExpenseCategory, number>> = {};
  for (const e of expenses) {
    const mo = isoMonth(e.date);
    if (!totals[mo]) totals[mo] = {} as Record<ExpenseCategory, number>;
    totals[mo][e.category] = (totals[mo][e.category] ?? 0) + e.myShare;
  }

  const months = Object.keys(totals).sort();
  const historicalMonths = months.filter((m) => m !== thisMonth);

  // Need at least 3 prior months for reliable statistics
  if (historicalMonths.length < 3) return [];

  const currentTotals = totals[thisMonth] ?? ({} as Record<ExpenseCategory, number>);
  const categories = new Set<ExpenseCategory>(
    expenses.map((e) => e.category),
  );

  const anomalies: SpendingAnomaly[] = [];

  for (const cat of categories) {
    const current = currentTotals[cat] ?? 0;
    if (current === 0) continue;

    const historicalValues = historicalMonths.map((m) => totals[m][cat] ?? 0);
    const nonZeroHistory = historicalValues.filter((v) => v > 0);

    // Skip categories the user rarely spends on (< 2 months with any spend)
    if (nonZeroHistory.length < 2) continue;

    const avg = mean(historicalValues);
    const std = stdDev(historicalValues, avg);

    // Avoid division by zero — if std is tiny relative to mean, no anomaly possible
    if (std < avg * 0.05 + 1) continue;

    const zscore = (current - avg) / std;

    if (Math.abs(zscore) < 1.5) continue;

    const label = CATEGORY_LABELS[cat];
    const diffPct = Math.abs(Math.round(((current - avg) / avg) * 100));
    const direction = zscore > 0 ? "más" : "menos";
    const verb = zscore > 0 ? "alto" : "bajo";

    const message =
      zscore > 2.5
        ? `⚠️ ${label}: gastaste $${Math.round(current).toLocaleString("es-AR")} este mes — ${diffPct}% ${direction} que tu promedio habitual.`
        : zscore > 1.5
          ? `${label} este mes está ${verb}: $${Math.round(current).toLocaleString("es-AR")} vs promedio $${Math.round(avg).toLocaleString("es-AR")}.`
          : `${label} este mes está ${verb} del habitual (${diffPct}% ${direction}).`;

    anomalies.push({
      category: cat,
      currentMonthAmount: current,
      historicalMean: avg,
      historicalStd: std,
      zscore,
      message,
    });
  }

  // Sort by absolute z-score descending (most extreme first)
  return anomalies.sort((a, b) => Math.abs(b.zscore) - Math.abs(a.zscore));
}

/**
 * Returns the single most anomalous spending category, or null if none.
 */
export function topAnomaly(expenses: Expense[]): SpendingAnomaly | null {
  const all = detectSpendingAnomalies(expenses);
  return all.length > 0 ? all[0] : null;
}
