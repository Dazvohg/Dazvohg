"""
Buscador de datos de mercado argentino.
Consume dolarapi.com y argentinadatos.com con caché de 5 minutos.
"""

import asyncio
import time
from dataclasses import dataclass
from typing import Optional

import httpx

DOLAR_API    = "https://dolarapi.com/v1/dolares"
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
    prices: dict  # symbol -> price sintético correlacionado con MERVAL


class MarketDataFetcher:
    def __init__(self):
        self._cache: Optional[MarketSnapshot] = None
        self._cache_ts: float = 0
        self._ttl: float = 300  # 5 minutos
        # Cliente persistente para reutilizar conexiones TCP/TLS
        self._client = httpx.AsyncClient(timeout=10)

    async def fetch(self) -> MarketSnapshot:
        now = time.time()
        if self._cache and (now - self._cache_ts) < self._ttl:
            return self._cache

        results = await asyncio.gather(
            self._client.get(DOLAR_API),
            self._client.get(f"{ARGENTINA_API}/finanzas/tasas/plazoFijo"),
            self._client.get(f"{ARGENTINA_API}/finanzas/indices/riesgosPais"),
            return_exceptions=True,
        )

        dolar  = self._parse_dolar(results[0])
        plazo  = self._parse_latest_valor(results[1], 118.0, float)
        riesgo = self._parse_latest_valor(results[2], 1450,  int)

        macro = MacroData(
            inflation_monthly=4.2,   # no existe endpoint gratuito en tiempo real
            inflation_annual=211.4,
            riesgo_pais=riesgo,
            plazo_fijo_rate=plazo,
        )

        snapshot = MarketSnapshot(
            dolar=dolar,
            macro=macro,
            timestamp=int(now * 1000),
            prices=self._synthetic_prices(dolar, macro),
        )
        self._cache    = snapshot
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
            data    = response.json()
            rates   = {d["casa"]: d["venta"] for d in data if d.get("venta")}
            blue    = float(rates.get("blue",             1250))
            oficial = float(rates.get("oficial",           980))
            mep     = float(rates.get("bolsa",            1180))
            ccl     = float(rates.get("contadoconliqui",  1220))
            crypto  = float(rates.get("cripto",           1260))
            spread  = (blue - oficial) / oficial * 100
            return DolarRates(blue=blue, oficial=oficial, mep=mep,
                              ccl=ccl, crypto=crypto, spread_pct=round(spread, 2))
        except Exception:
            return fallback

    def _parse_latest_valor(self, response, fallback, cast=float):
        """Extrae el campo 'valor' del último elemento de una lista o de un dict."""
        if isinstance(response, Exception):
            return cast(fallback)
        try:
            data = response.json()
            raw  = data[-1].get("valor", fallback) if isinstance(data, list) and data else data.get("valor", fallback)
            return cast(raw)
        except Exception:
            return cast(fallback)

    # ------------------------------------------------------------------
    # Precios sintéticos
    # ------------------------------------------------------------------

    def _synthetic_prices(self, dolar: DolarRates, macro: MacroData) -> dict:
        # No existe feed gratuito de precios MERVAL en tiempo real;
        # se escalan desde bases históricas usando el spread blue como proxy de estrés macro.
        stress = dolar.spread_pct / 100
        adj    = 1 + (stress - 0.25) * 0.5   # centrado en spread del 25 %
        return {
            "MERVAL": round(1_800_000 * adj),
            "GGAL":   round(4850  * adj, 2),
            "YPF":    round(18200 * adj, 2),
            "BMA":    round(6100  * adj, 2),
            "PAMP":   round(3280  * adj, 2),
            "BBAR":   round(7450  * adj, 2),
            "TECO2":  round(2190  * adj, 2),
            "TXAR":   round(980   * adj, 2),
            "AL30":   round(68.5  * adj, 2),
            "GD30":   round(72.1  * adj, 2),
            "BTC":    55000 + int(stress * 5000),
            "ETH":    2900  + int(stress * 300),
        }
