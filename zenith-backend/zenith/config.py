"""
ZenithConfigV2 — extracted from MIPROYECTO
"""

from dataclasses import dataclass


@dataclass
class ZenithConfigV2:
    # Model architecture
    price_features: int = 15
    volume_features: int = 10
    microstructure_features: int = 25
    indicator_features: int = 12
    context_features: int = 12
    cross_asset_features: int = 8

    hidden_dim: int = 256
    n_transformer_layers: int = 4
    n_attention_heads: int = 8
    n_regimes: int = 6  # trend_bull, trend_bear, chop, highvol, lowvol, neutral
    n_symbols: int = 20
    n_timeframes: int = 3  # 5s, 15s, 60s

    dropout: float = 0.15
    max_seq_len: int = 256

    # Training
    batch_size: int = 128
    learning_rate: float = 1e-4
    weight_decay: float = 1e-4
    gradient_clip: float = 2.0

    # Data
    buffer_size: int = 100_000
    min_samples_train: int = 5000
    train_every_steps: int = 500

    # Uncertainty weighting
    use_uncertainty_weighting: bool = True

    # Curriculum learning
    use_curriculum: bool = True
    curriculum_stages: int = 3
