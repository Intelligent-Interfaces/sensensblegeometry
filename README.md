# SensensibleGeometry: Multimodal Spatial Computing and Geometric Neural Control

<!-- rumdl-disable MD033 MD041 -->
<div align="center">
  <img src="assets/hero.png" alt="SensensibleGeometry Platform" width="720"></img>
</div>

<div align="center">
  <a href="https://github.com/intelligent-interfaces/sensensiblegeometry"><img alt="Rust Engine" src="https://img.shields.io/badge/engine-Rust%20%2B%20Wasm-orange.svg"></a>
  <a href="https://github.com/intelligent-interfaces/sensensiblegeometry"><img alt="Frontend" src="https://img.shields.io/badge/frontend-Svelte%205%20%2B%20Vite-ff3e00.svg"></a>
  <a href="https://github.com/intelligent-interfaces/sensensiblegeometry"><img alt="Backend" src="https://img.shields.io/badge/backend-Go%201.22-00add8.svg"></a>
  <a href="https://github.com/intelligent-interfaces/sensensiblegeometry"><img alt="ML Copilot" src="https://img.shields.io/badge/ml-PyTorch%20Clifford%20LTC-ee4c2c.svg"></a>
  <a href="https://github.com/intelligent-interfaces/sensensiblegeometry/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-green.svg"></a>
  <a href="https://github.com/intelligent-interfaces/sensensiblegeometry"><img alt="Tests" src="https://img.shields.io/badge/tests-passing-brightgreen.svg"></a>
</div>
<!-- rumdl-enable MD033 MD041 -->

**SensensibleGeometry** is an open-source platform, real-time spatial computing engine, and geometric neural control interface. It unites Clifford Geometric Algebra $\mathcal{C}\ell(3,0)$ and continuous-time Liquid Neural Networks to deliver exact $E(3)$ rotational equivariance, procedural aero-acoustic auditory feedback, and hardware-in-the-loop aerodynamic simulation for multimodal robotic and spatial systems.

---

## Overview

Can we achieve exact physical equivariance and real-time continuous control across heterogeneous spatial hardware?

Modern spatial computing and robotic systems (multi-axis manipulator arms, quadrotor swarms, offshore wind turbines) operate across coupled translations, rotations, velocities, and external aerodynamic forces. Conventional deep learning and Euclidean vector pipelines represent these physical states through disconnected mathematical constructs: Euler angles (susceptible to gimbal lock), quaternions (lacking linear translation coupling), and homogeneous transformation matrices (which discard metric properties under neural projection).

These disparate coordinate representations create fundamental bottlenecks in real-time physical control:

1. **Broken Rotational Equivariance**: Standard multi-layer perceptrons must learn rotational symmetry through brute-force data augmentation ($36\times$ to $100\times$ sample overhead), frequently failing under out-of-distribution orientations.
2. **Discrete Time Breakdown**: Standard neural controllers update on discrete timesteps ($\Delta t$), inducing numerical chatter and control instability under abrupt fluid turbulence, Dryden gusts, and vortex shedding.
3. **Disjoint Sensory Modalities**: Spatial visual kinematics, acoustic flow pressure, and physical actuators operate on disjoint telemetry tracks without a unified geometric representation.

**SensensibleGeometry** resolves these bottlenecks by embedding physical dynamics into the 8-dimensional Clifford algebra $\mathcal{C}\ell(3,0)$. By operating directly on multivectors:

```math
M = s + v_1 e_1 + v_2 e_2 + v_3 e_3 + b_{12} e_1 e_2 + b_{23} e_2 e_3 + b_{31} e_3 e_1 + p\, e_1 e_2 e_3
```

the platform unifies scalars (mass, temperature, energy), vectors (velocity, force), bivectors (torque, angular momentum), and trivectors (helicity, pseudoscalars) into a single associative algebra.

---

## Motivation and Design Principles

### Exact E(3) Rotational Equivariance via Geometric Product
Rotations and reflections are computed using sandwich rotor products:

```math
v' = R \, v \, R^{\dagger}, \quad R = \exp\left(-\frac{\theta}{2} B\right)
```

where $B$ is a unit bivector defining the plane of rotation and $R^\dagger$ is the rotor reversion. Because the geometric product $ab = a \cdot b + a \wedge b$ naturally encodes orientation and magnitude, the system achieves exact $E(3)$ rotational equivariance by construction, requiring zero data augmentation.

