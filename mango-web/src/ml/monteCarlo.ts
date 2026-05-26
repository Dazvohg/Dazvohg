// monteCarlo.ts — Geometric Brownian Motion Monte Carlo simulation
// Pure math, no external dependencies.
// Model: dS = μS·dt + σS·dW  (Wiener process via Box-Muller transform)

// ── Primitives ────────────────────────────────────────────────────────────────

/** Box-Muller transform: sample Z ~ N(0,1) */
function sampleNormal(): number {
  let u1: number, u2: number;
  do {
    u1 = Math.random();
  } while (u1 === 0); // guard against log(0)
  u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

/** nth percentile of a pre-sorted array (linear interpolation) */
function percentileSorted(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Compute annualized volatility and drift from a price history.
 * Returns null if fewer than 5 data points.
 */
export function computeAssetStats(
  history: Array<{ t: number; p: number }>
): { annualVolatility: number; annualDrift: number } | null {
  if (history.length < 5) return null;

  // Sort chronologically (defensive — history may arrive unordered)
  const sorted = [...history].sort((a, b) => a.t - b.t);

  const logReturns: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].p;
    const curr = sorted[i].p;
    if (prev > 0 && curr > 0) {
      logReturns.push(Math.log(curr / prev));
    }
  }

  if (logReturns.length < 4) return null;

  const annualVolatility = stdDev(logReturns) * Math.sqrt(252);
  const annualDrift = mean(logReturns) * 252;

  return { annualVolatility, annualDrift };
}

/**
 * Compute portfolio-level weighted volatility and drift.
 * Correlation is ignored (diagonal covariance) for speed.
 * hasData = at least 3 assets have sufficient price history.
 */
export function computePortfolioStats(
  positions: Array<{ assetId: string; quantity: number; avgBuyPrice: number }>,
  prices: Record<string, number>,
  priceHistory: Record<string, Array<{ t: number; p: number }>>
): { volatility: number; drift: number; hasData: boolean } {
  // Compute position values to derive weights
  const values: Array<{ assetId: string; value: number }> = positions.map((pos) => ({
    assetId: pos.assetId,
    value: pos.quantity * (prices[pos.assetId] ?? pos.avgBuyPrice),
  }));

  const totalValue = values.reduce((s, v) => s + v.value, 0);

  if (totalValue <= 0) {
    return { volatility: 0, drift: 0, hasData: false };
  }

  let weightedVariance = 0;
  let weightedDrift = 0;
  let assetsWithData = 0;

  for (const { assetId, value } of values) {
    const w = value / totalValue;
    const history = priceHistory[assetId] ?? [];
    const stats = computeAssetStats(history);
    if (stats !== null) {
      weightedVariance += w * w * stats.annualVolatility ** 2;
      weightedDrift += w * stats.annualDrift;
      assetsWithData++;
    }
  }

  return {
    volatility: Math.sqrt(weightedVariance),
    drift: weightedDrift,
    hasData: assetsWithData >= 3,
  };
}

// ── Monte Carlo Result type ───────────────────────────────────────────────────

export type MonteCarloResult = {
  probGain: number;          // probability portfolio ends above current value (0–1)
  expectedReturnPct: number; // median expected return as percentage
  var95Pct: number;          // Value at Risk at 95% confidence (positive = loss)
  var99Pct: number;          // Value at Risk at 99% confidence
  percentiles: {
    p10: number[]; // 10th-percentile path (% change from start), length = days
    p25: number[];
    p50: number[]; // median path
    p75: number[];
    p90: number[];
  };
  days: number;
};

// ── GBM simulation ────────────────────────────────────────────────────────────

/**
 * Run a GBM Monte Carlo simulation.
 *
 * @param volatility  Annual volatility as a decimal (e.g. 0.4 = 40 %)
 * @param drift       Annual drift as a decimal
 * @param days        Simulation horizon in trading days (default 30)
 * @param simulations Number of Monte Carlo paths (default 5000)
 */
export function runMonteCarlo(
  volatility: number,
  drift: number,
  days = 30,
  simulations = 5_000
): MonteCarloResult {
  const dt = 1 / 252; // one trading day
  const drift_adj = (drift - 0.5 * volatility * volatility) * dt;
  const vol_sqrt_dt = volatility * Math.sqrt(dt);

  // Run all simulations; store full paths as % change from S₀ = 100
  // paths[sim][day] — day index 0 … days-1
  const paths: number[][] = [];

  for (let sim = 0; sim < simulations; sim++) {
    const path = new Array<number>(days);
    let s = 1; // normalised: S₀ = 1 (= 100 %)
    for (let d = 0; d < days; d++) {
      s = s * Math.exp(drift_adj + vol_sqrt_dt * sampleNormal());
      path[d] = (s - 1) * 100; // percentage change from start
    }
    paths.push(path);
  }

  // Terminal values (percentage change at day `days-1`)
  const terminals: number[] = paths.map((p) => p[days - 1]);
  const sortedTerminals = [...terminals].sort((a, b) => a - b);

  const probGain =
    terminals.filter((v) => v > 0).length / simulations;

  const expectedReturnPct = percentileSorted(sortedTerminals, 50); // median

  // VaR: loss not exceeded with X% confidence
  // The (100-95)=5th percentile of returns = worst 5% scenario
  const p5 = percentileSorted(sortedTerminals, 5);
  const p1 = percentileSorted(sortedTerminals, 1);
  const var95Pct = p5 < 0 ? -p5 : 0; // positive number = loss magnitude
  const var99Pct = p1 < 0 ? -p1 : 0;

  // Percentile paths: for each target percentile pick the path whose terminal
  // value is closest to that percentile of the terminal distribution.
  function closestPathToTerminalPct(targetPct: number): number[] {
    const targetTerminal = percentileSorted(sortedTerminals, targetPct);
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < simulations; i++) {
      const dist = Math.abs(terminals[i] - targetTerminal);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    return paths[bestIdx];
  }

  const percentiles = {
    p10: closestPathToTerminalPct(10),
    p25: closestPathToTerminalPct(25),
    p50: closestPathToTerminalPct(50),
    p75: closestPathToTerminalPct(75),
    p90: closestPathToTerminalPct(90),
  };

  return {
    probGain,
    expectedReturnPct,
    var95Pct,
    var99Pct,
    percentiles,
    days,
  };
}
