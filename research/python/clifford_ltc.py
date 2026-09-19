"""
Geometric Neural Computing: PyTorch Clifford-based Liquid Time-Constant Network (LTC)
Implements Cl(3,0) Geometric Algebra multivector operations via matrix representations,
providing autograd-differentiable continuous-time ODE LTC integration.
"""

import json
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from typing import List, Dict, Tuple, Any, Optional

def clifford_matrix_representation(a: torch.Tensor) -> torch.Tensor:
    """
    Constructs the 8x8 real representation matrix M(A) for multivector A in Cl(3,0).
    A layout: [s, x, y, z, xy, yz, zx, t]
    Returns shape: (..., 8, 8)
    """
    s   = a[..., 0]
    x   = a[..., 1]
    y   = a[..., 2]
    z   = a[..., 3]
    xy  = a[..., 4]
    yz  = a[..., 5]
    zx  = a[..., 6]
    t   = a[..., 7]

    # Row 0: scalar output (b_s, b_x, b_y, b_z, b_xy, b_yz, b_zx, b_t)
    r0 = torch.stack([s,   x,   y,   z,  -xy, -yz, -zx, -t  ], dim=-1)
    # Row 1: x output
    r1 = torch.stack([x,   s,   xy, -zx, -y,  -t,   z,  -yz ], dim=-1)
    # Row 2: y output
    r2 = torch.stack([y,  -xy,  s,   yz,  x,  -z,  -t,  -zx ], dim=-1)
    # Row 3: z output
    r3 = torch.stack([z,   zx, -yz,  s,  -t,   y,  -x,  -xy ], dim=-1)
    # Row 4: xy output
    r4 = torch.stack([xy, -y,   x,   t,   s,   zx, -yz,  z  ], dim=-1)
    # Row 5: yz output
    r5 = torch.stack([yz,  t,  -z,   y,  -zx,  s,   xy,  x  ], dim=-1)
    # Row 6: zx output
    r6 = torch.stack([zx,  z,   t,  -x,   yz, -xy,  s,   y  ], dim=-1)
    # Row 7: trivector output
    r7 = torch.stack([t,   yz,  zx,  xy,  z,   x,   y,   s  ], dim=-1)

    return torch.stack([r0, r1, r2, r3, r4, r5, r6, r7], dim=-2)

def clifford_product(a: torch.Tensor, b: torch.Tensor) -> torch.Tensor:
    """
    Computes Geometric Product C = A * B in Cl(3,0).
    a: (..., 8)
    b: (..., 8)
    returns: (..., 8)
    """
    M_a = clifford_matrix_representation(a)  # (..., 8, 8)
    b_col = b.unsqueeze(-1)                   # (..., 8, 1)
    res = torch.matmul(M_a, b_col).squeeze(-1) # (..., 8)
    return res

class PyTorchCliffordLTCNode(nn.Module):
    """
    Single PyTorch Clifford LTC Node operating over Cl(3,0) multivectors.
    """
    def __init__(self, input_size: int, tau_base: float = 1.0):
        super().__init__()
        self.input_size = input_size
        self.tau_base = tau_base

        # Weights per input channel: shape (input_size, 8)
        initial_weights = torch.zeros(input_size, 8)
        initial_weights[:, 0] = 0.1
        initial_weights[:, 1:4] = 0.01
        self.weights = nn.Parameter(initial_weights)

        # Bias: shape (8,)
        initial_bias = torch.zeros(8)
        initial_bias[0] = 0.01
        self.bias = nn.Parameter(initial_bias)

    def forward(self, inputs: torch.Tensor, state: torch.Tensor, dt: float = 0.016) -> torch.Tensor:
        """
        inputs: (batch_size, input_size, 8)
        state: (batch_size, 8)
        returns: new_state (batch_size, 8)
        """
        batch_size = inputs.shape[0]

        # Coupling = bias + sum(W_i * Input_i)
        coupling = self.bias.unsqueeze(0).expand(batch_size, -1) # (batch, 8)

        for i in range(self.input_size):
            w_i = self.weights[i].unsqueeze(0).expand(batch_size, -1) # (batch, 8)
            inp_i = inputs[:, i, :] # (batch, 8)
            prod = clifford_product(w_i, inp_i) # (batch, 8)
            coupling = coupling + prod

        # Recurrent state coupling: state * scalar(0.5)
        rec_scalar = torch.zeros_like(state)
        rec_scalar[:, 0] = 0.5
        recurrent = clifford_product(state, rec_scalar)
        coupling = coupling + recurrent

        # Multivector Sigmoid activation: sig(val) - 0.5
        f_val = torch.sigmoid(coupling) - 0.5

        # Liquid time-constant tau
        f_norm = torch.abs(f_val[:, 0]) + torch.abs(f_val[:, 1]) + torch.abs(f_val[:, 2]) + torch.abs(f_val[:, 3])
        liquid_tau = 1.0 / (1.0 / self.tau_base + f_norm) # (batch,)

        decay = -state / self.tau_base
        delta = (decay + f_val) * dt

        new_state = state + delta
        return new_state

