"""
ZenithNetV2 — Full neural network architecture.
Extracted from MIPROYECTO.

Includes:
  PositionalEncoding, MultiHeadSelfAttention, FeedForward, TransformerEncoderLayer
  DilatedConvBlock, MultiScaleCNN, DualStreamEncoder
  RegimeConditioning, UncertaintyHead, MultiTaskHead, ZenithNetV2
"""

import math
from typing import Dict, Optional, Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F

from .config import ZenithConfigV2


# =============================================================================
# COMPONENTES BASE: ATTENTION Y POSITIONAL ENCODING
# =============================================================================


class PositionalEncoding(nn.Module):
    """Codificación posicional sinusoidal para Transformers"""

    def __init__(self, d_model: int, max_len: int = 5000, dropout: float = 0.1):
        super().__init__()
        self.dropout = nn.Dropout(p=dropout)

        position = torch.arange(max_len).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2) * (-math.log(10000.0) / d_model))

        pe = torch.zeros(1, max_len, d_model)
        pe[0, :, 0::2] = torch.sin(position * div_term)
        pe[0, :, 1::2] = torch.cos(position * div_term)

        self.register_buffer('pe', pe)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """x: [B, T, D]"""
        x = x + self.pe[:, :x.size(1), :]
        return self.dropout(x)


