"""
ZenithTrainer, PrioritizedReplayBuffer, Experience.
Extracted from MIPROYECTO.
"""

import time
from collections import deque
from dataclasses import dataclass, field
from typing import Dict, List, Tuple

import numpy as np
import torch
import torch.optim as optim

from .config import ZenithConfigV2
from .model import ZenithNetV2


# =============================================================================
# EXPERIENCE DATACLASS
# =============================================================================

@dataclass
class Experience:
    # Temporal features
    price_seq: np.ndarray      # [T, P]
    volume_seq: np.ndarray     # [T, V]

    # Static features
    microstructure: np.ndarray  # [M]
    indicators: np.ndarray      # [I]
    context: np.ndarray         # [C]
    cross_asset: np.ndarray     # [A]

    # IDs
    symbol_id: int
    regime_id: int
    timeframe_id: int

    # Labels
    win: int          # 0 o 1
    pnl_bps: float
    volatility: float

    # Metadata
    timestamp: int
    priority: float = 1.0   # Para prioritized replay


# =============================================================================
# PRIORITIZED REPLAY BUFFER
# =============================================================================

class PrioritizedReplayBuffer:
    """Buffer con muestreo prioritizado basado en TD-error"""

    def __init__(self, maxlen: int, alpha: float = 0.6, beta: float = 0.4):
        self.maxlen = maxlen
        self.alpha = alpha   # Priorización (0=uniform, 1=full priority)
        self.beta = beta     # Importance sampling correction
        self.buffer: deque = deque(maxlen=maxlen)
        self.priorities: deque = deque(maxlen=maxlen)

    def add(self, experience: Experience):
        """Añade experiencia con prioridad inicial máxima"""
        max_priority = max(self.priorities) if self.priorities else 1.0
        self.buffer.append(experience)
        self.priorities.append(max_priority)

    def sample(
        self,
        batch_size: int,
        recency_half_life_hours: float = 48.0,
    ) -> Tuple[List[Experience], np.ndarray, np.ndarray]:
        """
        Muestrea batch con prioridades + recency weighting.

        Returns:
            experiences: List de Experience
            indices: Array de índices muestreados
            weights: Importance sampling weights
        """
        if len(self.buffer) == 0:
            return [], np.array([]), np.array([])

        # Combinar prioridad con recency
        now = int(time.time() * 1000)
        priorities = np.array(self.priorities, dtype=np.float32)

        # Recency decay
        ages_hours = np.array(
            [(now - exp.timestamp) / 3600000.0 for exp in self.buffer]
        )
        recency_weights = 0.5 ** (ages_hours / recency_half_life_hours)

        # Combined priorities
        combined = priorities ** self.alpha * recency_weights
        probs = combined / combined.sum()

        # Sample
        indices = np.random.choice(
            len(self.buffer),
            size=min(batch_size, len(self.buffer)),
            replace=False,
            p=probs,
        )

        # Importance sampling weights
        weights = (len(self.buffer) * probs[indices]) ** (-self.beta)
        weights = weights / weights.max()   # Normalize

        experiences = [self.buffer[i] for i in indices]
        return experiences, indices, weights

    def update_priorities(self, indices: np.ndarray, priorities: np.ndarray):
        """Actualiza prioridades después del training"""
        for idx, priority in zip(indices, priorities):
            self.priorities[idx] = float(priority)

    def __len__(self):
        return len(self.buffer)


# =============================================================================
# TRAINING PIPELINE
# =============================================================================

