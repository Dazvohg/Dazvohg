"""
Argentine market data fetcher.
Pulls live dólar rates and macro data from public APIs with a 5-minute cache.
"""

import asyncio
import time
from dataclasses import dataclass
from typing import Optional

import httpx

DOLAR_API = "https://dolarapi.com/v1/dolares"
ARGENTINA_API = "https://api.argentinadatos.com/v1"


@dataclass
class DolarRates:
    blue: float
    oficial: float
    mep: float
    ccl: float
    crypto: float
    spread_pct: float  # (blue - oficial) / oficial * 100


@dataclass
class MacroData:
    inflation_monthly: float
    inflation_annual: float
    riesgo_pais: int
    plazo_fijo_rate: float


@dataclass
class MarketSnapshot:
    dolar: DolarRates
    macro: MacroData
    timestamp: int
    # Synthetic instrument prices (based on real macro signals)
    prices: dict  # symbol -> price


class MarketDataFetcher:
    def __init__(self):
        self._cache: Optional[MarketSnapshot] = None
        self._cache_ts: float = 0
        self._ttl: float = 300  # 5 minutes

    async def fetch(self) -> MarketSnapshot:
        now = time.time()
        if self._cache and (now - self._cache_ts) < self._ttl:
            return self._cache

        async with httpx.AsyncClient(timeout=10) as client:
            results = await asyncio.gather(
                client.get(DOLAR_API),
                client.get(f"{ARGENTINA_API}/finanzas/tasas/plazoFijo"),
                client.get(f"{ARGENTINA_API}/finanzas/indices/riesgosPais"),
                return_exceptions=True,
            )

        # Parse dolar rates - find blue, oficial, mep, ccl, cripto
        dolar = self._parse_dolar(results[0])
        plazo = self._parse_plazo_fijo(results[1])
        riesgo = self._parse_riesgo_pais(results[2])

        macro = MacroData(
            inflation_monthly=4.2,   # fallback — no free real-time endpoint
            inflation_annual=211.4,
            riesgo_pais=riesgo,
            plazo_fijo_rate=plazo,
        )

        prices = self._synthetic_prices(dolar, macro)

        snapshot = MarketSnapshot(
            dolar=dolar,
            macro=macro,
            timestamp=int(now * 1000),
            prices=prices,
        )
        self._cache = snapshot
        self._cache_ts = now
        return snapshot

    # ------------------------------------------------------------------
    # Parsers
    # ------------------------------------------------------------------

    def _parse_dolar(self, response) -> DolarRates:
        fallback = DolarRates(
            blue=1250, oficial=980, mep=1180, ccl=1220, crypto=1260, spread_pct=27.5
        )
        if isinstance(response, Exception):
            return fallback
        try:
            data = response.json()
            rates = {d["casa"]: d["venta"] for d in data if d.get("venta")}
            blue = float(rates.get("blue", 1250))
            oficial = float(rates.get("oficial", 980))
            mep = float(rates.get("bolsa", 1180))
            ccl = float(rates.get("contadoconliqui", 1220))
            crypto = float(rates.get("cripto", 1260))
            spread = (blue - oficial) / oficial * 100
            return DolarRates(
                blue=blue,
                oficial=oficial,
                mep=mep,
                ccl=ccl,
                crypto=crypto,
                spread_pct=round(spread, 2),
            )
        except Exception:
            return fallback

    def _parse_plazo_fijo(self, response) -> float:
        if isinstance(response, Exception):
            return 118.0
        try:
            data = response.json()
            if isinstance(data, list) and data:
                return float(data[-1].get("valor", 118.0))
            return float(data.get("valor", 118.0))
        except Exception:
            return 118.0

    def _parse_riesgo_pais(self, response) -> int:
        if isinstance(response, Exception):
            return 1450
        try:
            data = response.json()
            if isinstance(data, list) and data:
                return int(data[-1].get("valor", 1450))
            return int(data.get("valor", 1450))
        except Exception:
            return 1450

    # ------------------------------------------------------------------
    # Synthetic MERVAL-correlated prices
    # ------------------------------------------------------------------

    def _synthetic_prices(self, dolar: DolarRates, macro: MacroData) -> dict:
        """
        Base prices anchored to real Argentine market levels.
        Scale with dólar blue as proxy for macro stress.
        """
        stress = dolar.spread_pct / 100   # e.g. 0.275 = moderate stress
        merval_base = 1_800_000
        adj = 1 + (stress - 0.25) * 0.5   # adjust around 25 % spread baseline
        return {
            "MERVAL": round(merval_base * adj),
            "GGAL":   round(4850 * adj, 2),
            "YPF":    round(18200 * adj, 2),
            "BMA":    round(6100 * adj, 2),
            "PAMP":   round(3280 * adj, 2),
            "BBAR":   round(7450 * adj, 2),
            "TECO2":  round(2190 * adj, 2),
            "TXAR":   round(980 * adj, 2),
            "AL30":   round(68.5 * adj, 2),
            "GD30":   round(72.1 * adj, 2),
            "BTC":    55000 + int(stress * 5000),
            "ETH":    2900 + int(stress * 300),
        }