class MultiHeadSelfAttention(nn.Module):
    """Multi-head self-attention con residual y layer norm"""

    def __init__(self, d_model: int, n_heads: int, dropout: float = 0.1):
        super().__init__()
        assert d_model % n_heads == 0

        self.d_model = d_model
        self.n_heads = n_heads
        self.d_k = d_model // n_heads

        self.q_linear = nn.Linear(d_model, d_model)
        self.k_linear = nn.Linear(d_model, d_model)
        self.v_linear = nn.Linear(d_model, d_model)
        self.out = nn.Linear(d_model, d_model)

        self.dropout = nn.Dropout(dropout)
        self.layer_norm = nn.LayerNorm(d_model)

    def forward(self, x: torch.Tensor, mask: Optional[torch.Tensor] = None) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Args:
            x: [B, T, D]
            mask: [B, T] o [B, T, T]
        Returns:
            output: [B, T, D]
            attention_weights: [B, H, T, T]
        """
        B, T, D = x.size()
        residual = x

        # Linear projections
        Q = self.q_linear(x).view(B, T, self.n_heads, self.d_k).transpose(1, 2)  # [B, H, T, d_k]
        K = self.k_linear(x).view(B, T, self.n_heads, self.d_k).transpose(1, 2)
        V = self.v_linear(x).view(B, T, self.n_heads, self.d_k).transpose(1, 2)

        # Scaled dot-product attention
        scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(self.d_k)  # [B, H, T, T]

        if mask is not None:
            if mask.dim() == 2:  # [B, T] -> [B, 1, 1, T]
                mask = mask.unsqueeze(1).unsqueeze(2)
            scores = scores.masked_fill(mask == 0, -1e9)

        attn_weights = F.softmax(scores, dim=-1)
        attn_weights = self.dropout(attn_weights)

        context = torch.matmul(attn_weights, V)  # [B, H, T, d_k]
        context = context.transpose(1, 2).contiguous().view(B, T, D)

        output = self.out(context)
        output = self.dropout(output)
        output = self.layer_norm(output + residual)

        return output, attn_weights


class FeedForward(nn.Module):
    """Position-wise feed-forward network con GELU"""

    def __init__(self, d_model: int, d_ff: int, dropout: float = 0.1):
        super().__init__()
        self.linear1 = nn.Linear(d_model, d_ff)
        self.linear2 = nn.Linear(d_ff, d_model)
        self.dropout = nn.Dropout(dropout)
        self.layer_norm = nn.LayerNorm(d_model)
        self.activation = nn.GELU()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        residual = x
        x = self.linear1(x)
        x = self.activation(x)
        x = self.dropout(x)
        x = self.linear2(x)
        x = self.dropout(x)
        return self.layer_norm(x + residual)


class TransformerEncoderLayer(nn.Module):
    """Transformer encoder layer completo"""

    def __init__(self, d_model: int, n_heads: int, d_ff: int, dropout: float = 0.1):
        super().__init__()
        self.attention = MultiHeadSelfAttention(d_model, n_heads, dropout)
        self.feed_forward = FeedForward(d_model, d_ff, dropout)

    def forward(self, x: torch.Tensor, mask: Optional[torch.Tensor] = None) -> Tuple[torch.Tensor, torch.Tensor]:
        x, attn_weights = self.attention(x, mask)
        x = self.feed_forward(x)
        return x, attn_weights


# =============================================================================
# CNN MULTI-ESCALA CON DILATED CONVOLUTIONS
# =============================================================================


class DilatedConvBlock(nn.Module):
    """Bloque convolucional con dilation y residual connection"""

    def __init__(self, in_channels: int, out_channels: int, kernel_size: int,
                 dilation: int, dropout: float = 0.1):
        super().__init__()
        padding = (kernel_size - 1) * dilation // 2

        self.conv = nn.Conv1d(in_channels, out_channels, kernel_size,
                              padding=padding, dilation=dilation)
        self.norm = nn.BatchNorm1d(out_channels)
        self.activation = nn.GELU()
        self.dropout = nn.Dropout(dropout)

        # Residual connection
        self.residual = nn.Conv1d(in_channels, out_channels, 1) if in_channels != out_channels else nn.Identity()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """x: [B, C, T]"""
        residual = self.residual(x)

        out = self.conv(x)
        out = self.norm(out)
        out = self.activation(out)
        out = self.dropout(out)

        return out + residual


class MultiScaleCNN(nn.Module):
    """CNN multi-rama para capturar patrones a diferentes escalas temporales"""

    def __init__(self, in_channels: int, hidden_channels: int, dropout: float = 0.1):
        super().__init__()

        # Branch 1: Short-term patterns (kernel=3)
        self.branch1 = nn.Sequential(
            DilatedConvBlock(in_channels, hidden_channels, kernel_size=3, dilation=1, dropout=dropout),
            DilatedConvBlock(hidden_channels, hidden_channels, kernel_size=3, dilation=2, dropout=dropout),
            DilatedConvBlock(hidden_channels, hidden_channels, kernel_size=3, dilation=4, dropout=dropout),
        )

        # Branch 2: Mid-term patterns (kernel=5)
        self.branch2 = nn.Sequential(
            DilatedConvBlock(in_channels, hidden_channels, kernel_size=5, dilation=1, dropout=dropout),
            DilatedConvBlock(hidden_channels, hidden_channels, kernel_size=5, dilation=3, dropout=dropout),
            DilatedConvBlock(hidden_channels, hidden_channels, kernel_size=5, dilation=6, dropout=dropout),
        )

        # Branch 3: Long-term patterns (kernel=7)
        self.branch3 = nn.Sequential(
            DilatedConvBlock(in_channels, hidden_channels, kernel_size=7, dilation=1, dropout=dropout),
            DilatedConvBlock(hidden_channels, hidden_channels, kernel_size=7, dilation=4, dropout=dropout),
            DilatedConvBlock(hidden_channels, hidden_channels, kernel_size=7, dilation=8, dropout=dropout),
        )

        # Fusion layer
        self.fusion = nn.Sequential(
            nn.Conv1d(hidden_channels * 3, hidden_channels, kernel_size=1),
            nn.BatchNorm1d(hidden_channels),
            nn.GELU(),
            nn.Dropout(dropout),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """x: [B, C, T]"""
        b1 = self.branch1(x)
        b2 = self.branch2(x)
        b3 = self.branch3(x)

        # Concatenate and fuse
        concat = torch.cat([b1, b2, b3], dim=1)
        fused = self.fusion(concat)

        return fused


# =============================================================================
# DUAL-STREAM ENCODER (PRICE + VOLUME)
# =============================================================================


class DualStreamEncoder(nn.Module):
    """Procesa price y volume features separadamente antes de fusionar"""

    def __init__(self, price_dim: int, volume_dim: int, hidden_dim: int,
                 n_heads: int = 4, dropout: float = 0.1):
        super().__init__()

        # Price stream: Transformer para relaciones temporales complejas
        self.price_proj = nn.Linear(price_dim, hidden_dim)
        self.price_transformer = TransformerEncoderLayer(
            d_model=hidden_dim,
            n_heads=n_heads,
            d_ff=hidden_dim * 4,
            dropout=dropout
        )

        # Volume stream: CNN para patrones locales y burst detection
        self.volume_proj = nn.Linear(volume_dim, hidden_dim)
        self.volume_cnn = MultiScaleCNN(hidden_dim, hidden_dim, dropout)

        # Cross-modal attention para fusión
        self.cross_attn = MultiHeadSelfAttention(hidden_dim, n_heads=n_heads, dropout=dropout)

        # Fusion MLP
        self.fusion = nn.Sequential(
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.GELU(),
            nn.Dropout(dropout),
        )

    def forward(self, price_features: torch.Tensor, volume_features: torch.Tensor,
                mask: Optional[torch.Tensor] = None) -> Tuple[torch.Tensor, Dict[str, torch.Tensor]]:
        """
        Args:
            price_features: [B, T, P]
            volume_features: [B, T, V]
            mask: [B, T]
        Returns:
            fused: [B, T, H]
            attention_maps: dict
        """
        # Price stream
        price = self.price_proj(price_features)  # [B, T, H]
        price, price_attn = self.price_transformer(price, mask)

        # Volume stream
        volume = self.volume_proj(volume_features)  # [B, T, H]
        volume = volume.transpose(1, 2)  # [B, H, T] para CNN
        volume = self.volume_cnn(volume)
        volume = volume.transpose(1, 2)  # [B, T, H]

        # Concatenate antes de cross-attention
        combined = torch.cat([price, volume], dim=-1)  # [B, T, 2H]
        fused = self.fusion(combined)  # [B, T, H]

        # Cross-modal attention
        fused, cross_attn = self.cross_attn(fused, mask)

        attn_maps = {
            'price_self_attn': price_attn,
            'cross_modal_attn': cross_attn,
        }

        return fused, attn_maps


# =============================================================================
# REGIME-AWARE CONDITIONING
# =============================================================================


class RegimeConditioning(nn.Module):
    """FiLM: Feature-wise Linear Modulation basada en régimen de mercado"""

    def __init__(self, n_regimes: int, d_model: int):
        super().__init__()
        self.regime_embedding = nn.Embedding(n_regimes, d_model)

        # Learnable affine transformation parameters
        self.gamma_net = nn.Linear(d_model, d_model)
        self.beta_net = nn.Linear(d_model, d_model)

    def forward(self, x: torch.Tensor, regime_ids: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: [B, T, D] o [B, D]
            regime_ids: [B]
        Returns:
            conditioned: [B, T, D] o [B, D]
        """
        regime_embed = self.regime_embedding(regime_ids)  # [B, D]

        gamma = self.gamma_net(regime_embed)  # [B, D]
        beta = self.beta_net(regime_embed)    # [B, D]

        if x.dim() == 3:  # [B, T, D]
            gamma = gamma.unsqueeze(1)  # [B, 1, D]
            beta = beta.unsqueeze(1)

        # FiLM: x_out = gamma * x + beta
        return gamma * x + beta


