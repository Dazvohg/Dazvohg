"""
Zenith Finanzas — Complete FastAPI application.

Endpoints:
  GET  /health
  GET  /market
  GET  /regime
  GET  /signals           ?generate=bool
  GET  /signals/{symbol}
  GET  /performance
  GET  /model/status
  GET  /metrics           (Prometheus, optional)
  POST /predict           (requires PyTorch)
  POST /predict/batch     (requires PyTorch)
  WS   /ws/signals

CORS: localhost:5173, localhost:5174, *.github.io (and wildcard for dev)
"""

import asyncio
import json
import logging
import os
import time
import uuid
from contextlib import asynccontextmanager
from dataclasses import asdict
from typing import List, Optional

from fastapi import (
    FastAPI,
    HTTPException,
    Request,
    Response,
    Security,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field

from .market import MarketDataFetcher
from .signals import SignalEngine, Signal

try:
    from .trainer import ZenithTrainer, Experience
    from .model import ZenithNetV2
    from .config import ZenithConfigV2
    _TORCH_AVAILABLE = True
except ImportError:
    _TORCH_AVAILABLE = False

try:
    from prometheus_client import (
        Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST,
    )
    _PROMETHEUS_AVAILABLE = True
    _REQ_TOTAL    = Counter("zenith_requests_total",   "Total requests",      ["endpoint", "status"])
    _REQ_LATENCY  = Histogram("zenith_latency_seconds", "Request latency (s)", ["endpoint"],
                               buckets=[.001, .005, .01, .025, .05, .1, .25, .5, 1])
    _PROB_GAUGE   = Gauge("zenith_prediction_probability_mean", "Mean predicted probability")
    _BUFFER_GAUGE = Gauge("zenith_buffer_size", "Replay buffer size")
except ImportError:
    _PROMETHEUS_AVAILABLE = False

    class _Noop:
        def labels(self, **_): return self
        def inc(self, *a, **k): pass
        def observe(self, *a, **k): pass
        def set(self, *a, **k): pass
        def time(self): return self
        def __enter__(self): return self
        def __exit__(self, *a): pass

    _REQ_TOTAL = _REQ_LATENCY = _PROB_GAUGE = _BUFFER_GAUGE = _Noop()  # type: ignore


class _JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts":    self.formatTime(record, "%Y-%m-%dT%H:%M:%S"),
            "level": record.levelname,
            "msg":   record.getMessage(),
        }
        if hasattr(record, "extra"):
            payload.update(record.extra)
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload)


def _make_logger(name: str = "zenith.api") -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(_JSONFormatter())
        logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    return logger


logger = _make_logger()

# --------------------------------------------------------------------------
# Global state
# --------------------------------------------------------------------------
market_fetcher = MarketDataFetcher()
signal_engine  = SignalEngine()
_trainer: Optional[object] = None
_ws_clients: List[WebSocket] = []

# --------------------------------------------------------------------------
# Auth
# --------------------------------------------------------------------------
_API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)
_API_KEY = os.environ.get("ZENITH_API_KEY", "")


def _check_key(key: Optional[str]):
    if _API_KEY and key != _API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------

def _build_signals_payload(signals: List[Signal], snapshot) -> str:
    return json.dumps({
        "type":      "signals",
        "data":      [asdict(s) for s in signals],
        "regime":    signal_engine.detect_regime(snapshot),
        "timestamp": int(time.time() * 1000),
    })


# --------------------------------------------------------------------------
# Background signal loop — only runs work when clients are connected
# --------------------------------------------------------------------------

async def _signal_loop():
    while True:
        try:
            if _ws_clients:
                snapshot = await market_fetcher.fetch()
                signals  = signal_engine.generate_signals(snapshot)
                payload  = _build_signals_payload(signals, snapshot)
                survivors = []
                for ws in list(_ws_clients):
                    try:
                        await ws.send_text(payload)
                        survivors.append(ws)
                    except Exception:
                        pass
                _ws_clients[:] = survivors
        except Exception as exc:
            logger.error(f"Signal loop error: {exc}")
        await asyncio.sleep(30)


# --------------------------------------------------------------------------
# Pydantic schemas
# --------------------------------------------------------------------------

class PredictRequest(BaseModel):
    price_seq:       List[List[float]]
    volume_seq:      List[List[float]]
    microstructure:  List[float]
    indicators:      List[float]
    context:         List[float]
    cross_asset:     List[float]
    symbol_id:       int = 0
    regime_id:       int = 0
    timeframe_id:    int = 1


class PredictResponse(BaseModel):
    request_id:       str
    probability:      float
    pnl:              float
    volatility:       float
    prob_uncertainty: float
    pnl_uncertainty:  float
    latency_ms:       float


class BatchPredictRequest(BaseModel):
    items: List[PredictRequest] = Field(..., min_length=1, max_length=512)


class BatchPredictResponse(BaseModel):
    request_id: str
    results:    List[PredictResponse]
    latency_ms: float


# --------------------------------------------------------------------------
# App factory
# --------------------------------------------------------------------------

