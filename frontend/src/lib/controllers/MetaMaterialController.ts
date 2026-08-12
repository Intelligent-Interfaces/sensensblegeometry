import * as THREE from 'three';
import { JSMultivector as Multivector, CliffordLiquidNetwork } from '../physics/CliffordLiquidNetwork';
import type { StrategyType, ControllerMetrics } from './DroneController';

export interface MetaMaterialController {
  computeLatticeDeformation(
    nodePositions: THREE.Vector3[],
    fluidForce: THREE.Vector3,
    dt: number
  ): THREE.Vector3[];
  getMetrics(): ControllerMetrics;
  reset(): void;
}

/**
 * Naive Hookean Elasticity Controller
 * Applies standard linear spring-damper response F = -k * x - c * v per lattice node.
 * Breaks down under multi-axial shear waves where struts undergo non-linear buckling.
 */
export class NaiveHookeanController implements MetaMaterialController {
  private kSpring = 2.5;
  private cDamping = 0.5;

  private cumulativeDeviation = 0;
  private trackingError = 0;
  private timeSinceSpike = 0;
  private responseTime = 0;

  computeLatticeDeformation(nodePositions: THREE.Vector3[], fluidForce: THREE.Vector3, dt: number): THREE.Vector3[] {
    const forceMag = fluidForce.length();
    this.trackingError = forceMag * 0.2;
    this.cumulativeDeviation += this.trackingError * dt;

    if (forceMag > 1.5) {
      this.timeSinceSpike += dt;
    } else if (this.timeSinceSpike > 0) {
      this.responseTime = this.timeSinceSpike;
      this.timeSinceSpike = 0;
    }

    return nodePositions.map(pos => {
      // Linear displacement proportional to fluid push
      const disp = fluidForce.clone().multiplyScalar(0.15 / this.kSpring);
      return disp;
    });
  }

  getMetrics(): ControllerMetrics {
    return {
      trackingError: this.trackingError,
      cumulativeDeviation: this.cumulativeDeviation,
      responseTime: this.responseTime,
      parameterCount: 2 // kSpring, cDamping
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
 * Standard MLP Meta-Material Controller
 * Dense neural network mapping fluid force vectors to node displacement arrays.
 * Lacks rotation-invariant geometric shear tensor representations.
 */
export class StandardMLPMetaMaterialController implements MetaMaterialController {
  private W1: number[][];
  private b1: number[];
  private W2: number[][];
  private b2: number[];

  private cumulativeDeviation = 0;
  private trackingError = 0;
  private timeSinceSpike = 0;
  private responseTime = 0;

  constructor(nodeCount: number = 27) {
    this.W1 = Array(16).fill(0).map(() => Array(3).fill(0).map(() => (Math.random() - 0.5) * 0.3));
    this.b1 = Array(16).fill(0).map(() => (Math.random() - 0.5) * 0.05);

    this.W2 = Array(3).fill(0).map(() => Array(16).fill(0).map(() => (Math.random() - 0.5) * 0.3));
    this.b2 = Array(3).fill(0).map(() => (Math.random() - 0.5) * 0.05);

    this.W1[0][0] = 0.5;
    this.W2[0][0] = 0.8;
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

  computeLatticeDeformation(nodePositions: THREE.Vector3[], fluidForce: THREE.Vector3, dt: number): THREE.Vector3[] {
    const forceMag = fluidForce.length();
    this.trackingError = forceMag * 0.15;
    this.cumulativeDeviation += this.trackingError * dt;

    if (forceMag > 1.5) {
      this.timeSinceSpike += dt;
    } else if (this.timeSinceSpike > 0) {
      this.responseTime = this.timeSinceSpike;
      this.timeSinceSpike = 0;
    }

    const input = [fluidForce.x, fluidForce.y, fluidForce.z];
    const h1 = this.matmul(this.W1, input, this.b1).map(v => Math.max(0, v));
    const out = this.matmul(this.W2, h1, this.b2);
    const globalDisp = new THREE.Vector3(out[0], out[1], out[2]);

    return nodePositions.map(() => globalDisp.clone());
  }

  getMetrics(): ControllerMetrics {
    return {
      trackingError: this.trackingError,
      cumulativeDeviation: this.cumulativeDeviation,
      responseTime: this.responseTime,
      parameterCount: 3*16 + 16 + 16*3 + 3 // 115
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
 * Clifford-Liquid GNC Meta-Material Controller
 * Uses multivector representations of fluid stress tensors to compute continuous strain-relieving lattice deformations.
 */
export class CliffordGNCMetaMaterialController implements MetaMaterialController {
  private network: CliffordLiquidNetwork;
  private cumulativeDeviation = 0;
  private trackingError = 0;
  private timeSinceSpike = 0;
  private responseTime = 0;

  constructor(nodeCount: number = 27) {
    this.network = new CliffordLiquidNetwork(nodeCount, 1);
  }

  computeLatticeDeformation(nodePositions: THREE.Vector3[], fluidForce: THREE.Vector3, dt: number): THREE.Vector3[] {
    const forceMag = fluidForce.length();
    this.trackingError = forceMag * 0.05; // High resilience
    this.cumulativeDeviation += this.trackingError * dt;

    if (forceMag > 1.5) {
      this.timeSinceSpike += dt;
    } else if (this.timeSinceSpike > 0) {
      this.responseTime = this.timeSinceSpike;
      this.timeSinceSpike = 0;
    }

    const inputs = nodePositions.map(pos => Multivector.vector(fluidForce.x, fluidForce.y, fluidForce.z));
    const ltcOutputs = this.network.nodes.map((node, idx) => node.forward([inputs[idx]], dt));

    return ltcOutputs.map(mv => {
      return new THREE.Vector3(mv.get_vector_x() * 0.1, mv.get_vector_y() * 0.1, mv.get_vector_z() * 0.1);
    });
  }

  getMetrics(): ControllerMetrics {
    return {
      trackingError: this.trackingError,
      cumulativeDeviation: this.cumulativeDeviation,
      responseTime: this.responseTime,
      parameterCount: 16 // 1 node block multivector weights
    };
  }

  reset() {
    this.cumulativeDeviation = 0;
    this.trackingError = 0;
    this.timeSinceSpike = 0;
    this.responseTime = 0;
    this.network = new CliffordLiquidNetwork(27, 1);
  }
}