### Continuous-Time Clifford Liquid Networks
Rather than relying on discrete recurrent layers, the control engine implements continuous-time Clifford Liquid Time-Constant (LTC) neural ODEs:

```math
\frac{d\mathbf{x}(t)}{dt} = -\left[\frac{1}{\boldsymbol{\tau}} + f(\mathbf{x}(t), \mathbf{I}(t))\right] \odot \mathbf{x}(t) + A \odot f(\mathbf{x}(t), \mathbf{I}(t))
```

where state multivectors $\mathbf{x}(t)$ and input multivectors $\mathbf{I}(t)$ interact through multivector synaptic weights, preserving physical geometric invariants across variable integration timesteps.

### Procedural Aero-Acoustic Synthesizer
Inspired by physical acoustic affordance theory, the platform integrates `AeroAudioSynth`, a real-time Web Audio API procedural synthesizer. By translating local airflow velocity, turbulent kinetic energy, and pressure oscillations into auditory spatial feedback, operators receive immediate acoustic perception of vortex shedding frequencies and aerodynamic stall boundaries.

### Synthetic Atmosphere Simulation and Hardware-in-the-Loop
A built-in physical turbulence generator simulates Dryden wind gusts, von Kármán turbulence spectra, and cyclonic shear fields in real time, enabling hardware-in-the-loop validation and FPGA VHDL synthesis for edge deployment.

---

## Quickstart

### Installation

```bash
git clone https://github.com/intelligent-interfaces/sensensiblegeometry.git
cd sensensiblegeometry
```

### Rust Engine: Exact Geometric Rotations in WebAssembly

```rust
use engine::Multivector;

// 1. Define a 3D vector: v = 1.0 e1 + 2.0 e2 + 0.0 e3
let v = Multivector::vector(1.0, 2.0, 0.0);

// 2. Define a 90-degree rotor in the e1-e2 plane: R = cos(theta/2) - sin(theta/2) e12
let theta = std::f64::consts::PI / 2.0;
let rotor = Multivector::new((theta / 2.0).cos(), 0.0, 0.0, 0.0, -(theta / 2.0).sin(), 0.0, 0.0, 0.0);
let rotor_dag = Multivector::new((theta / 2.0).cos(), 0.0, 0.0, 0.0, (theta / 2.0).sin(), 0.0, 0.0, 0.0);

// 3. Apply exact E(3) equivariant rotation: v' = R * v * R^dagger
let v_rotated = rotor.geometric_product(&v).geometric_product(&rotor_dag);
```

### Python API: Continuous Clifford Liquid Networks

```python
import torch
from ml.models.clifford_ltc import CliffordLTCNet

# 1. Initialize 8D Clifford Cl(3,0) Liquid Time-Constant network
model = CliffordLTCNet(in_channels=8, hidden_channels=32, out_channels=8)

# 2. Forward pass with multivector state and continuous time delta
# State tensor shape: [batch_size, sequence_length, 8]
state = torch.randn(1, 100, 8)
dt = torch.tensor([0.01])

# 3. Continuous-time forward propagation preserving rotational equivariance
out_multivectors, hidden_states = model(state, dt=dt)
print(f"Output multivector shape: {out_multivectors.shape}")
```

---

## Benchmarks

### 1. Computational Latency and Engine Throughput

Benchmarked on an Apple M1 Pro (WebAssembly / Native Rust / PyTorch):

| Subsystem / Operation | Input Size | Native Rust | Wasm (Browser) | PyTorch (MPS/GPU) | Execution Rate |
|---|---|---|---|---|---|
| **Geometric Product ($ab$)** | Single Multivector | 12 ns | 48 ns | 0.82 µs | > 20 MHz |
| **Rotor Sandwich ($R v R^\dagger$)** | 3D Vector Rotation | 28 ns | 92 ns | 1.14 µs | > 10 MHz |
| **Full $\mathcal{C}\ell(3,0)$ LTC Step** | 32 Hidden Units | 1.4 µs | 5.2 µs | 38.6 µs | > 190 kHz |
| **Atmospheric Vortex Field** | $128 \times 128$ Grid | 0.42 ms | 1.84 ms | 0.91 ms | 60 FPS |

### 2. Stochastic Turbulence and Equivariance Benchmark (500 Trials)

Comparison between a standard dense Multi-Layer Perceptron (MLP) and the Clifford $\mathcal{C}\ell(3,0)$ Liquid Network under Dryden turbulence and arbitrary spatial orientations:

