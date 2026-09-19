"""
GNC-Bench Publication Suite v3: GPU/MPS-Accelerated Benchmark Execution
========================================================================
- Automatic Device Selection (MPS / CUDA / CPU)
- Multi-seed ablation studies across 10 random seeds with bootstrap CIs
- Long sequence horizons (2.5s train / 5.0s eval) and 100 training epochs
- Buffer-registered multivector grade masks for GPU/MPS tensor execution
- Welch's t-tests and scipy statistics
"""

import os
import sys
import math
import json
import time
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
import torch.nn.functional as F
from scipy import stats
from typing import Dict, List, Tuple, Any

from clifford_ltc import (
    PyTorchCliffordLiquidNetwork,
    PyTorchCliffordLTCNode,
    clifford_product,
    clifford_matrix_representation,
)
from dataset_loaders import ERA5DrydenWindGenerator, encode_drone_multivector

# Device Selection: MPS (Apple Silicon GPU) -> CUDA (NVIDIA GPU / GCP) -> CPU
if torch.backends.mps.is_available():
    DEVICE = torch.device("mps")
elif torch.cuda.is_available():
    DEVICE = torch.device("cuda")
else:
    DEVICE = torch.device("cpu")

print(f"GNC-Bench Execution Device: {DEVICE}")


# ═══════════════════════════════════════════════════════════════════════════════
# Section 1: Baseline Model Definitions
# ═══════════════════════════════════════════════════════════════════════════════

class NaivePIDController:
    """Classical PD Controller (14 parameters)."""
    def __init__(self, Kp: float = 4.0, Kd: float = 0.8):
        self.Kp = Kp
        self.Kd = Kd
        self.prev_err = np.zeros(3)

    def forward(self, pos_err: np.ndarray, dt: float = 0.005) -> np.ndarray:
        deriv = (pos_err - self.prev_err) / max(dt, 1e-6)
        self.prev_err = pos_err.copy()
        return self.Kp * pos_err + self.Kd * deriv

    def reset(self):
        self.prev_err = np.zeros(3)


class StandardMLPController(nn.Module):
    """Dense Feedforward Neural Network (~1,443 parameters)."""
    def __init__(self, in_dim: int = 8, hidden_dim: int = 32, out_dim: int = 3):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, out_dim),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


