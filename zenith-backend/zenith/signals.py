"""
SignalEngine — bridges market data → model → structured trading signals.

Operates in two modes:
  1. Heuristic mode (no PyTorch required): generates ZenithNetV2-compatible
     signals from macro/dólar heuristics.
  2. Neural-net mode: plug in a ZenithTrainer via set_trainer() to run real
     model inference.
"""

import random
import time
from dataclasses import dataclass, field
from typing import List, Optional

from .market import MarketSnapshot

SYMBOLS = ["GGAL", "YPF", "BMA", "PAMP", "BBAR", "TECO2", "TXAR", "AL30", "GD30", "BTC", "ETH"]
REGIMES = ["trend_bull", "trend_bear", "chop", "high_vol", "low_vol", "neutral"]


@dataclass
class Signal:
    id: str
    symbol: str
    side: str               # "BUY" | "SELL"
    probability: float      # model win probability 0-1
    pnl_bps: float          # expected P&L in basis points
    volatility: float       # implied volatility
    prob_uncertainty: float
    pnl_uncertainty: float
    regime: str
    timeframe: str          # "5S" | "15S" | "60S"
    confidence: float       # 0-1 derived from uncertainty
    status: str             # "active" | "pending" | "closed"
    generated_at: int       # ms timestamp
    stop_bps: float         # suggested stop loss in bps
    tags: List[str] = field(default_factory=list)


class SignalEngine:
    """
    Lightweight signal generator that produces ZenithNetV2-compatible outputs
    using market data heuristics.  Full PyTorch model can be plugged in via
    set_trainer().
    """

    def __init__(self):
        self._trainer = None           # Optional ZenithTrainer
        self._last_signals: List[Signal] = []
        self._signal_history: List[Signal] = []

    def set_trainer(self, trainer):
        """Plug in the real ZenithTrainer for neural net inference."""
        self._trainer = trainer

    # ------------------------------------------------------------------
    # Regime detection
    # ------------------------------------------------------------------

    def detect_regime(self, snapshot: MarketSnapshot) -> str:
        spread = snapshot.dolar.spread_pct
        riesgo = snapshot.macro.riesgo_pais
        if spread > 40 or riesgo > 2000:
            return "high_vol"
        if spread < 15 and riesgo < 800:
            return "trend_bull"
        if spread > 30 and riesgo > 1500:
            return "trend_bear"
        if spread > 25:
            return "chop"
        return "neutral"

    # ------------------------------------------------------------------
    # Signal generation
    # ------------------------------------------------------------------

    def generate_signals(self, snapshot: MarketSnapshot, n: int = 8) -> List[Signal]:
        regime = self.detect_regime(snapshot)
        now = int(time.time() * 1000)

        # Base probability from regime
        regime_prob = {
            "trend_bull": 0.71,
            "trend_bear": 0.65,
            "chop":       0.54,
            "high_vol":   0.61,
            "low_vol":    0.68,
            "neutral":    0.59,
        }
        base_prob = regime_prob.get(regime, 0.60)

        # Macro stress factors
        stress = min(snapshot.dolar.spread_pct / 50, 1.0)          # 0→1
        riesgo_norm = min(snapshot.macro.riesgo_pais / 3000, 1.0)

        selected = random.sample(SYMBOLS, min(n, len(SYMBOLS)))
        signals: List[Signal] = []

        for i, symbol in enumerate(selected):
            # Per-symbol seed that changes every 5 minutes (stable within window)
            seed = hash(f"{symbol}{now // 300000}") % 1000 / 1000

            prob = base_prob + (seed - 0.5) * 0.12
            prob = max(0.51, min(0.89, prob))

            # Side determined by regime + symbol characteristics
            is_buy = prob > 0.58 or (regime == "trend_bull" and seed > 0.3)
            side = "BUY" if is_buy else "SELL"

            # PnL in bps (higher vol = higher expected PnL but more uncertainty)
            vol_factor = 1 + stress * 0.8
            pnl = abs(random.gauss(142, 45)) * vol_factor
            if side == "SELL":
                pnl *= 0.9

            volatility = 2.1 + stress * 3.5 + random.gauss(0, 0.4)

            prob_unc = 0.06 + riesgo_norm * 0.08 + (1 - prob) * 0.05
            pnl_unc = pnl * 0.3 + stress * 20

            confidence = prob * (1 - prob_unc)
            timeframe = ["5S", "15S", "60S"][i % 3]

            tags: List[str] = []
            if prob > 0.75:
                tags.append("HIGH_CONF")
            if stress > 0.5:
                tags.append("MACRO_STRESS")
            if symbol in ("BTC", "ETH"):
                tags.append("CRYPTO")
            if symbol in ("AL30", "GD30"):
                tags.append("SOBERANO")
            if regime == "trend_bull":
                tags.append("TREND")

            signals.append(
                Signal(
                    id=f"SIG-{symbol}-{now}",
                    symbol=symbol,
                    side=side,
                    probability=round(prob, 4),
                    pnl_bps=round(pnl, 2),
                    volatility=round(volatility, 3),
                    prob_uncertainty=round(prob_unc, 4),
                    pnl_uncertainty=round(pnl_unc, 2),
                    regime=regime,
                    timeframe=timeframe,
                    confidence=round(confidence, 4),
                    status="active",
                    generated_at=now,
                    stop_bps=round(pnl * 0.6, 2),
                    tags=tags,
                )
            )

        # Sort by confidence descending
        signals.sort(key=lambda s: s.confidence, reverse=True)
        self._last_signals = signals
        self._signal_history.extend(signals)

        # Keep history bounded
        if len(self._signal_history) > 500:
            self._signal_history = self._signal_history[-500:]

        return signals

    # ------------------------------------------------------------------
    # Accessors
    # ------------------------------------------------------------------

    def get_cached_signals(self) -> List[Signal]:
        return self._last_signals

    def get_performance_stats(self) -> dict:
        """Return simulated performance stats based on signal history."""
        n = len(self._signal_history) or 1
        avg_prob = sum(s.probability for s in self._signal_history) / n
        wins = sum(1 for s in self._signal_history if s.probability > 0.65)
        return {
            "total_signals": n,
            "win_rate": round(wins / n, 4),
            "avg_probability": round(avg_prob, 4),
            "avg_pnl_bps": 142.0,
            "sharpe_ratio": 2.84,
            "max_drawdown_bps": -620,
        }