class ZenithTrainer:
    """Pipeline de entrenamiento con curriculum learning y advanced techniques"""

    def __init__(self, model: ZenithNetV2, config: ZenithConfigV2, device: str = "cpu"):
        self.model = model.to(device)
        self.config = config
        self.device = device

        self.optimizer = optim.AdamW(
            model.parameters(),
            lr=config.learning_rate,
            weight_decay=config.weight_decay,
        )

        self.scheduler = optim.lr_scheduler.CosineAnnealingWarmRestarts(
            self.optimizer, T_0=1000, T_mult=2
        )

        self.buffer = PrioritizedReplayBuffer(maxlen=config.buffer_size)

        self.step = 0
        self.curriculum_stage = 0

    # ------------------------------------------------------------------
    # Public helpers
    # ------------------------------------------------------------------

    def add_experience(self, exp: Experience):
        """Añade experiencia al buffer"""
        self.buffer.add(exp)

    def get_curriculum_threshold(self) -> float:
        """Retorna threshold de dificultad según curriculum stage"""
        if not self.config.use_curriculum:
            return 0.0   # Todos los ejemplos

        total_steps = self.config.train_every_steps * 100
        stage = min(
            self.step / (total_steps / self.config.curriculum_stages),
            self.config.curriculum_stages - 1,
        )

        # Stage 0: Solo ejemplos claros (prob > 0.8)
        # Stage 1: Moderados (prob > 0.6)
        # Stage 2+: Todos
        thresholds = [0.8, 0.6, 0.0]
        return thresholds[int(stage)]

    def collate_batch(self, experiences: List[Experience]) -> Dict[str, torch.Tensor]:
        """Convierte lista de Experience a batch de tensores"""
        max_len = max(exp.price_seq.shape[0] for exp in experiences)

        batch: Dict = {
            "price_features": [],
            "volume_features": [],
            "microstructure_features": [],
            "indicator_features": [],
            "context_features": [],
            "cross_asset_features": [],
            "symbol_ids": [],
            "regime_ids": [],
            "timeframe_ids": [],
            "mask": [],
            "targets": {
                "win": [],
                "pnl": [],
                "volatility": [],
            },
        }

        for exp in experiences:
            T = exp.price_seq.shape[0]
            price_padded = np.pad(exp.price_seq, ((0, max_len - T), (0, 0)), mode="constant")
            volume_padded = np.pad(exp.volume_seq, ((0, max_len - T), (0, 0)), mode="constant")
            mask = np.array([1] * T + [0] * (max_len - T))

            batch["price_features"].append(price_padded)
            batch["volume_features"].append(volume_padded)
            batch["microstructure_features"].append(exp.microstructure)
            batch["indicator_features"].append(exp.indicators)
            batch["context_features"].append(exp.context)
            batch["cross_asset_features"].append(exp.cross_asset)
            batch["symbol_ids"].append(exp.symbol_id)
            batch["regime_ids"].append(exp.regime_id)
            batch["timeframe_ids"].append(exp.timeframe_id)
            batch["mask"].append(mask)
            batch["targets"]["win"].append(exp.win)
            batch["targets"]["pnl"].append(exp.pnl_bps)
            batch["targets"]["volatility"].append(exp.volatility)

        # Convert to tensors
        for key in batch:
            if key == "targets":
                for target_key in batch["targets"]:
                    batch["targets"][target_key] = torch.tensor(
                        batch["targets"][target_key],
                        dtype=torch.float32,
                        device=self.device,
                    )
            elif isinstance(batch[key], list):
                if key in ("symbol_ids", "regime_ids", "timeframe_ids"):
                    batch[key] = torch.tensor(batch[key], dtype=torch.long, device=self.device)
                else:
                    batch[key] = torch.tensor(
                        np.stack(batch[key]), dtype=torch.float32, device=self.device
                    )

        return batch

    def train_step(self) -> Dict[str, float]:
        """Ejecuta un paso de entrenamiento"""
        if len(self.buffer) < self.config.min_samples_train:
            return {"status": "insufficient_data", "buffer_size": len(self.buffer)}

        experiences, indices, importance_weights = self.buffer.sample(
            self.config.batch_size,
            recency_half_life_hours=48.0,
        )

        if not experiences:
            return {"status": "no_experiences"}

        batch = self.collate_batch(experiences)
        importance_weights = torch.tensor(
            importance_weights, dtype=torch.float32, device=self.device
        )

        # Forward pass
        self.model.train()
        output = self.model(
            price_features=batch["price_features"],
            volume_features=batch["volume_features"],
            microstructure_features=batch["microstructure_features"],
            indicator_features=batch["indicator_features"],
            context_features=batch["context_features"],
            cross_asset_features=batch["cross_asset_features"],
            symbol_ids=batch["symbol_ids"],
            regime_ids=batch["regime_ids"],
            timeframe_ids=batch["timeframe_ids"],
            mask=batch["mask"],
        )

        # Compute loss
        total_loss, loss_dict = self.model.multi_task_head.compute_loss(
            output["predictions"],
            batch["targets"],
            importance_weights,
        )

        # Backward pass
        self.optimizer.zero_grad()
        total_loss.backward()
        torch.nn.utils.clip_grad_norm_(self.model.parameters(), self.config.gradient_clip)
        self.optimizer.step()
        self.scheduler.step()

        # Update priorities
        with torch.no_grad():
            prob_mean, _ = output["predictions"]["probability"]
            prob_pred = torch.sigmoid(prob_mean.squeeze(-1))
            errors = torch.abs(prob_pred - batch["targets"]["win"])
            new_priorities = errors.cpu().numpy() + 1e-6
            self.buffer.update_priorities(indices, new_priorities)

        self.step += 1

        metrics = {
            "step": self.step,
            "loss_total": total_loss.item(),
            "loss_prob": loss_dict["prob"].item(),
            "loss_pnl": loss_dict["pnl"].item(),
            "loss_vol": loss_dict["vol"].item(),
            "lr": self.optimizer.param_groups[0]["lr"],
            "buffer_size": len(self.buffer),
        }

        if self.config.use_uncertainty_weighting:
            metrics.update(
                {
                    "weight_prob": loss_dict["weight_prob"],
                    "weight_pnl": loss_dict["weight_pnl"],
                    "weight_vol": loss_dict["weight_vol"],
                }
            )

        return metrics

    @torch.no_grad()
    def predict(self, batch: Dict[str, torch.Tensor]) -> Dict[str, np.ndarray]:
        """Inferencia en batch"""
        self.model.eval()

        output = self.model(
            price_features=batch["price_features"],
            volume_features=batch["volume_features"],
            microstructure_features=batch["microstructure_features"],
            indicator_features=batch["indicator_features"],
            context_features=batch["context_features"],
            cross_asset_features=batch["cross_asset_features"],
            symbol_ids=batch["symbol_ids"],
            regime_ids=batch["regime_ids"],
            timeframe_ids=batch["timeframe_ids"],
            mask=batch.get("mask"),
        )

        prob = self.model.predict_proba(output).cpu().numpy()
        pnl_mean, _ = output["predictions"]["pnl"]
        vol_mean, _ = output["predictions"]["volatility"]

        prob_uncertainty = self.model.get_uncertainty(output, "probability").cpu().numpy()
        pnl_uncertainty = self.model.get_uncertainty(output, "pnl").cpu().numpy()

        return {
            "probability": prob,
            "pnl": pnl_mean.squeeze(-1).cpu().numpy(),
            "volatility": vol_mean.squeeze(-1).cpu().numpy(),
            "prob_uncertainty": prob_uncertainty,
            "pnl_uncertainty": pnl_uncertainty,
        }

    def save_checkpoint(self, path: str):
        """Guarda modelo y optimizer state"""
        torch.save(
            {
                "model_state_dict": self.model.state_dict(),
                "optimizer_state_dict": self.optimizer.state_dict(),
                "scheduler_state_dict": self.scheduler.state_dict(),
                "step": self.step,
                "config": self.config,
            },
            path,
        )

    def load_checkpoint(self, path: str):
        """Carga modelo y optimizer state"""
        checkpoint = torch.load(path, map_location=self.device)
        self.model.load_state_dict(checkpoint["model_state_dict"])
        self.optimizer.load_state_dict(checkpoint["optimizer_state_dict"])
        self.scheduler.load_state_dict(checkpoint["scheduler_state_dict"])
        self.step = checkpoint["step"]