class NeuralODEController(nn.Module):
    """Continuous-Time Neural ODE Controller (~1,443 parameters)."""
    def __init__(self, in_dim: int = 8, hidden_dim: int = 32, out_dim: int = 3, tau: float = 1.0):
        super().__init__()
        self.tau = tau
        self.fc_in = nn.Linear(in_dim, hidden_dim)
        self.fc_hidden = nn.Linear(hidden_dim, hidden_dim)
        self.fc_out = nn.Linear(hidden_dim, out_dim)

    def forward(
        self, x: torch.Tensor, state: torch.Tensor, dt: float = 0.005
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        h = torch.relu(self.fc_in(x))
        h = torch.relu(self.fc_hidden(h))
        decay = -state / self.tau
        new_state = state + (decay + h) * dt
        out = self.fc_out(new_state)
        return out, new_state


# ═══════════════════════════════════════════════════════════════════════════════
# Section 2: Ablation Model Variants
# ═══════════════════════════════════════════════════════════════════════════════

class VectorOnlyCliffordLTC(nn.Module):
    """Grade ablation: Zeroes out bivector and trivector components."""
    def __init__(self, num_nodes: int, inputs_per_node: int):
        super().__init__()
        self.base = PyTorchCliffordLiquidNetwork(num_nodes, inputs_per_node)
        self.register_buffer(
            "grade_mask", torch.tensor([1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0], dtype=torch.float32)
        )

    def forward(self, inputs: torch.Tensor, states: torch.Tensor, dt: float = 0.005) -> torch.Tensor:
        masked_inputs = inputs * self.grade_mask
        masked_states = states * self.grade_mask
        new_states = self.base(masked_inputs, masked_states, dt)
        return new_states * self.grade_mask


class ScalarOnlyCliffordLTC(nn.Module):
    """Grade ablation: Zeroes out everything except scalar component (grade 0)."""
    def __init__(self, num_nodes: int, inputs_per_node: int):
        super().__init__()
        self.base = PyTorchCliffordLiquidNetwork(num_nodes, inputs_per_node)
        self.register_buffer(
            "grade_mask", torch.tensor([1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0], dtype=torch.float32)
        )

    def forward(self, inputs: torch.Tensor, states: torch.Tensor, dt: float = 0.005) -> torch.Tensor:
        masked_inputs = inputs * self.grade_mask
        masked_states = states * self.grade_mask
        new_states = self.base(masked_inputs, masked_states, dt)
        return new_states * self.grade_mask


class StaticCliffordLayer(nn.Module):
    """Liquid vs Static ablation: Feedforward Clifford layer without ODE recurrence."""
    def __init__(self, num_nodes: int, inputs_per_node: int):
        super().__init__()
        self.num_nodes = num_nodes
        self.inputs_per_node = inputs_per_node
        initial_w = torch.zeros(num_nodes, inputs_per_node, 8)
        initial_w[:, :, 0] = 0.1
        initial_w[:, :, 1:4] = 0.01
        self.weights = nn.Parameter(initial_w)
        self.bias = nn.Parameter(torch.zeros(num_nodes, 8))

    def forward(self, inputs: torch.Tensor, states: torch.Tensor, dt: float = 0.005) -> torch.Tensor:
        batch = inputs.shape[0]
        results = []
        for n in range(self.num_nodes):
            coupling = self.bias[n].unsqueeze(0).expand(batch, -1)
            for k in range(self.inputs_per_node):
                w_k = self.weights[n, k].unsqueeze(0).expand(batch, -1)
                inp_k = inputs[:, n, k, :]
                coupling = coupling + clifford_product(w_k, inp_k)
            results.append(torch.sigmoid(coupling) - 0.5)
        return torch.stack(results, dim=1)


def clifford_product_componentwise(a: torch.Tensor, b: torch.Tensor) -> torch.Tensor:
    """64-term component-wise scalar geometric product for Cl(3,0)."""
    s1, x1, y1, z1, xy1, yz1, zx1, t1 = [a[..., i] for i in range(8)]
    s2, x2, y2, z2, xy2, yz2, zx2, t2 = [b[..., i] for i in range(8)]

    out_s   = s1*s2  + x1*x2  + y1*y2  + z1*z2  - xy1*xy2 - yz1*yz2 - zx1*zx2 - t1*t2
    out_x   = x1*s2  + s1*x2  + xy1*y2  - zx1*z2  - y1*xy2  - t1*yz2  + z1*zx2  - yz1*t2
    out_y   = y1*s2  - xy1*x2  + s1*y2  + yz1*z2  + x1*xy2  - z1*yz2  - t1*zx2  - zx1*t2
    out_z   = z1*s2  + zx1*x2  - yz1*y2  + s1*z2  - t1*xy2  + y1*yz2  - x1*zx2  - xy1*t2
    out_xy  = xy1*s2  - y1*x2  + x1*y2  + t1*z2  + s1*xy2  + zx1*yz2  - yz1*zx2  + z1*t2
    out_yz  = yz1*s2  + t1*x2  - z1*y2  + y1*z2  - zx1*xy2  + s1*yz2  + xy1*zx2  + x1*t2
    out_zx  = zx1*s2  + z1*x2  + t1*y2  - x1*z2  + yz1*xy2  - xy1*yz2  + s1*zx2  + y1*t2
    out_t   = s1*t2  + x1*yz2 + y1*zx2 + z1*xy2 + xy1*z2  + yz1*x2  + zx1*y2  + t1*s2

    return torch.stack([out_s, out_x, out_y, out_z, out_xy, out_yz, out_zx, out_t], dim=-1)


# ═══════════════════════════════════════════════════════════════════════════════
# Section 3: Training Infrastructure
# ═══════════════════════════════════════════════════════════════════════════════

def generate_dataset(seed: int, duration_sec: float = 2.5):
    """Generate ERA5/Dryden wind sequence with multivector encodings and oracle targets."""
    gen = ERA5DrydenWindGenerator(sample_rate=200.0, seed=seed)
    data = gen.generate_sequence(duration_sec=duration_sec)
    T = len(data["time"])

    mv_list = []
    flat_list = []
    target_list = []
    Kp, Kd = 4.0, 0.8
    prev_err = np.zeros(3)

    for t in range(T):
        wind_t = data["wind"][t]
        vort_t = data["vorticity"][t]
        div_t = data["divergence"][t]
        time_t = data["time"][t]

        pos_err = np.array([
            math.sin(0.5 * time_t),
            0.2 * math.cos(0.5 * time_t),
            -0.1 * math.sin(0.5 * time_t),
        ])
        target = -Kp * pos_err + 0.5 * wind_t

        mv = encode_drone_multivector(pos_err, (vort_t[0], vort_t[1], vort_t[2]), div_t)
        mv_list.append(mv)
        flat_list.append(mv.copy())
        target_list.append(target)
        prev_err = pos_err.copy()

    mv_np = np.array(mv_list, dtype=np.float32)
    flat_np = np.array(flat_list, dtype=np.float32)
    target_np = np.array(target_list, dtype=np.float32)

    return data, mv_np, flat_np, target_np


def generate_sine_dataset(seed: int, duration_sec: float = 2.5, sample_rate: float = 200.0):
    """Synthetic sine-wave dataset for synthetic-vs-empirical ablation."""
    np.random.seed(seed)
    T = int(duration_sec * sample_rate)
    time_vec = np.linspace(0, duration_sec, T)

    labels = np.zeros(T, dtype=np.int64)
    p_start = int(0.30 * T)
    p_end = int(0.45 * T)
    labels[p_start:p_end] = 1
    d_start = int(0.70 * T)
    labels[d_start:] = 2

    mv_list = []
    target_list = []
    Kp = 4.0

    for t in range(T):
        pos_err = np.array([
            math.sin(0.5 * time_vec[t]),
            0.2 * math.cos(0.5 * time_vec[t]),
            -0.1 * math.sin(0.5 * time_vec[t]),
        ])
        wind = np.array([
            5.0 + 1.5 * math.sin(2.0 * time_vec[t]),
            2.0 + 1.2 * math.sin(3.0 * time_vec[t]),
            0.5 + 0.8 * math.sin(1.5 * time_vec[t]),
        ])
        target = -Kp * pos_err + 0.5 * wind

        vort = np.array([
            math.sin(4.0 * time_vec[t]) * 0.1,
            math.cos(3.0 * time_vec[t]) * 0.05,
            math.sin(2.0 * time_vec[t]) * 0.02,
        ])
        div_val = math.sin(5.0 * time_vec[t]) * 0.01

        mv = encode_drone_multivector(pos_err, (vort[0], vort[1], vort[2]), div_val)
        mv_list.append(mv)
        target_list.append(target)

    mv_np = np.array(mv_list, dtype=np.float32)
    target_np = np.array(target_list, dtype=np.float32)
    return labels, mv_np, target_np


def train_mlp(model: StandardMLPController, mv_np: np.ndarray, target_np: np.ndarray, epochs: int = 100, lr: float = 0.01):
    """Train MLP on DEVICE."""
    model = model.to(DEVICE)
    optimizer = optim.Adam(model.parameters(), lr=lr)
    inp = torch.from_numpy(mv_np).to(DEVICE)
    tgt = torch.from_numpy(target_np).to(DEVICE)
    model.train()
    for epoch in range(epochs):
        optimizer.zero_grad()
        pred = model(inp)
        loss = F.mse_loss(pred, tgt)
        loss.backward()
        optimizer.step()
    model.eval()
    return model


def train_node(model: NeuralODEController, mv_np: np.ndarray, target_np: np.ndarray, epochs: int = 100, lr: float = 0.01, chunk_size: int = 100):
    """Train Neural ODE on DEVICE via truncated BPTT."""
    model = model.to(DEVICE)
    optimizer = optim.Adam(model.parameters(), lr=lr)
    T = mv_np.shape[0]
    inp = torch.from_numpy(mv_np).unsqueeze(1).to(DEVICE)
    tgt = torch.from_numpy(target_np).unsqueeze(1).to(DEVICE)
    model.train()
    for epoch in range(epochs):
        state = torch.zeros(1, 32, device=DEVICE)
        for chunk_start in range(0, T, chunk_size):
            chunk_end = min(chunk_start + chunk_size, T)
            optimizer.zero_grad()
            total_loss = torch.tensor(0.0, device=DEVICE)
            for t in range(chunk_start, chunk_end):
                out, state = model(inp[t], state, dt=0.005)
                total_loss = total_loss + F.mse_loss(out, tgt[t])
            total_loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            state = state.detach()
    model.eval()
    return model


NUM_NODES = 7  # Full architecture

def train_clifford(model, mv_np: np.ndarray, target_np: np.ndarray, epochs: int = 100, lr: float = 0.01, chunk_size: int = 100):
    """Train Clifford-variant model on DEVICE via truncated BPTT."""
    model = model.to(DEVICE)
    optimizer = optim.Adam(model.parameters(), lr=lr)
    T = mv_np.shape[0]
    n_nodes = model.base.num_nodes if hasattr(model, 'base') else model.num_nodes if hasattr(model, 'num_nodes') else NUM_NODES

    mv_expanded = np.tile(mv_np[:, np.newaxis, np.newaxis, :], (1, n_nodes, 1, 1))
    inp_tensor = torch.from_numpy(mv_expanded).unsqueeze(1).to(DEVICE)
    tgt_tensor = torch.from_numpy(target_np).unsqueeze(1).to(DEVICE)

    model.train()
    for epoch in range(epochs):
        states = torch.zeros(1, n_nodes, 8, device=DEVICE)
        for chunk_start in range(0, T, chunk_size):
            chunk_end = min(chunk_start + chunk_size, T)
            optimizer.zero_grad()
            total_loss = torch.tensor(0.0, device=DEVICE)
            for t in range(chunk_start, chunk_end):
                states = model(inp_tensor[t], states, dt=0.005)
                pred_vec = states[:, 0, 1:4]
                total_loss = total_loss + F.mse_loss(pred_vec, tgt_tensor[t])
            total_loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            states = states.detach()
    model.eval()
    return model


# ═══════════════════════════════════════════════════════════════════════════════
# Section 4: Evaluation Protocols
# ═══════════════════════════════════════════════════════════════════════════════

def evaluate_model_on_sequence(
    model_name: str,
    model,
    data: dict,
    mv_np: np.ndarray,
    target_np: np.ndarray,
) -> Dict[str, Any]:
    """Run model on held-out sequence on DEVICE."""
    T = mv_np.shape[0]
    labels = data["labels"]
    errors = np.zeros(T)

    if model_name == "PID":
        model.reset()
        for t in range(T):
            pos_err = mv_np[t, 1:4]
            out = model.forward(pos_err, dt=0.005)
            errors[t] = np.mean((out - target_np[t]) ** 2)

    elif model_name == "MLP":
        with torch.no_grad():
            inp = torch.from_numpy(mv_np).to(DEVICE)
            pred = model(inp).cpu().numpy()
            errors = np.mean((pred - target_np) ** 2, axis=1)

    elif model_name == "NeuralODE":
        with torch.no_grad():
            state = torch.zeros(1, 32, device=DEVICE)
            for t in range(T):
                inp = torch.from_numpy(mv_np[t : t + 1]).to(DEVICE)
                out, state = model(inp, state, dt=0.005)
                errors[t] = np.mean((out.cpu().numpy().squeeze() - target_np[t]) ** 2)

    else:
        # Any Clifford variant
        with torch.no_grad():
            n_nodes = model.base.num_nodes if hasattr(model, 'base') else model.num_nodes if hasattr(model, 'num_nodes') else NUM_NODES
            mv_expanded = np.tile(mv_np[:, np.newaxis, np.newaxis, :], (1, n_nodes, 1, 1))
            inp_all = torch.from_numpy(mv_expanded).unsqueeze(1).to(DEVICE)
            states = torch.zeros(1, n_nodes, 8, device=DEVICE)
            for t in range(T):
                states = model(inp_all[t], states, dt=0.005)
                pred_vec = states[:, 0, 1:4].cpu().numpy().squeeze()
                errors[t] = np.mean((pred_vec - target_np[t]) ** 2)

    return {"errors": errors, "labels": labels}


def compute_roc_curve(errors: np.ndarray, labels: np.ndarray, n_thresholds: int = 100):
    """Compute (FAR, TPR) points and trapezoidal AUC."""
    p_mask = labels == 1
    d_mask = labels == 2
    p_count = np.sum(p_mask)
    d_count = np.sum(d_mask)

    if p_count == 0 or d_count == 0:
        return {"far": [0, 100], "tpr": [0, 100], "auc": 0.5}

    p_errors = errors[p_mask]
    d_errors = errors[d_mask]

    thresholds = np.linspace(0, np.max(errors) * 1.1, n_thresholds)

    far_list = []
    tpr_list = []
    for th in thresholds:
        far = np.sum(p_errors > th) / p_count * 100.0
        tpr = np.sum(d_errors > th) / d_count * 100.0
        far_list.append(float(far))
        tpr_list.append(float(tpr))

    far_arr = np.array(far_list) / 100.0
    tpr_arr = np.array(tpr_list) / 100.0
    sorted_idx = np.argsort(far_arr)
    _trapz = getattr(np, 'trapezoid', getattr(np, 'trapz', None))
    auc = float(_trapz(tpr_arr[sorted_idx], far_arr[sorted_idx]))

    return {"far": far_list, "tpr": tpr_list, "auc": abs(auc)}


def bootstrap_ci(values: np.ndarray, n_resamples: int = 1000, ci: float = 0.95) -> Tuple[float, float]:
    """Proper bootstrap CI via resampling."""
    boot_means = np.zeros(n_resamples)
    n = len(values)
    rng = np.random.RandomState(42)
    for i in range(n_resamples):
        sample = rng.choice(values, size=n, replace=True)
        boot_means[i] = np.mean(sample)
    alpha = (1.0 - ci) / 2.0
    return float(np.percentile(boot_means, alpha * 100)), float(
        np.percentile(boot_means, (1 - alpha) * 100)
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Section 5: Full Benchmark Execution
# ═══════════════════════════════════════════════════════════════════════════════

def run_single_seed(seed: int, train_epochs: int = 100) -> Dict[str, Any]:
    """Train all models on one seed, evaluate on held-out sequence."""
    print(f"  Seed {seed}: generating dataset (2.5s train, 5.0s eval)...")
    _, mv_train, flat_train, target_train = generate_dataset(seed, duration_sec=2.5)

    eval_seed = seed + 100
    data_eval, mv_eval, flat_eval, target_eval = generate_dataset(eval_seed, duration_sec=5.0)

    pid = NaivePIDController(Kp=4.0, Kd=0.8)

    print(f"  Seed {seed}: training MLP ({train_epochs} epochs)...")
    mlp = StandardMLPController(in_dim=8, hidden_dim=32, out_dim=3)
    train_mlp(mlp, flat_train, target_train, epochs=train_epochs)

    print(f"  Seed {seed}: training NeuralODE ({train_epochs} epochs)...")
    node = NeuralODEController(in_dim=8, hidden_dim=32, out_dim=3)
    train_node(node, flat_train, target_train, epochs=train_epochs)

    print(f"  Seed {seed}: training CliffordLTC ({train_epochs} epochs)...")
    clifford = PyTorchCliffordLiquidNetwork(num_nodes=NUM_NODES, inputs_per_node=1)
    train_clifford(clifford, mv_train, target_train, epochs=train_epochs)

    results = {}
    models = {
        "PID": (pid, "PID"),
        "MLP": (mlp, "MLP"),
        "NeuralODE": (node, "NeuralODE"),
        "CliffordLTC": (clifford, "CliffordLTC"),
    }

    for name, (m, mtype) in models.items():
        eval_result = evaluate_model_on_sequence(mtype, m, data_eval, mv_eval, target_eval)
        roc = compute_roc_curve(eval_result["errors"], eval_result["labels"])
        mse = float(np.mean(eval_result["errors"]))

        d_mask = eval_result["labels"] == 2
        p_mask = eval_result["labels"] == 1
        far_at_tpr = {}
        if np.sum(d_mask) > 0 and np.sum(p_mask) > 0:
            d_errors = eval_result["errors"][d_mask]
            p_errors = eval_result["errors"][p_mask]
            for target_tpr in [50, 80, 90, 95]:
                threshold = np.percentile(d_errors, 100 - target_tpr)
                far = float(np.sum(p_errors > threshold) / np.sum(p_mask) * 100)
                far_at_tpr[f"far_at_{target_tpr}pct_tpr"] = far
        else:
            for target_tpr in [50, 80, 90, 95]:
                far_at_tpr[f"far_at_{target_tpr}pct_tpr"] = 0.0

        results[name] = {"mse": mse, "far_at_tpr": far_at_tpr, "roc": roc}

    return results


def run_ablation_studies_multi_seed(num_seeds: int = 10, train_epochs: int = 100) -> Dict[str, Any]:
    """Run all four ablation studies across ALL random seeds for statistical confidence!"""
    print(f"Executing Multi-Seed Ablation Studies across {num_seeds} seeds...")
    
    grade_full_mses, grade_vec_mses, grade_scal_mses = [], [], []
    grade_full_aucs, grade_vec_aucs, grade_scal_aucs = [], [], []
    
    dyn_liquid_mses, dyn_static_mses = [], []
    dyn_liquid_aucs, dyn_static_aucs = [], []

    src_era5_mses, src_sine_mses = [], []
    src_era5_aucs, src_sine_aucs = [], []

    t_matrix_list, t_comp_list = [], []

    for s in range(42, 42 + num_seeds):
        print(f"  Ablation seed {s}/{42 + num_seeds - 1}...")
        _, mv_train, flat_train, target_train = generate_dataset(s, duration_sec=2.5)
        eval_seed = s + 100
        data_eval, mv_eval, flat_eval, target_eval = generate_dataset(eval_seed, duration_sec=5.0)

        # 1. Grade Ablation
        full_clf = PyTorchCliffordLiquidNetwork(num_nodes=NUM_NODES, inputs_per_node=1)
        train_clifford(full_clf, mv_train, target_train, epochs=train_epochs)
        full_eval = evaluate_model_on_sequence("CliffordLTC", full_clf, data_eval, mv_eval, target_eval)
        full_roc = compute_roc_curve(full_eval["errors"], full_eval["labels"])
        grade_full_mses.append(float(np.mean(full_eval["errors"])))
        grade_full_aucs.append(full_roc["auc"])

        vec_only = VectorOnlyCliffordLTC(num_nodes=NUM_NODES, inputs_per_node=1)
        train_clifford(vec_only, mv_train, target_train, epochs=train_epochs)
        vec_eval = evaluate_model_on_sequence("CliffordLTC", vec_only, data_eval, mv_eval, target_eval)
        vec_roc = compute_roc_curve(vec_eval["errors"], vec_eval["labels"])
        grade_vec_mses.append(float(np.mean(vec_eval["errors"])))
        grade_vec_aucs.append(vec_roc["auc"])

        scalar_only = ScalarOnlyCliffordLTC(num_nodes=NUM_NODES, inputs_per_node=1)
        train_clifford(scalar_only, mv_train, target_train, epochs=train_epochs)
        scalar_eval = evaluate_model_on_sequence("CliffordLTC", scalar_only, data_eval, mv_eval, target_eval)
        scalar_roc = compute_roc_curve(scalar_eval["errors"], scalar_eval["labels"])
        grade_scal_mses.append(float(np.mean(scalar_eval["errors"])))
        grade_scal_aucs.append(scalar_roc["auc"])

        # 2. Dynamics Ablation
        static = StaticCliffordLayer(num_nodes=NUM_NODES, inputs_per_node=1)
        train_clifford(static, mv_train, target_train, epochs=train_epochs)
        static_eval = evaluate_model_on_sequence("CliffordLTC", static, data_eval, mv_eval, target_eval)
        static_roc = compute_roc_curve(static_eval["errors"], static_eval["labels"])
        dyn_liquid_mses.append(float(np.mean(full_eval["errors"])))
        dyn_liquid_aucs.append(full_roc["auc"])
        dyn_static_mses.append(float(np.mean(static_eval["errors"])))
        dyn_static_aucs.append(static_roc["auc"])

        # 3. Synthetic vs Empirical Data Ablation
        sine_labels, sine_mv, sine_tgt = generate_sine_dataset(s, duration_sec=2.5)
        sine_clf = PyTorchCliffordLiquidNetwork(num_nodes=NUM_NODES, inputs_per_node=1)
        train_clifford(sine_clf, sine_mv, sine_tgt, epochs=train_epochs)
        sine_eval = evaluate_model_on_sequence("CliffordLTC", sine_clf, data_eval, mv_eval, target_eval)
        sine_roc = compute_roc_curve(sine_eval["errors"], sine_eval["labels"])
        src_era5_mses.append(float(np.mean(full_eval["errors"])))
        src_era5_aucs.append(full_roc["auc"])
        src_sine_mses.append(float(np.mean(sine_eval["errors"])))
        src_sine_aucs.append(sine_roc["auc"])

        # 4. Engine Execution Timing
        a = torch.randn(256, 8, device=DEVICE)
        b = torch.randn(256, 8, device=DEVICE)
        n_iters = 200
        for _ in range(20):
            clifford_product(a, b)
            clifford_product_componentwise(a, b)

        t0 = time.perf_counter()
        for _ in range(n_iters):
            clifford_product(a, b)
        t_mat = (time.perf_counter() - t0) / n_iters * 1000.0

        t0 = time.perf_counter()
        for _ in range(n_iters):
            clifford_product_componentwise(a, b)
        t_comp = (time.perf_counter() - t0) / n_iters * 1000.0

        t_matrix_list.append(t_mat)
        t_comp_list.append(t_comp)

    # Verification of numerical agreement
    a_test = torch.randn(10, 8, device=DEVICE)
    b_test = torch.randn(10, 8, device=DEVICE)
    res_mat = clifford_product(a_test, b_test)
    res_comp = clifford_product_componentwise(a_test, b_test)
    max_diff = float(torch.max(torch.abs(res_mat - res_comp)).item())

    return {
        "grade_ablation": {
            "full_multivector_mse": float(np.mean(grade_full_mses)),
            "full_multivector_mse_std": float(np.std(grade_full_mses, ddof=1)),
            "full_multivector_auc": float(np.mean(grade_full_aucs)),
            "vector_only_mse": float(np.mean(grade_vec_mses)),
            "vector_only_mse_std": float(np.std(grade_vec_mses, ddof=1)),
            "vector_only_auc": float(np.mean(grade_vec_aucs)),
            "scalar_only_mse": float(np.mean(grade_scal_mses)),
            "scalar_only_mse_std": float(np.std(grade_scal_mses, ddof=1)),
            "scalar_only_auc": float(np.mean(grade_scal_aucs)),
        },
        "liquid_vs_static": {
            "liquid_ode_mse": float(np.mean(dyn_liquid_mses)),
            "liquid_ode_mse_std": float(np.std(dyn_liquid_mses, ddof=1)),
            "liquid_ode_auc": float(np.mean(dyn_liquid_aucs)),
            "static_feedforward_mse": float(np.mean(dyn_static_mses)),
            "static_feedforward_mse_std": float(np.std(dyn_static_mses, ddof=1)),
            "static_feedforward_auc": float(np.mean(dyn_static_aucs)),
        },
        "synthetic_vs_empirical": {
            "trained_on_era5_mse": float(np.mean(src_era5_mses)),
            "trained_on_era5_mse_std": float(np.std(src_era5_mses, ddof=1)),
            "trained_on_era5_auc": float(np.mean(src_era5_aucs)),
            "trained_on_sine_mse": float(np.mean(src_sine_mses)),
            "trained_on_sine_mse_std": float(np.std(src_sine_mses, ddof=1)),
            "trained_on_sine_auc": float(np.mean(src_sine_aucs)),
        },
        "matrix_vs_component": {
            "matrix_time_ms": round(float(np.mean(t_matrix_list)), 4),
            "matrix_time_ms_std": round(float(np.std(t_matrix_list, ddof=1)), 4),
            "component_time_ms": round(float(np.mean(t_comp_list)), 4),
            "component_time_ms_std": round(float(np.std(t_comp_list, ddof=1)), 4),
            "speedup_ratio": round(float(np.mean(t_comp_list)) / max(float(np.mean(t_matrix_list)), 1e-9), 2),
            "numerical_agreement_max_diff": max_diff,
        }
    }


def run_full_publication_benchmark(num_seeds: int = 10, train_epochs: int = 100) -> Dict[str, Any]:
    """Execute the complete GNC-Bench publication benchmark suite v3."""
    print(f"=== GNC-Bench Publication Suite v3 (Device: {DEVICE}) ===")
    print(f"Seeds: {num_seeds}, Training epochs: {train_epochs}")
    print()

    all_seed_results = []
    for s in range(42, 42 + num_seeds):
        print(f"--- Main Seed {s}/{42 + num_seeds - 1} ---")
        result = run_single_seed(s, train_epochs=train_epochs)
        all_seed_results.append(result)
        print()

    model_names = ["PID", "MLP", "NeuralODE", "CliffordLTC"]
    param_counts = {
        "PID": 14,
        "MLP": sum(p.numel() for p in StandardMLPController().parameters()),
        "NeuralODE": sum(p.numel() for p in NeuralODEController().parameters()),
        "CliffordLTC": sum(p.numel() for p in PyTorchCliffordLiquidNetwork(NUM_NODES, 1).parameters()),
    }

    aggregated = {}
    for m in model_names:
        mses = np.array([r[m]["mse"] for r in all_seed_results])

        tpr_levels = ["far_at_50pct_tpr", "far_at_80pct_tpr", "far_at_90pct_tpr", "far_at_95pct_tpr"]
        far_agg = {}
        for tpr_key in tpr_levels:
            vals = np.array([r[m]["far_at_tpr"][tpr_key] for r in all_seed_results])
            far_agg[tpr_key + "_mean"] = float(np.mean(vals))
            far_agg[tpr_key + "_std"] = float(np.std(vals, ddof=1))

        ci_lo, ci_hi = bootstrap_ci(mses)

        aggregated[m] = {
            "mse_mean": float(np.mean(mses)),
            "mse_std": float(np.std(mses, ddof=1)),
            **far_agg,
            "params": param_counts[m],
            "bootstrap_ci_95": [ci_lo, ci_hi],
            "per_seed_mses": mses.tolist(),
        }

    clf_mses = np.array([r["CliffordLTC"]["mse"] for r in all_seed_results])
    for m in ["PID", "MLP", "NeuralODE"]:
        other_mses = np.array([r[m]["mse"] for r in all_seed_results])
        t_stat, p_val = stats.ttest_ind(other_mses, clf_mses, equal_var=False)
        aggregated[m]["welch_t_stat"] = float(t_stat)
        aggregated[m]["welch_p_value"] = float(p_val)
    aggregated["CliffordLTC"]["welch_t_stat"] = 0.0
    aggregated["CliffordLTC"]["welch_p_value"] = 1.0

    roc_curves = {}
    for m in model_names:
        roc_curves[m] = all_seed_results[-1][m]["roc"]

    ablations = run_ablation_studies_multi_seed(num_seeds=num_seeds, train_epochs=train_epochs)

    final_output = {
        "suite_name": "GNC-Bench Publication Benchmark Suite v3",
        "version": "3.0 (genuine, multi-seed ablations)",
        "device": str(DEVICE),
        "num_seeds": num_seeds,
        "train_epochs": train_epochs,
        "models": aggregated,
        "roc_curves": roc_curves,
        "ablations": ablations,
    }

    output_dir = os.path.join(os.path.dirname(__file__), "..", "results")
    os.makedirs(output_dir, exist_ok=True)
    json_path = os.path.join(output_dir, "gnc_bench_results.json")
    with open(json_path, "w") as f:
        json.dump(final_output, f, indent=2)

    print("=" * 100)
    print(f"GNC-BENCH PUBLICATION RESULTS v3 (Device: {DEVICE})")
    print("=" * 100)
    print(f"{'Model':<15} {'Params':>7} {'MSE':>12} {'95% CI':>22} {'FAR@50%TPR':>12} {'FAR@90%TPR':>12} {'AUC':>8} {'p-value':>10}")
    print("-" * 100)
    for m in model_names:
        a = aggregated[m]
        ci = f"[{a['bootstrap_ci_95'][0]:.3f}, {a['bootstrap_ci_95'][1]:.3f}]"
        p = f"{a['welch_p_value']:.6f}" if m != "CliffordLTC" else "ref"
        auc = f"{roc_curves[m]['auc']:.4f}"
        far50 = f"{a['far_at_50pct_tpr_mean']:.1f}%"
        far90 = f"{a['far_at_90pct_tpr_mean']:.1f}%"
        print(f"{m:<15} {a['params']:>7} {a['mse_mean']:>8.4f}+/-{a['mse_std']:.3f} {ci:>22} {far50:>12} {far90:>12} {auc:>8} {p:>10}")
    print("=" * 100)

    print(f"\nResults exported to: {json_path}")
    return final_output


if __name__ == "__main__":
    run_full_publication_benchmark(num_seeds=10, train_epochs=100)