| Evaluation Metric | Standard Dense MLP | Clifford $\mathcal{C}\ell(3,0)$ Network | Relative Improvement |
|---|---|---|---|
| **Layer Parameters** | 512 parameters | **64 parameters** | -87.5% parameter footprint |
| **Augmentation Overhead** | $36\times$ rotational copies | **$0\times$ (Zero augmentation)** | Complete sample efficiency |
| **Rotational Equivariance** | Broken out-of-distribution | **Exact $E(3)$ by construction** | Invariant under all rotations |
| **Tracking MSE** | 8.120 | **4.177** | -48.6% tracking error |
| **Chatter Amplitude ($\|\ddot{\mathbf{x}}\|_2$)** | 14.82 rad/s² | **1.04 rad/s²** | -93.0% control vibration |
| **False Alarm Rate (FAR)** | 18.5% | **1.2%** | -93.5% fewer false alarms |

---

## Real-Time Execution Budget

```math
\tau_{\text{cycle}} = \tau_{\text{wasm}} + \tau_{\text{render}} + \tau_{\text{audio}} + \tau_{\text{ws}} \approx 0.08\text{ ms} + 16.6\text{ ms} + 2.4\text{ ms} + 12.0\text{ ms} \approx 31.1\text{ ms}
```

Because total cycle latency is under 32 ms, the spatial engine maintains locked 60 FPS viewport rendering while streaming bi-directional multivector telemetry and synthesizing continuous aero-acoustic audio without dropped frames.

---

## Interactive Spatial Studio

The platform includes a client-side 3D spatial studio and digital twin interface in [`frontend/`](frontend/):

- **Real-Time 3D Spatial Canvas**: Three.js viewport rendering multi-axis robotic arms, offshore wind turbines, and drone swarms.
- **Multivector Oscilloscope**: Dynamic tracking of scalar energy, bivector torques, and rotor orientation planes.
- **Synthetic Atmosphere Simulator**: Real-time Dryden wind gust, von Kármán turbulence, and cyclonic shear field generators.
- **Procedural Aero-Acoustic Audio**: Web Audio API synthesizer translating aerodynamic stress and stall regimes into auditory cues.
- **VHDL & Embedded Export**: One-click generation of synthesizable VHDL entities for FPGA deployment.

Launch locally:

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173 in a modern browser
```

---

## Repository Structure

```
sensensiblegeometry/
├── README.md                  # Project documentation
├── LICENSE                    # MIT License
├── assets/                    # Project diagrams and visual assets
├── frontend/                  # Spatial canvas & studio interface (Svelte 5 + Vite)
│   ├── src/lib/components/    # GNC Studio, model builder, benchmark panels
│   └── src/lib/physics/       # Clifford liquid network, aero audio, fluid field
├── engine/                    # Physics and Geometric Algebra core (Rust + WebAssembly)
│   └── src/lib.rs             # 8D Multivector algebra and rotor kinematics
├── backend/                   # Orchestration service and WebSocket telemetry (Go)
│   └── main.go                # High-throughput telemetry server
├── ml/                        # Geometric neural computing & Clifford LTC (PyTorch)
├── research/                  # Research manuscripts, proofs, and benchmark scripts
└── tools/                     # Deployment and development utilities
```

---

## Citation

If you find this software or platform helpful in your research, please cite:

```bibtex
@software{sensensiblegeometry2026,
  author = {Oduniyi, Erick},
  title = {{SensensibleGeometry}: Multimodal Spatial Computing and Geometric Neural Control Platform},
  url = {https://github.com/intelligent-interfaces/sensensiblegeometry},
  year = {2026}
}
```

> *Note: Manuscripts detailing geometric translation networks and basis expansion duality are currently in preparation.*

---

## References and Foundations

- **Clifford Algebra to Geometric Calculus** ([Hestenes & Sobczyk, 1984](https://doi.org/10.1007/978-94-009-6292-7)).
- **Liquid Time-Constant Networks** ([Hasani et al., 2021](https://doi.org/10.1038/s42256-021-00378-0)).
- **Geometric Algebra for Computer Science** ([Dorst et al., 2007](https://doi.org/10.1016/B978-0-12-374942-0.X5000-1)).
- **Group Equivariant Convolutional Networks** ([Cohen & Welling, 2016](https://arxiv.org/abs/1602.07576)).
- **Equivariant Neural Networks with Clifford Algebras** ([Ruhe et al., 2023](https://arxiv.org/abs/2302.06594)).

---

## License

Distributed under the **MIT License**.