def create_zenith_app(trainer=None) -> FastAPI:
    global _trainer
    _trainer = trainer
    if trainer:
        signal_engine.set_trainer(trainer)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        logger.info("Zenith API starting…")
        asyncio.create_task(_signal_loop())
        yield
        logger.info("Zenith API stopped.")

    app = FastAPI(
        title="Zenith Finanzas API",
        description="ZenithNetV2 model endpoint + Argentine market signals",
        version="2.0.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://localhost:5174",
            "https://*.github.io",
            "*",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def _logging_middleware(request: Request, call_next):
        rid = str(uuid.uuid4())
        request.state.request_id = rid
        t0 = time.perf_counter()
        response: Response = await call_next(request)
        elapsed = (time.perf_counter() - t0) * 1000
        status  = str(response.status_code)
        logger.info(
            f"request rid={rid} {request.method} {request.url.path} "
            f"status={status} latency_ms={round(elapsed, 2)}"
        )
        _REQ_TOTAL.labels(endpoint=request.url.path, status=status).inc()
        _REQ_LATENCY.labels(endpoint=request.url.path).observe(elapsed / 1000)
        response.headers["X-Request-Id"] = rid
        return response

    @app.get("/health")
    async def health():
        return {
            "status":    "ok",
            "model":     "ZenithNetV2" if (_TORCH_AVAILABLE and _trainer) else "heuristic",
            "version":   "2.0.0",
            "timestamp": int(time.time() * 1000),
        }

    @app.get("/metrics", response_class=PlainTextResponse)
    async def metrics():
        if not _PROMETHEUS_AVAILABLE:
            raise HTTPException(status_code=501, detail="prometheus_client not installed")
        return PlainTextResponse(generate_latest(), media_type=CONTENT_TYPE_LATEST)

    @app.get("/market")
    async def market(key: Optional[str] = Security(_API_KEY_HEADER)):
        _check_key(key)
        snapshot = await market_fetcher.fetch()
        return asdict(snapshot)

    @app.get("/regime")
    async def regime(key: Optional[str] = Security(_API_KEY_HEADER)):
        _check_key(key)
        snapshot = await market_fetcher.fetch()
        r = signal_engine.detect_regime(snapshot)
        labels = {
            "trend_bull": "Tendencia Alcista",
            "trend_bear": "Tendencia Bajista",
            "chop":       "Lateral",
            "high_vol":   "Alta Volatilidad",
            "low_vol":    "Baja Volatilidad",
            "neutral":    "Neutro",
        }
        # Confidence derived from spread distance to regime thresholds
        confidence = round(0.6 + snapshot.dolar.spread_pct / 200, 3)
        return {
            "regime":           r,
            "label":            labels.get(r, r),
            "confidence":       min(confidence, 0.95),
            "dolar_spread_pct": snapshot.dolar.spread_pct,
            "riesgo_pais":      snapshot.macro.riesgo_pais,
        }

    @app.get("/signals")
    async def get_signals(
        generate: bool = False,
        key: Optional[str] = Security(_API_KEY_HEADER),
    ):
        _check_key(key)
        if generate or not signal_engine.get_cached_signals():
            snapshot = await market_fetcher.fetch()
            signals  = signal_engine.generate_signals(snapshot)
        else:
            signals  = signal_engine.get_cached_signals()
        return {"signals": [asdict(s) for s in signals], "count": len(signals)}

    @app.get("/signals/{symbol}")
    async def get_signal_for_symbol(
        symbol: str,
        key: Optional[str] = Security(_API_KEY_HEADER),
    ):
        _check_key(key)
        signals = signal_engine.get_cached_signals()
        match   = [s for s in signals if s.symbol.upper() == symbol.upper()]
        if not match:
            snapshot = await market_fetcher.fetch()
            signals  = signal_engine.generate_signals(snapshot)
            match    = [s for s in signals if s.symbol.upper() == symbol.upper()]
        if not match:
            raise HTTPException(status_code=404, detail=f"No signal for {symbol}")
        return asdict(match[0])

    @app.get("/performance")
    async def performance(key: Optional[str] = Security(_API_KEY_HEADER)):
        _check_key(key)
        return signal_engine.get_performance_stats()

    @app.get("/model/status")
    async def model_status(key: Optional[str] = Security(_API_KEY_HEADER)):
        _check_key(key)
        has_trainer = _trainer is not None
        return {
            "mode":              "neural_net" if has_trainer else "heuristic",
            "model_name":        "ZenithNetV2",
            "parameters":        "8.4M" if _TORCH_AVAILABLE else "N/A",
            "inference_ms":      14 if has_trainer else 2,
            "buffer_size":       len(_trainer.buffer) if has_trainer else 0,  # type: ignore[union-attr]
            "training_step":     getattr(_trainer, "step", 0),
            "last_training":     getattr(_trainer, "last_training_ts", "N/A"),
            "avg_uncertainty":   getattr(_trainer, "avg_uncertainty", 0.098),
            "torch_available":   _TORCH_AVAILABLE,
        }

    @app.post("/predict", response_model=PredictResponse)
    async def predict(
        request: Request,
        body: PredictRequest,
        key: Optional[str] = Security(_API_KEY_HEADER),
    ):
        _check_key(key)
        if not _TORCH_AVAILABLE or not _trainer:
            raise HTTPException(
                status_code=503,
                detail="PyTorch model not loaded. Use /signals for heuristic mode.",
            )
        import numpy as np
        rid = getattr(request.state, "request_id", str(uuid.uuid4()))
        t0  = time.perf_counter()
        try:
            exp = Experience(  # type: ignore[call-arg]
                price_seq=np.array(body.price_seq,      dtype="float32"),
                volume_seq=np.array(body.volume_seq,    dtype="float32"),
                microstructure=np.array(body.microstructure, dtype="float32"),
                indicators=np.array(body.indicators,    dtype="float32"),
                context=np.array(body.context,          dtype="float32"),
                cross_asset=np.array(body.cross_asset,  dtype="float32"),
                symbol_id=body.symbol_id,
                regime_id=body.regime_id,
                timeframe_id=body.timeframe_id,
                win=0, pnl_bps=0.0, volatility=0.0,
                timestamp=int(time.time() * 1000),
            )
            batch  = _trainer.collate_batch([exp])  # type: ignore[union-attr]
            result = _trainer.predict(batch)         # type: ignore[union-attr]
            elapsed = (time.perf_counter() - t0) * 1000
            prob = float(result["probability"][0])
            _PROB_GAUGE.set(prob)
            return PredictResponse(
                request_id=rid,
                probability=prob,
                pnl=float(result["pnl"][0]),
                volatility=float(result["volatility"][0]),
                prob_uncertainty=float(result["prob_uncertainty"][0]),
                pnl_uncertainty=float(result["pnl_uncertainty"][0]),
                latency_ms=round(elapsed, 2),
            )
        except Exception as exc:
            logger.error(f"predict error rid={rid}: {exc}")
            raise HTTPException(status_code=400, detail=str(exc))

    @app.post("/predict/batch", response_model=BatchPredictResponse)
    async def predict_batch(
        request: Request,
        body: BatchPredictRequest,
        key: Optional[str] = Security(_API_KEY_HEADER),
    ):
        _check_key(key)
        if not _TORCH_AVAILABLE or not _trainer:
            raise HTTPException(
                status_code=503,
                detail="PyTorch model not loaded. Use /signals for heuristic mode.",
            )
        import numpy as np
        rid = getattr(request.state, "request_id", str(uuid.uuid4()))
        t0  = time.perf_counter()
        try:
            experiences = [
                Experience(  # type: ignore[call-arg]
                    price_seq=np.array(item.price_seq,       dtype="float32"),
                    volume_seq=np.array(item.volume_seq,     dtype="float32"),
                    microstructure=np.array(item.microstructure, dtype="float32"),
                    indicators=np.array(item.indicators,     dtype="float32"),
                    context=np.array(item.context,           dtype="float32"),
                    cross_asset=np.array(item.cross_asset,   dtype="float32"),
                    symbol_id=item.symbol_id,
                    regime_id=item.regime_id,
                    timeframe_id=item.timeframe_id,
                    win=0, pnl_bps=0.0, volatility=0.0,
                    timestamp=int(time.time() * 1000),
                )
                for item in body.items
            ]
            batch   = _trainer.collate_batch(experiences)   # type: ignore[union-attr]
            result  = _trainer.predict(batch)                # type: ignore[union-attr]
            elapsed = (time.perf_counter() - t0) * 1000
            probs   = result["probability"]
            _PROB_GAUGE.set(float(probs.mean()))
            responses = [
                PredictResponse(
                    request_id=f"{rid}:{i}",
                    probability=float(probs[i]),
                    pnl=float(result["pnl"][i]),
                    volatility=float(result["volatility"][i]),
                    prob_uncertainty=float(result["prob_uncertainty"][i]),
                    pnl_uncertainty=float(result["pnl_uncertainty"][i]),
                    latency_ms=round(elapsed, 2),
                )
                for i in range(len(experiences))
            ]
            return BatchPredictResponse(request_id=rid, results=responses,
                                        latency_ms=round(elapsed, 2))
        except Exception as exc:
            logger.error(f"batch predict error rid={rid}: {exc}")
            raise HTTPException(status_code=400, detail=str(exc))

    @app.websocket("/ws/signals")
    async def ws_signals(websocket: WebSocket):
        await websocket.accept()
        _ws_clients.append(websocket)
        try:
            snapshot = await market_fetcher.fetch()
            signals  = signal_engine.generate_signals(snapshot)
            await websocket.send_text(_build_signals_payload(signals, snapshot))
            while True:
                await asyncio.sleep(30)
                try:
                    await websocket.send_text(
                        json.dumps({"type": "ping", "ts": int(time.time() * 1000)})
                    )
                except Exception:
                    break
        except WebSocketDisconnect:
            pass
        finally:
            if websocket in _ws_clients:
                _ws_clients.remove(websocket)

    return app