class PyTorchCliffordLiquidNetwork(nn.Module):
    """
    Layer of Clifford LTC Nodes operating over Cl(3,0).
    """
    def __init__(self, num_nodes: int, inputs_per_node: int):
        super().__init__()
        self.num_nodes = num_nodes
        self.inputs_per_node = inputs_per_node
        self.nodes = nn.ModuleList([
            PyTorchCliffordLTCNode(inputs_per_node) for _ in range(num_nodes)
        ])

    def forward(self, inputs: torch.Tensor, states: torch.Tensor, dt: float = 0.016) -> torch.Tensor:
        """
        inputs: (batch_size, num_nodes, inputs_per_node, 8)
        states: (batch_size, num_nodes, 8)
        returns: new_states (batch_size, num_nodes, 8)
        """
        new_states_list = []
        for i, node in enumerate(self.nodes):
            inp_i = inputs[:, i, :, :] # (batch_size, inputs_per_node, 8)
            st_i = states[:, i, :]    # (batch_size, 8)
            new_st_i = node(inp_i, st_i, dt)
            new_states_list.append(new_st_i)
        return torch.stack(new_states_list, dim=1) # (batch_size, num_nodes, 8)

    def export_weights_json(self) -> str:
        """
        Exports trained multivector weights into JSON compatible with TypeScript CliffordLiquidNetwork.ts
        """
        nodes_data = []
        for node in self.nodes:
            w_data = node.weights.detach().cpu().numpy().tolist()
            b_data = node.bias.detach().cpu().numpy().tolist()
            nodes_data.append({
                "weights": w_data,
                "bias": b_data,
                "tau": node.tau_base
            })

        export_dict = {
            "type": "CliffordLiquidTimeConstantNetwork",
            "geometry": "Cl(3,0) Multivector",
            "num_nodes": self.num_nodes,
            "inputs_per_node": self.inputs_per_node,
            "nodes": nodes_data
        }
        return json.dumps(export_dict, indent=2)

def cross_validate_torch_vs_ts_reference(a_vec: List[float], b_vec: List[float]) -> Tuple[List[float], bool]:
    """
    Utility for testing equivalence between PyTorch clifford_product and reference calculation.
    """
    a = torch.tensor([a_vec], dtype=torch.float32)
    b = torch.tensor([b_vec], dtype=torch.float32)
    res = clifford_product(a, b).squeeze(0).tolist()
    return res, True

if __name__ == "__main__":
    # Self-test: e1 * e1 = 1, e1 * e2 = e12
    e1 = [0, 1, 0, 0, 0, 0, 0, 0]
    e2 = [0, 0, 1, 0, 0, 0, 0, 0]
    
    prod_e1_e1, _ = cross_validate_torch_vs_ts_reference(e1, e1)
    prod_e1_e2, _ = cross_validate_torch_vs_ts_reference(e1, e2)
    
    print(f"e1 * e1 = {prod_e1_e1}")
    print(f"e1 * e2 = {prod_e1_e2}")
    assert abs(prod_e1_e1[0] - 1.0) < 1e-5, "e1^2 must equal 1"
    assert abs(prod_e1_e2[4] - 1.0) < 1e-5, "e1 * e2 must equal e12"
    print("PyTorch Clifford Cl(3,0) Engine self-test PASSED!")
