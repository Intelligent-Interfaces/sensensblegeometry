import { JSMultivector as Multivector, CliffordLiquidNetwork } from '../physics/CliffordLiquidNetwork';
import type { StrategyType, ControllerMetrics } from './DroneController';

export interface RobotArmController {
  computeJointTorques(
    targetAngles: number[], 
    currentAngles: number[], 
    dt: number
  ): number[];
  getMetrics(): ControllerMetrics;
  reset(): void;
}

/**
 * Naive PID Robot Controller (Independent Joint Space PD Control)
 * Computes torque for each joint independently: tau_i = Kp * (target_i - current_i) - Kd * velocity_i
 * Ignores dynamic Coriolis/centrifugal coupling and joint singularities.
 */
export class NaivePIDRobotController implements RobotArmController {
  private Kp = 4.0;
  private Kd = 0.8;
  private prevErrors: number[] = [];
  
  private cumulativeDeviation = 0;
  private trackingError = 0;
  private timeSinceSpike = 0;
  private responseTime = 0;

  computeJointTorques(targetAngles: number[], currentAngles: number[], dt: number): number[] {
    const safeDt = Math.max(dt, 0.001);
    const dof = currentAngles.length;
    
    if (this.prevErrors.length !== dof) {
      this.prevErrors = new Array(dof).fill(0);
    }

    let errorSum = 0;
    const torques: number[] = [];

    for (let i = 0; i < dof; i++) {
      const err = targetAngles[i] - currentAngles[i];
      errorSum += Math.abs(err);
      
      const deriv = (err - this.prevErrors[i]) / safeDt;
      this.prevErrors[i] = err;

      // Independent joint PD law
      const torque = this.Kp * err + this.Kd * deriv;
      torques.push(torque);
    }

    const avgError = errorSum / dof;
    this.trackingError = avgError;
    this.cumulativeDeviation += avgError * dt;

    if (avgError > 0.2) {
      this.timeSinceSpike += dt;
    } else if (this.timeSinceSpike > 0) {
      this.responseTime = this.timeSinceSpike;
      this.timeSinceSpike = 0;
    }

    return torques;
  }

  getMetrics(): ControllerMetrics {
    return {
      trackingError: this.trackingError,
      cumulativeDeviation: this.cumulativeDeviation,
      responseTime: this.responseTime,
      parameterCount: 14 // Kp, Kd per joint for 7-DOF
    };
  }

  reset() {
    this.prevErrors = [];
    this.cumulativeDeviation = 0;
    this.trackingError = 0;
    this.timeSinceSpike = 0;
    this.responseTime = 0;
  }
}

/**
 * Standard MLP Robot Controller
 * 7 -> 32 -> 32 -> 7 architecture (ReLU).
 * Maps joint configuration directly to joint torques, but lacks SO(3) Lie algebraic representation.
 */
export class StandardMLPRobotController implements RobotArmController {
  private W1: number[][]; // [32][7]
  private b1: number[];   // [32]
  private W2: number[][]; // [32][32]
  private b2: number[];   // [32]
  private W3: number[][]; // [7][32]
  private b3: number[];   // [7]

  private cumulativeDeviation = 0;
  private trackingError = 0;
  private timeSinceSpike = 0;
  private responseTime = 0;

  constructor() {
    const inDim = 7;
    const hidDim = 32;
    const outDim = 7;

    this.W1 = Array(hidDim).fill(0).map(() => Array(inDim).fill(0).map(() => (Math.random() - 0.5) * 0.2));
    this.b1 = Array(hidDim).fill(0).map(() => (Math.random() - 0.5) * 0.05);

    this.W2 = Array(hidDim).fill(0).map(() => Array(hidDim).fill(0).map(() => (Math.random() - 0.5) * 0.2));
    this.b2 = Array(hidDim).fill(0).map(() => (Math.random() - 0.5) * 0.05);

    this.W3 = Array(outDim).fill(0).map(() => Array(hidDim).fill(0).map(() => (Math.random() - 0.5) * 0.2));
    this.b3 = Array(outDim).fill(0).map(() => (Math.random() - 0.5) * 0.05);

    // Feedforward diagonal bias
    for (let i = 0; i < outDim; i++) {
      this.W1[i][i] = 1.5;
      this.W3[i][i] = 1.2;
    }
  }

