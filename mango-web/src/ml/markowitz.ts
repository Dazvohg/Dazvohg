// markowitz.ts — Modern Portfolio Theory: Maximum Sharpe Ratio optimisation
// Uses Monte Carlo portfolio sampling over a Dirichlet-uniform simplex.
// Pure math, no external dependencies.

import type { SimPosition } from "../domain/types";

// ── Primitives ────────────────────────────────────────────────────────────────

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function variance(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
}

/**
 * Compute log returns from a chronologically sorted price history.
 * Returns an empty array when there are fewer than 2 points.
 */
function logReturns(history: Array<{ t: number; p: number }>): number[] {
  const sorted = [...history].sort((a, b) => a.t - b.t);
  const returns: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].p;
    const curr = sorted[i].p;
    if (prev > 0 && curr > 0) {
      returns.push(Math.log(curr / prev));
    }
  }
  return returns;
}

/**
 * Sample random portfolio weights uniformly on the probability simplex via the
 * Dirichlet(1,…,1) distribution: normalise n independent Exponential(1) samples.
 */
function randomWeights(n: number): number[] {
  const gammas = Array.from({ length: n }, () => -Math.log(Math.random()));
  const sum = gammas.reduce((a, b) => a + b, 0);
  return gammas.map((g) => g / sum);
}

/**
 * Compute the covariance between two return series aligned by index.
 * Falls back to 0 when series have fewer than 2 aligned observations.
 */
function covariance(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len < 2) return 0;
  const ma = mean(a.slice(0, len));
  const mb = mean(b.slice(0, len));
  let cov = 0;
  for (let i = 0; i < len; i++) {
    cov += (a[i] - ma) * (b[i] - mb);
  }
  return cov / (len - 1);
}

// ── Public types ──────────────────────────────────────────────────────────────

export type MarkowitzResult = {
  weights: Record<string, number>;  // assetId → weight (0–1, sums to 1)
  expectedAnnualReturnPct: number;
  annualVolatilityPct: number;
  sharpeRatio: number;
  numAssetsOptimized: number;       // assets that had sufficient history
};

// ── Main optimisation ─────────────────────────────────────────────────────────

/**
 * Find the portfolio that maximises the Sharpe ratio using Monte Carlo sampling.
 *
 * @param assetIds       Candidate asset identifiers
 * @param priceHistory   Historical price arrays per asset
 * @param riskFreeRate   Annual risk-free rate (default 0.38 = 38 % BADLAR TNA)
 * @param numPortfolios  Number of random portfolios to evaluate (default 3000)
 * @returns Optimal portfolio or null if fewer than 2 assets have ≥ 10 data points
 */
export function optimizeMarkowitz(
  assetIds: string[],
  priceHistory: Record<string, Array<{ t: number; p: number }>>,
  riskFreeRate = 0.38,
  numPortfolios = 3_000
): MarkowitzResult | null {
  // ── 1. Compute log-return series per asset ──────────────────────────────────
  const returnMap: Record<string, number[]> = {};
  for (const id of assetIds) {
    const hist = priceHistory[id] ?? [];
    if (hist.length >= 10) {
      returnMap[id] = logReturns(hist);
    }
  }

  const eligibleIds = Object.keys(returnMap);
  if (eligibleIds.length < 2) return null;

  const n = eligibleIds.length;

  // ── 2. Annualised mean return and variance per asset ────────────────────────
  const annualMeans: number[] = eligibleIds.map((id) => mean(returnMap[id]) * 252);
  const annualVars: number[] = eligibleIds.map((id) => variance(returnMap[id]) * 252);

  // ── 3. Covariance matrix (annualised) ───────────────────────────────────────
  // We compute actual pairwise covariances from aligned return series.
  // For assets whose return series differ in length we align from the start
  // (both series are already sorted chronologically).
  const covMatrix: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (__, j) => {
      if (i === j) return annualVars[i];
      return covariance(returnMap[eligibleIds[i]], returnMap[eligibleIds[j]]) * 252;
    })
  );

  // ── 4. Sample random portfolios and track the maximum-Sharpe one ────────────
  let bestSharpe = -Infinity;
  let bestWeights: number[] = new Array<number>(n).fill(1 / n);
  let bestReturn = 0;
  let bestVol = 0;

  for (let k = 0; k < numPortfolios; k++) {
    const w = randomWeights(n);

    // Portfolio expected return: wᵀ μ
    let portReturn = 0;
    for (let i = 0; i < n; i++) portReturn += w[i] * annualMeans[i];

    // Portfolio variance: wᵀ Σ w
    let portVariance = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        portVariance += w[i] * w[j] * covMatrix[i][j];
      }
    }
    // Guard against floating-point negatives from near-zero covariance
    const portVol = Math.sqrt(Math.max(0, portVariance));

    const sharpe =
      portVol > 0 ? (portReturn - riskFreeRate) / portVol : -Infinity;

    if (sharpe > bestSharpe) {
      bestSharpe = sharpe;
      bestWeights = w;
      bestReturn = portReturn;
      bestVol = portVol;
    }
  }

  // ── 5. Build result ─────────────────────────────────────────────────────────
  const weights: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    weights[eligibleIds[i]] = bestWeights[i];
  }

  return {
    weights,
    expectedAnnualReturnPct: bestReturn * 100,
    annualVolatilityPct: bestVol * 100,
    sharpeRatio: bestSharpe,
    numAssetsOptimized: n,
  };
}

// ── Portfolio comparison ──────────────────────────────────────────────────────

/**
 * Compare the current (live) portfolio weights against the Markowitz optimum
 * and emit rebalancing suggestions.
 */
export function compareToOptimal(
  currentPositions: SimPosition[],
  prices: Record<string, number>,
  optimal: MarkowitzResult
): {
  currentWeights: Record<string, number>;
  suggestions: Array<{
    assetId: string;
    currentWeight: number;
    optimalWeight: number;
    action: "increase" | "decrease" | "hold";
    deltaPct: number;
  }>;
} {
  // ── Current weights ─────────────────────────────────────────────────────────
  const values: Record<string, number> = {};
  let totalValue = 0;

  for (const pos of currentPositions) {
    const price = prices[pos.assetId] ?? pos.avgBuyPrice;
    const val = pos.quantity * price;
    values[pos.assetId] = val;
    totalValue += val;
  }

  const currentWeights: Record<string, number> = {};
  if (totalValue > 0) {
    for (const [id, val] of Object.entries(values)) {
      currentWeights[id] = val / totalValue;
    }
  }

  // ── Suggestions ─────────────────────────────────────────────────────────────
  // Union of all asset IDs present in either the current portfolio or the optimal
  const allIds = new Set<string>([
    ...Object.keys(currentWeights),
    ...Object.keys(optimal.weights),
  ]);

  const HOLD_THRESHOLD = 0.02; // 2 % band — avoid noise-driven churn

  const suggestions = Array.from(allIds).map((assetId) => {
    const currentWeight = currentWeights[assetId] ?? 0;
    const optimalWeight = optimal.weights[assetId] ?? 0;
    const delta = optimalWeight - currentWeight;
    const deltaPct = delta * 100;

    let action: "increase" | "decrease" | "hold";
    if (Math.abs(delta) < HOLD_THRESHOLD) {
      action = "hold";
    } else if (delta > 0) {
      action = "increase";
    } else {
      action = "decrease";
    }

    return { assetId, currentWeight, optimalWeight, action, deltaPct };
  });

  // Sort: largest absolute deviation first
  suggestions.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));

  return { currentWeights, suggestions };
}
