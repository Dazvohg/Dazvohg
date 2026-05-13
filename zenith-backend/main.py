"""
Entry point for the Zenith Finanzas API server.

Usage:
    python main.py

Environment variables (see .env.example):
    ZENITH_API_KEY    — leave empty for open access in dev
    ZENITH_CHECKPOINT — path to a .pt checkpoint file (optional)
    HOST              — bind address (default 0.0.0.0)
    PORT              — port number  (default 8000)
    RELOAD            — hot-reload for development (default false)
"""

import os

import uvicorn

from zenith import create_zenith_app

# --------------------------------------------------------------------------
# Optionally load a ZenithNetV2 checkpoint
# --------------------------------------------------------------------------
_trainer = None
checkpoint = os.environ.get("ZENITH_CHECKPOINT", "")

if checkpoint and os.path.exists(checkpoint):
    try:
        import torch
        from zenith.config import ZenithConfigV2
        from zenith.model import ZenithNetV2
        from zenith.trainer import ZenithTrainer

        config  = ZenithConfigV2()
        model   = ZenithNetV2(config)
        device  = "cuda" if torch.cuda.is_available() else "cpu"
        _trainer = ZenithTrainer(model, config, device)
        _trainer.load_checkpoint(checkpoint)
        print(f"[zenith] Loaded ZenithNetV2 checkpoint from {checkpoint} (device={device})")
    except Exception as exc:
        print(f"[zenith] Warning: could not load checkpoint: {exc}. Running in heuristic mode.")
else:
    if checkpoint:
        print(f"[zenith] Checkpoint path '{checkpoint}' not found. Running in heuristic mode.")
    else:
        print("[zenith] No checkpoint configured. Running in heuristic mode.")

# --------------------------------------------------------------------------
# Build app
# --------------------------------------------------------------------------
app = create_zenith_app(trainer=_trainer)

# --------------------------------------------------------------------------
# Serve
# --------------------------------------------------------------------------
if __name__ == "__main__":
    uvicorn.run(
        app,
        host=os.environ.get("HOST", "0.0.0.0"),
        port=int(os.environ.get("PORT", "8000")),
        reload=os.environ.get("RELOAD", "false").lower() == "true",
    )
