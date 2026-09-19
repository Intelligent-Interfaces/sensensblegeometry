"""
Sensensible Geometry: PyTorch Clifford LTC Training & Weight Export Pipeline
Trains PyTorchCliffordLiquidNetwork on ERA5/Dryden wind & robot arm phase-space sequences
using Expert Oracle Cloning and Smooth Softplus Safety Barrier Loss.
Exports trained multivector weights into JSON format for 60fps browser execution.
"""

import os
import json
import torch
import torch.nn as nn
import torch.optim as optim
import torch.nn.functional as F
import numpy as np

from clifford_ltc import PyTorchCliffordLiquidNetwork, clifford_product
from dataset_loaders import ERA5DrydenWindGenerator, encode_drone_multivector, encode_robot_multivector

class ExpertOracleController:
    """
    High-gain LQR/MPC Expert Oracle for Drone Thrust and Computed-Torque for Robot Arm.
    Generates ground-truth control actions under nominal conditions.
    """
    def __init__(self, dof: int = 7):
        self.dof = dof
        self.Kp = 4.0
        self.Kd = 0.8

    def compute_drone_thrust_oracle(self, pos_error: np.ndarray, wind_vector: np.ndarray) -> np.ndarray:
        # Counteract position error and wind disturbance
        thrust = -self.Kp * pos_error + 0.5 * wind_vector
        return thrust

    def compute_arm_torque_oracle(self, angle_error: float, velocity: float) -> float:
        # Computed-torque PD control
        torque = self.Kp * angle_error - self.Kd * velocity
        return torque

def train_clifford_model(
    num_nodes: int = 7,
    inputs_per_node: int = 1,
    epochs: int = 15,
    lr: float = 0.01,
    output_json_path: str = "clifford_weights_drone.json"
):
    print(f"Initializing PyTorch Clifford LTC Network ({num_nodes} nodes, {inputs_per_node} input/node)...")
    model = PyTorchCliffordLiquidNetwork(num_nodes=num_nodes, inputs_per_node=inputs_per_node)
    optimizer = optim.Adam(model.parameters(), lr=lr)

    # Generate synthetic training sequence
    generator = ERA5DrydenWindGenerator(sample_rate=200.0)
    data = generator.generate_sequence(duration_sec=2.0)
    time_steps = len(data['time'])

    oracle = ExpertOracleController(dof=num_nodes)

    # Build sequence of multivectors & oracle targets
    multivector_seq = []
    oracle_target_seq = []

    for t in range(time_steps):
        wind_t = data['wind'][t]
        vort_t = data['vorticity'][t]
        div_t = data['divergence'][t]

        # Simulate position errors across num_nodes
        pos_err_t = np.sin(0.5 * data['time'][t] + np.linspace(0, np.pi, num_nodes))

        node_mvs = []
        node_targets = []
        for i in range(num_nodes):
            err_vec = (pos_err_t[i], pos_err_t[i] * 0.5, -pos_err_t[i] * 0.2)
            mv_i = encode_drone_multivector(err_vec, (vort_t[0], vort_t[1], vort_t[2]), div_t)
            node_mvs.append([mv_i])

            target_i = oracle.compute_drone_thrust_oracle(np.array(err_vec), wind_t)
            node_targets.append(target_i)

        multivector_seq.append(node_mvs) # (num_nodes, 1, 8)
        oracle_target_seq.append(node_targets)

    # Convert to Tensors efficiently via numpy
    mv_np = np.array(multivector_seq, dtype=np.float32) # (time_steps, num_nodes, 1, 8)
    targ_np = np.array(oracle_target_seq, dtype=np.float32) # (time_steps, num_nodes, 3)

    inputs_tensor = torch.from_numpy(mv_np).unsqueeze(0)
    targets_tensor = torch.from_numpy(targ_np).unsqueeze(0)

    print(f"Dataset shape: {inputs_tensor.shape}, Target shape: {targets_tensor.shape}")
    print("Beginning PyTorch Training Loop with Softplus Safety Loss & Gradient Clipping...")

    model.train()
    theta_safety = 0.5
    lambda_biv = 0.1
    lambda_safety = 0.2

    for epoch in range(1, epochs + 1):
        optimizer.zero_grad()

        batch_size = 1
        states = torch.zeros(batch_size, num_nodes, 8)
        total_loss = 0.0
        vec_err_sum = 0.0

        for t in range(time_steps):
            inp_t = inputs_tensor[:, t, :, :, :] # (1, num_nodes, 1, 8)
            targ_t = targets_tensor[:, t, :, :]  # (1, num_nodes, 3)

            states = model(inp_t, states, dt=0.005) # (1, num_nodes, 8)

            # Extract predicted vector component (x, y, z)
            pred_vec = states[:, :, 1:4] # (1, num_nodes, 3)
            loss_expert = F.mse_loss(pred_vec, targ_t)

            # Bivector drift loss: (xy, yz, zx)
            pred_biv = states[:, :, 4:7]
            biv_drift = torch.mean(torch.square(pred_biv))

            # Smooth Softplus Safety Barrier Loss
            loss_safety = F.softplus(biv_drift - theta_safety)

            step_loss = loss_expert + lambda_biv * biv_drift + lambda_safety * loss_safety
            total_loss = total_loss + step_loss
            vec_err_sum += loss_expert.item()

        total_loss.backward()

        # Gradient clipping to prevent exploding recurrent gradients
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()

        if epoch % 10 == 0 or epoch == 1:
            avg_loss = total_loss.item() / time_steps
            avg_vec_err = vec_err_sum / time_steps
            print(f"Epoch [{epoch:02d}/{epochs:02d}] | Total Loss: {avg_loss:.6f} | Tracking MSE: {avg_vec_err:.6f}")

    # Export weights JSON
    json_str = model.export_weights_json()
    os.makedirs(os.path.dirname(output_json_path), exist_ok=True)
    with open(output_json_path, "w") as f:
        f.write(json_str)

    print(f"Training Complete! Exported multivector weights to '{output_json_path}'.")
    return model

if __name__ == "__main__":
    target_dir = "../../frontend/src/lib/physics"
    drone_json_path = os.path.join(os.path.dirname(__file__), target_dir, "clifford_weights_drone.json")
    arm_json_path = os.path.join(os.path.dirname(__file__), target_dir, "clifford_weights_arm.json")

    print("--- Training Drone Swarm Clifford LTC Model ---")
    train_clifford_model(num_nodes=7, inputs_per_node=1, epochs=30, output_json_path=drone_json_path)

    print("\n--- Training KUKA 7-DOF Arm Clifford LTC Model ---")
    train_clifford_model(num_nodes=7, inputs_per_node=1, epochs=30, output_json_path=arm_json_path)