# =============================================================================
# MULTI-TASK HEADS CON UNCERTAINTY ESTIMATION
# =============================================================================


class UncertaintyHead(nn.Module):
    """Head que predice mean + log_variance (aleatoric uncertainty)"""

    def __init__(self, input_dim: int, hidden_dim: int, dropout: float = 0.1):
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.LayerNorm(hidden_dim // 2),
            nn.GELU(),
            nn.Dropout(dropout),
        )

        self.mean_head = nn.Linear(hidden_dim // 2, 1)
        self.logvar_head = nn.Linear(hidden_dim // 2, 1)

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """Returns: mean, log_variance"""
        features = self.network(x)
        mean = self.mean_head(features)
        logvar = self.logvar_head(features)
        logvar = torch.clamp(logvar, -10, 10)  # Estabilidad numérica
        return mean, logvar


class MultiTaskHead(nn.Module):
    """Multi-task learning con uncertainty weighting automático (Kendall et al. 2018)"""

    def __init__(self, input_dim: int, hidden_dim: int, dropout: float = 0.1,
                 use_uncertainty_weighting: bool = True):
        super().__init__()
        self.use_uncertainty_weighting = use_uncertainty_weighting

        # Shared representation
        self.shared = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.GELU(),
            nn.Dropout(dropout),
        )

        # Task-specific heads
        self.prob_head = UncertaintyHead(hidden_dim, hidden_dim // 2, dropout)
        self.pnl_head = UncertaintyHead(hidden_dim, hidden_dim // 2, dropout)
        self.volatility_head = UncertaintyHead(hidden_dim, hidden_dim // 2, dropout)

        # Learnable task weights (en log-space para estabilidad)
        if use_uncertainty_weighting:
            self.log_var_prob = nn.Parameter(torch.zeros(1))
            self.log_var_pnl = nn.Parameter(torch.zeros(1))
            self.log_var_vol = nn.Parameter(torch.zeros(1))

    def forward(self, x: torch.Tensor) -> Dict[str, Tuple[torch.Tensor, torch.Tensor]]:
        """
        Args:
            x: [B, D]
        Returns:
            Dict con (mean, logvar) para cada tarea
        """
        shared = self.shared(x)

        prob_mean, prob_logvar = self.prob_head(shared)
        pnl_mean, pnl_logvar = self.pnl_head(shared)
        vol_mean, vol_logvar = self.volatility_head(shared)

        return {
            'probability': (prob_mean, prob_logvar),
            'pnl': (pnl_mean, pnl_logvar),
            'volatility': (vol_mean, vol_logvar),
        }

    def compute_loss(self, predictions: Dict, targets: Dict,
                     weights: torch.Tensor) -> Tuple[torch.Tensor, Dict]:
        """
        Multi-task loss con automatic uncertainty weighting

        Args:
            predictions: dict de (mean, logvar) tuples
            targets: dict con 'win', 'pnl', 'volatility'
            weights: [B] - sample importance weights
        """
        prob_mean, prob_logvar = predictions['probability']
        pnl_mean, pnl_logvar = predictions['pnl']
        vol_mean, vol_logvar = predictions['volatility']

        # Task 1: Classification (probability of win)
        prob_pred = torch.sigmoid(prob_mean.squeeze(-1))
        bce = F.binary_cross_entropy(prob_pred, targets['win'].float(), reduction='none')
        loss_prob = (bce * weights).mean()

        # Task 2: Regression (expected PnL in bps)
        pnl_target = targets['pnl']
        pnl_precision = torch.exp(-pnl_logvar)
        loss_pnl = (pnl_precision * (pnl_mean.squeeze(-1) - pnl_target) ** 2 + pnl_logvar.squeeze(-1))
        loss_pnl = (loss_pnl * weights).mean()

        # Task 3: Regression (expected volatility)
        vol_target = targets['volatility']
        vol_precision = torch.exp(-vol_logvar)
        loss_vol = (vol_precision * (vol_mean.squeeze(-1) - vol_target) ** 2 + vol_logvar.squeeze(-1))
        loss_vol = (loss_vol * weights).mean()

        # Uncertainty weighting (Kendall et al. 2018)
        if self.use_uncertainty_weighting:
            weighted_loss_prob = loss_prob / (2 * torch.exp(self.log_var_prob)) + self.log_var_prob / 2
            weighted_loss_pnl = loss_pnl / (2 * torch.exp(self.log_var_pnl)) + self.log_var_pnl / 2
            weighted_loss_vol = loss_vol / (2 * torch.exp(self.log_var_vol)) + self.log_var_vol / 2
            total_loss = weighted_loss_prob + weighted_loss_pnl + weighted_loss_vol

            loss_dict = {
                'total': total_loss,
                'prob': loss_prob,
                'pnl': loss_pnl,
                'vol': loss_vol,
                'weight_prob': torch.exp(-self.log_var_prob).item(),
                'weight_pnl': torch.exp(-self.log_var_pnl).item(),
                'weight_vol': torch.exp(-self.log_var_vol).item(),
            }
        else:
            # Fixed weights
            total_loss = loss_prob + 0.5 * loss_pnl + 0.3 * loss_vol
            loss_dict = {
                'total': total_loss,
                'prob': loss_prob,
                'pnl': loss_pnl,
                'vol': loss_vol,
            }

        return total_loss, loss_dict


# =============================================================================
# ARQUITECTURA PRINCIPAL: ZENITH NET V2
# =============================================================================


class ZenithNetV2(nn.Module):
    """
    Arquitectura completa de deep learning para trading HFT

    Pipeline:
    1. Input embeddings (symbol, regime, timeframe)
    2. Dual-stream encoder (price + volume)
    3. Temporal transformer stack
    4. Regime conditioning (FiLM)
    5. Attention pooling
    6. Multi-task heads con uncertainty
    """

    def __init__(self, config: ZenithConfigV2):
        super().__init__()
        self.config = config

        # Embeddings
        self.symbol_embedding = nn.Embedding(config.n_symbols, 32)
        self.regime_embedding_input = nn.Embedding(config.n_regimes, 64)
        self.timeframe_embedding = nn.Embedding(config.n_timeframes, 16)

        # Input projection para microstructure features
        micro_total = config.microstructure_features + config.indicator_features
        self.micro_proj = nn.Sequential(
            nn.Linear(micro_total, config.hidden_dim // 2),
            nn.LayerNorm(config.hidden_dim // 2),
            nn.GELU(),
            nn.Dropout(config.dropout),
        )

        # Context features projection
        context_total = config.context_features + config.cross_asset_features + 32 + 16  # +embed dims
        self.context_proj = nn.Sequential(
            nn.Linear(context_total, config.hidden_dim // 2),
            nn.LayerNorm(config.hidden_dim // 2),
            nn.GELU(),
            nn.Dropout(config.dropout),
        )

        # Dual-stream encoder
        self.dual_stream = DualStreamEncoder(
            price_dim=config.price_features,
            volume_dim=config.volume_features,
            hidden_dim=config.hidden_dim,
            n_heads=config.n_attention_heads,
            dropout=config.dropout
        )

        # Positional encoding
        self.pos_encoding = PositionalEncoding(
            config.hidden_dim,
            config.max_seq_len,
            config.dropout
        )

        # Stack of Transformer encoder layers
        self.transformer_layers = nn.ModuleList([
            TransformerEncoderLayer(
                d_model=config.hidden_dim,
                n_heads=config.n_attention_heads,
                d_ff=config.hidden_dim * 4,
                dropout=config.dropout
            ) for _ in range(config.n_transformer_layers)
        ])

        # Regime conditioning (FiLM)
        self.regime_conditioning = RegimeConditioning(config.n_regimes, config.hidden_dim)

        # Attention pooling (learnable query)
        self.pool_query = nn.Parameter(torch.randn(1, 1, config.hidden_dim))
        self.attention_pool = nn.MultiheadAttention(
            config.hidden_dim,
            config.n_attention_heads,
            dropout=config.dropout,
            batch_first=True
        )

        # Fusion de todas las features
        fusion_input_dim = config.hidden_dim + config.hidden_dim // 2 + config.hidden_dim // 2  # temporal + micro + context
        self.fusion = nn.Sequential(
            nn.Linear(fusion_input_dim, config.hidden_dim),
            nn.LayerNorm(config.hidden_dim),
            nn.GELU(),
            nn.Dropout(config.dropout),
            nn.Linear(config.hidden_dim, config.hidden_dim),
            nn.LayerNorm(config.hidden_dim),
            nn.GELU(),
            nn.Dropout(config.dropout),
        )

        # Multi-task head
        self.multi_task_head = MultiTaskHead(
            input_dim=config.hidden_dim,
            hidden_dim=config.hidden_dim,
            dropout=config.dropout,
            use_uncertainty_weighting=config.use_uncertainty_weighting
        )

        # Temperature parameter para calibración
        self.temperature = nn.Parameter(torch.ones(1))

        # Initialize weights
        self.apply(self._init_weights)

    def _init_weights(self, module):
        """Inicialización de pesos (Xavier/He)"""
        if isinstance(module, nn.Linear):
            nn.init.xavier_uniform_(module.weight)
            if module.bias is not None:
                nn.init.zeros_(module.bias)
        elif isinstance(module, nn.Embedding):
            nn.init.normal_(module.weight, mean=0, std=0.02)
        elif isinstance(module, (nn.LayerNorm, nn.BatchNorm1d)):
            nn.init.ones_(module.weight)
            nn.init.zeros_(module.bias)

    def forward(
        self,
        price_features: torch.Tensor,
        volume_features: torch.Tensor,
        microstructure_features: torch.Tensor,
        indicator_features: torch.Tensor,
        context_features: torch.Tensor,
        cross_asset_features: torch.Tensor,
        symbol_ids: torch.Tensor,
        regime_ids: torch.Tensor,
        timeframe_ids: torch.Tensor,
        mask: Optional[torch.Tensor] = None
    ) -> Dict[str, torch.Tensor]:
        """
        Args:
            price_features: [B, T, P]
            volume_features: [B, T, V]
            microstructure_features: [B, M]
            indicator_features: [B, I]
            context_features: [B, C]
            cross_asset_features: [B, A]
            symbol_ids: [B]
            regime_ids: [B]
            timeframe_ids: [B]
            mask: [B, T] - padding mask

        Returns:
            Dict con predictions y attention maps
        """
        B, T, _ = price_features.size()

        # Embeddings
        symbol_embed = self.symbol_embedding(symbol_ids)       # [B, 32]
        timeframe_embed = self.timeframe_embedding(timeframe_ids)  # [B, 16]

        # Process microstructure + indicators
        micro_concat = torch.cat([microstructure_features, indicator_features], dim=-1)
        micro_embed = self.micro_proj(micro_concat)  # [B, H/2]

        # Process context + cross-asset + embeddings
        context_concat = torch.cat([
            context_features,
            cross_asset_features,
            symbol_embed,
            timeframe_embed
        ], dim=-1)
        context_embed = self.context_proj(context_concat)  # [B, H/2]

        # Dual-stream encoding (price + volume)
        temporal_features, attn_maps = self.dual_stream(
            price_features,
            volume_features,
            mask
        )  # [B, T, H]

        # Add positional encoding
        temporal_features = self.pos_encoding(temporal_features)

        # Stack of Transformer layers
        all_attentions = []
        for transformer_layer in self.transformer_layers:
            temporal_features, layer_attn = transformer_layer(temporal_features, mask)
            all_attentions.append(layer_attn)

        # Regime conditioning (FiLM)
        temporal_features = self.regime_conditioning(temporal_features, regime_ids)  # [B, T, H]

        # Attention pooling (aggregate temporal dimension)
        query = self.pool_query.expand(B, -1, -1)  # [B, 1, H]
        pooled, pool_attn = self.attention_pool(
            query,
            temporal_features,
            temporal_features,
            key_padding_mask=(~mask.bool() if mask is not None else None)
        )  # [B, 1, H]
        pooled = pooled.squeeze(1)  # [B, H]

        # Fusion: temporal + microstructure + context
        fused = torch.cat([pooled, micro_embed, context_embed], dim=-1)  # [B, H + H/2 + H/2]
        fused = self.fusion(fused)  # [B, H]

        # Multi-task predictions
        predictions = self.multi_task_head(fused)

        # Apply temperature scaling to probability
        prob_mean, prob_logvar = predictions['probability']
        prob_mean_calibrated = prob_mean / self.temperature.clamp(0.5, 5.0)
        predictions['probability'] = (prob_mean_calibrated, prob_logvar)

        # Store attention maps
        attn_maps['transformer_layers'] = all_attentions
        attn_maps['attention_pool'] = pool_attn

        return {
            'predictions': predictions,
            'attention_maps': attn_maps,
            'fused_features': fused,  # Para análisis
        }

    def predict_proba(self, forward_output: Dict) -> torch.Tensor:
        """Extrae probabilidad calibrada"""
        prob_mean, _ = forward_output['predictions']['probability']
        return torch.sigmoid(prob_mean).squeeze(-1)

    def get_uncertainty(self, forward_output: Dict, task: str = 'probability') -> torch.Tensor:
        """Extrae uncertainty para una tarea"""
        _, logvar = forward_output['predictions'][task]
        return torch.exp(0.5 * logvar).squeeze(-1)  # std deviation