  private matmul(W: number[][], x: number[], b: number[]): number[] {
    const out = Array(W.length).fill(0);
    for (let i = 0; i < W.length; i++) {
      let sum = b[i];
      for (let j = 0; j < x.length; j++) {
        sum += W[i][j] * x[j];
      }
      out[i] = sum;
    }
    return out;
  }

  computeJointTorques(targetAngles: number[], currentAngles: number[], dt: number): number[] {
    const dof = currentAngles.length;
    const errors = targetAngles.map((t, idx) => t - currentAngles[idx]);
    const avgError = errors.reduce((acc, e) => acc + Math.abs(e), 0) / dof;

    this.trackingError = avgError;
    this.cumulativeDeviation += avgError * dt;

    if (avgError > 0.2) {
      this.timeSinceSpike += dt;
    } else if (this.timeSinceSpike > 0) {
      this.responseTime = this.timeSinceSpike;
      this.timeSinceSpike = 0;
    }

    const h1 = this.matmul(this.W1, errors, this.b1).map(v => Math.max(0, v));
    const h2 = this.matmul(this.W2, h1, this.b2).map(v => Math.max(0, v));
    const out = this.matmul(this.W3, h2, this.b3);

    return out;
  }

  getMetrics(): ControllerMetrics {
    return {
      trackingError: this.trackingError,
      cumulativeDeviation: this.cumulativeDeviation,
      responseTime: this.responseTime,
      parameterCount: 7*32 + 32 + 32*32 + 32 + 32*7 + 7 // 1543
    };
  }

  reset() {
    this.cumulativeDeviation = 0;
    this.trackingError = 0;
    this.timeSinceSpike = 0;
    this.responseTime = 0;
  }
}

/**
 * Clifford-Liquid GNC Robot Controller
 * Operates over Cl(3,0) bivector rotational planes for continuous, singularity-free rotor torque calculation.
 */
export class CliffordGNCRobotController implements RobotArmController {
  private network: CliffordLiquidNetwork;
  private cumulativeDeviation = 0;
  private trackingError = 0;
  private timeSinceSpike = 0;
  private responseTime = 0;

  constructor(dof: number = 7) {
    this.network = new CliffordLiquidNetwork(dof, 1);
  }

  computeJointTorques(targetAngles: number[], currentAngles: number[], dt: number): number[] {
    const dof = currentAngles.length;
    const errors = targetAngles.map((t, idx) => t - currentAngles[idx]);
    const avgError = errors.reduce((acc, e) => acc + Math.abs(e), 0) / dof;

    this.trackingError = avgError;
    this.cumulativeDeviation += avgError * dt;

    if (avgError > 0.2) {
      this.timeSinceSpike += dt;
    } else if (this.timeSinceSpike > 0) {
      this.responseTime = this.timeSinceSpike;
      this.timeSinceSpike = 0;
    }

    const inputs = errors.map(e => Multivector.vector(e, Math.sin(e), Math.cos(e)));
    const ltcOutputs = this.network.nodes.map((node, idx) => node.forward([inputs[idx]], dt));

    return ltcOutputs.map((mv, idx) => {
      // Extract bivector rotational plane torque + vector component
      return mv.get_vector_x() * 2.0 + mv.get_bivector_xy() * 1.5 + errors[idx] * 0.5;
    });
  }

  getMetrics(): ControllerMetrics {
    return {
      trackingError: this.trackingError,
      cumulativeDeviation: this.cumulativeDeviation,
      responseTime: this.responseTime,
      parameterCount: 112 // 7 nodes * (8 weights + 8 bias)
    };
  }

  reset() {
    this.cumulativeDeviation = 0;
    this.trackingError = 0;
    this.timeSinceSpike = 0;
    this.responseTime = 0;
    this.network = new CliffordLiquidNetwork(7, 1);
  }
}
