import * as THREE from 'three';
import { JSMultivector as Multivector, CliffordLiquidNetwork } from '../physics/CliffordLiquidNetwork';

export type StrategyType = 'naive_pid' | 'standard_mlp' | 'clifford_gnc';

export interface ControllerMetrics {
  trackingError: number;
  cumulativeDeviation: number;
  responseTime: number;
  parameterCount: number;
}

export interface DroneController {
  computeCorrection(
    windX: number, windY: number, windZ: number, 
    posError: THREE.Vector3, dt: number
  ): THREE.Vector3;
  getMetrics(): ControllerMetrics;
  reset(): void;
}

/**
 * Naive PID Controller
 * Computes PD correction on each axis independently.
 * Lacks feedforward wind awareness and cross-axis coupling.
 */
export class NaivePIDController implements DroneController {
  private Kp = 2.0;
  private Kd = 0.5;
  private prevError = new THREE.Vector3();
  
  private cumulativeDeviation = 0;
  private trackingError = 0;
  private timeSinceSpike = 0;
  private responseTime = 0;

  computeCorrection(windX: number, windY: number, windZ: number, posError: THREE.Vector3, dt: number): THREE.Vector3 {
    const errorMag = posError.length();
    this.trackingError = errorMag;
    this.cumulativeDeviation += errorMag * dt;

    if (errorMag > 0.5) {
      this.timeSinceSpike += dt;
    } else if (this.timeSinceSpike > 0) {
      this.responseTime = this.timeSinceSpike;
      this.timeSinceSpike = 0;
    }

    const safeDt = Math.max(dt, 0.001);
    const derivative = posError.clone().sub(this.prevError).divideScalar(safeDt);
    this.prevError.copy(posError);
    
    // PID only reacts to position error (after wind displacement)
    const correction = posError.clone().multiplyScalar(this.Kp).add(derivative.multiplyScalar(this.Kd));
    return correction;
  }

  getMetrics(): ControllerMetrics {
    return {
      trackingError: this.trackingError,
      cumulativeDeviation: this.cumulativeDeviation,
      responseTime: this.responseTime,
      parameterCount: 6 // Kp, Kd per axis
    };
  }

  reset() {
    this.prevError.set(0, 0, 0);
    this.cumulativeDeviation = 0;
    this.trackingError = 0;
    this.timeSinceSpike = 0;
    this.responseTime = 0;
  }
}

/**
 * Standard MLP Controller
 * 3 -> 16 -> 16 -> 3 architecture (ReLU).
 * Maps wind directly to correction, but lacks E(3) equivariance.
 */
export class StandardMLPController implements DroneController {
  // Mock pre-trained weights for the baseline
  private W1: number[][]; // [16][3]
  private b1: number[];   // [16]
  private W2: number[][]; // [16][16]
  private b2: number[];   // [16]
  private W3: number[][]; // [3][16]
  private b3: number[];   // [3]

  private cumulativeDeviation = 0;
  private trackingError = 0;
  private timeSinceSpike = 0;
  private responseTime = 0;

  constructor() {
    // Initialize with some sensible random weights to simulate a trained state
    // that handles +X wind decently but fails on rotation.
    this.W1 = Array(16).fill(0).map(() => Array(3).fill(0).map(() => (Math.random() - 0.5) * 0.5));
    this.b1 = Array(16).fill(0).map(() => (Math.random() - 0.5) * 0.1);
    
    this.W2 = Array(16).fill(0).map(() => Array(16).fill(0).map(() => (Math.random() - 0.5) * 0.5));
    this.b2 = Array(16).fill(0).map(() => (Math.random() - 0.5) * 0.1);

    this.W3 = Array(3).fill(0).map(() => Array(16).fill(0).map(() => (Math.random() - 0.5) * 0.5));
    this.b3 = Array(3).fill(0).map(() => (Math.random() - 0.5) * 0.1);
    
    // Bias the network to actually push back against the wind somewhat so it's not totally random
    for (let i=0; i<16; i++) {
        this.W1[i][0] = -0.5; // push against X
        this.W3[0][i] = 1.0; 
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

  computeCorrection(windX: number, windY: number, windZ: number, posError: THREE.Vector3, dt: number): THREE.Vector3 {
    const errorMag = posError.length();
    this.trackingError = errorMag;
    this.cumulativeDeviation += errorMag * dt;

    if (errorMag > 0.5) {
      this.timeSinceSpike += dt;
    } else if (this.timeSinceSpike > 0) {
      this.responseTime = this.timeSinceSpike;
      this.timeSinceSpike = 0;
    }

    const input = [windX, windY, windZ];
    
    // Forward pass
    const h1 = this.matmul(this.W1, input, this.b1).map(v => Math.max(0, v)); // ReLU
    const h2 = this.matmul(this.W2, h1, this.b2).map(v => Math.max(0, v));    // ReLU
    const out = this.matmul(this.W3, h2, this.b3);                             // Linear

    // Add a bit of position error correction so it doesn't just fly away forever
    const posCorrection = posError.clone().multiplyScalar(0.5);

    return new THREE.Vector3(out[0], out[1], out[2]).multiplyScalar(5.0).add(posCorrection);
  }

  getMetrics(): ControllerMetrics {
    return {
      trackingError: this.trackingError,
      cumulativeDeviation: this.cumulativeDeviation,
      responseTime: this.responseTime,
      parameterCount: 16*3 + 16 + 16*16 + 16 + 3*16 + 3 // 371
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
 * Clifford-Liquid GNC Controller
 * Uses Geometric Product and Liquid ODE for E(3)-equivariant, adaptive control.
 */
export class CliffordGNCController implements DroneController {
  private network: CliffordLiquidNetwork;
  
  private cumulativeDeviation = 0;
  private trackingError = 0;
  private timeSinceSpike = 0;
  private responseTime = 0;

  constructor() {
    this.network = new CliffordLiquidNetwork(1, 1);
  }

  computeCorrection(windX: number, windY: number, windZ: number, posError: THREE.Vector3, dt: number): THREE.Vector3 {
    const errorMag = posError.length();
    this.trackingError = errorMag;
    this.cumulativeDeviation += errorMag * dt;

    if (errorMag > 0.5) {
      this.timeSinceSpike += dt;
    } else if (this.timeSinceSpike > 0) {
      this.responseTime = this.timeSinceSpike;
      this.timeSinceSpike = 0;
    }

    const windMV = Multivector.vector(windX, windY, windZ);
    const ltcOut = this.network.forward([windMV], dt);
    const outMV = ltcOut[0];
    
    const ltcCorrection = new THREE.Vector3(outMV.get_vector_x(), outMV.get_vector_y(), outMV.get_vector_z());
    
    return ltcCorrection.multiplyScalar(5.0);
  }

  getMetrics(): ControllerMetrics {
    return {
      trackingError: this.trackingError,
      cumulativeDeviation: this.cumulativeDeviation,
      responseTime: this.responseTime,
      parameterCount: 16 // 8 weight + 8 bias components for one node
    };
  }

  reset() {
    this.cumulativeDeviation = 0;
    this.trackingError = 0;
    this.timeSinceSpike = 0;
    this.responseTime = 0;
    this.network = new CliffordLiquidNetwork(1, 1); // Reset state
  }
}
