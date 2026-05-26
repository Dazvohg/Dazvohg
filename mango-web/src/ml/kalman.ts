/**
 * kalman.ts
 *
 * 1-D Kalman filter for smoothing financial time-series price data.
 * Pure math, zero external dependencies.
 *
 * Scalar state-space model:
 *   x_k = x_{k-1} + w_k       (w ~ N(0, Q))   process (state transition)
 *   z_k = x_k    + v_k        (v ~ N(0, R))   measurement
 *
 * Predict:
 *   x̂⁻_k = x̂_{k-1}
 *   P⁻_k  = P_{k-1} + Q
 *
 * Update (correct):
 *   K_k   = P⁻_k / (P⁻_k + R)          (Kalman gain)
 *   x̂_k  = x̂⁻_k + K_k · (z_k - x̂⁻_k)
 *   P_k   = (1 - K_k) · P⁻_k
 */

// ─── KalmanFilter class ────────────────────────────────────────────────────────

export class KalmanFilter {
  /** Current state estimate (filtered price) */
  private x: number;

  /** Current estimate error covariance */
  private p: number;

  /** Process noise variance — how much the true price drifts per tick */
  private readonly q: number;

  /** Measurement noise variance — how noisy the observed price is */
  private readonly r: number;

  /**
   * @param initialValue     Seed value for the filter state (e.g. first observed price).
   * @param processNoise     Q — process noise (default: 0.001). Small → filter trusts its
   *                         own model; large → filter tracks measurements more closely.
   * @param measurementNoise R — measurement noise (default: 1.0). Large → filter smooths
   *                         aggressively; small → filter trusts raw measurements.
   */
  constructor(
    initialValue: number,
    processNoise: number = 0.001,
    measurementNoise: number = 1.0,
  ) {
    this.x = initialValue;
    // Initialise P to R so the first measurement isn't over-weighted
    this.p = measurementNoise;
    this.q = processNoise;
    this.r = measurementNoise;
  }

  /**
   * Incorporate a new price measurement and return the updated filtered estimate.
   */
  update(measurement: number): number {
    // ── Predict ──────────────────────────────────────────────────────────────
    // State prediction: x̂⁻ = x̂ (random-walk model — price stays the same)
    const xPrior = this.x;
    const pPrior = this.p + this.q;

    // ── Update ───────────────────────────────────────────────────────────────
    const k = pPrior / (pPrior + this.r); // Kalman gain
    this.x = xPrior + k * (measurement - xPrior);
    this.p = (1 - k) * pPrior;

    return this.x;
  }

  /** The current filtered price estimate. */
  get estimate(): number {
    return this.x;
  }

  /**
   * The current estimate error covariance P.
   * Useful for building ±σ confidence intervals around `estimate`.
   * The 1-σ confidence band is approximately ± Math.sqrt(uncertainty).
   */
  get uncertainty(): number {
    return this.p;
  }
}

// ─── adaptiveMeasurementNoise ──────────────────────────────────────────────────

/**
 * Compute a measurement noise value R from recent price variance.
 *
 * Rationale: in volatile markets the API prices jump around more, so we raise R
 * to make the Kalman filter weight its own prediction more heavily (more smoothing).
 * In calm markets R is low and the filter closely follows observations.
 *
 * Returns a minimum of 0.0001 so R is never zero (avoids division-by-zero in the
 * Kalman gain calculation).
 *
 * @param history  Array of time-price points (any order; only prices are used).
 * @param window   How many tail points to consider (default: 10).
 */
export function adaptiveMeasurementNoise(
  history: Array<{ t: number; p: number }>,
  window: number = 10,
): number {
  const slice = history.slice(-window);
  if (slice.length < 2) {
    // Not enough data — return a sensible default
    return 1.0;
  }

  const prices = slice.map((pt) => pt.p);
  const n = prices.length;
  const mean = prices.reduce((acc, v) => acc + v, 0) / n;
  const variance =
    prices.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n - 1); // sample variance

  // Clamp to a meaningful minimum so the filter never treats noise as exactly zero
  return Math.max(variance, 0.0001);
}

// ─── smoothPrices ──────────────────────────────────────────────────────────────

/**
 * Apply a Kalman filter to a complete price history array in a single pass.
 *
 * The function is stateless and pure — it creates a fresh KalmanFilter seeded
 * from the first data point and sweeps forward through the series.
 *
 * @param history          Array of `{ t, p }` points, ordered oldest-first.
 * @param processNoise     Q override (default: 0.001).
 * @param measurementNoise R override.  When omitted, `adaptiveMeasurementNoise`
 *                         is called on the full history to compute an adaptive R.
 *
 * @returns A new array where each point keeps its original timestamp `t`,
 *          `p` is the Kalman-filtered price, and `raw` is the original price.
 */
export function smoothPrices(
  history: Array<{ t: number; p: number }>,
  processNoise: number = 0.001,
  measurementNoise?: number,
): Array<{ t: number; p: number; raw: number }> {
  if (history.length === 0) return [];

  const r =
    measurementNoise !== undefined
      ? measurementNoise
      : adaptiveMeasurementNoise(history);

  const firstPoint = history[0]!;
  const kf = new KalmanFilter(firstPoint.p, processNoise, r);

  return history.map((pt) => {
    const filtered = kf.update(pt.p);
    return { t: pt.t, p: filtered, raw: pt.p };
  });
}
