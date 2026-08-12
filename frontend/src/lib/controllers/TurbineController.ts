import { JSMultivector as Multivector, CliffordLiquidNetwork } from '../physics/CliffordLiquidNetwork';
import type { StrategyType, ControllerMetrics } from './DroneController';

export interface TurbineController {
  computePitchCorrection(
    windSpeed: number,
    rpmError: number,
    dt: number
  ): { pitchAdjustment: number; rpmDamping: number };
  getMetrics(): ControllerMetrics;
  reset(): void;
}

/**
 * Naive PID Turbine Controller
 * Classic pitch control loop based purely on RPM threshold error.
 * Suffers from controller windup and over-actuation during sudden atmospheric squalls.
 */
export class NaivePIDTurbineController implements TurbineController {
  private Kp = 1.5;
  private Kd = 0.4;
  private prevError = 0;

  private cumulativeDeviation = 0;
  private trackingError = 0;
  private timeSinceSpike = 0;
  private responseTime = 0;

  computePitchCorrection(windSpeed: number, rpmError: number, dt: number): { pitchAdjustment: number; rpmDamping: number } {
    const safeDt = Math.max(dt, 0.001);
    const absErr = Math.abs(rpmError);

    this.trackingError = absErr;
    this.cumulativeDeviation += absErr * dt;

    if (absErr > 5.0) {
      this.timeSinceSpike += dt;
    } else if (this.timeSinceSpike > 0) {
      this.responseTime = this.timeSinceSpike;
      this.timeSinceSpike = 0;
    }

    const deriv = (rpmError - this.prevError) / safeDt;
    this.prevError = rpmError;

    // Reacts only after RPM over-speed has occurred
    const pitchAdjustment = this.Kp * rpmError + this.Kd * deriv;
    const rpmDamping = 0.95;

    return { pitchAdjustment, rpmDamping };
  }

  getMetrics(): ControllerMetrics {
    return {
      trackingError: this.trackingError,
      cumulativeDeviation: this.cumulativeDeviation,
      responseTime: this.responseTime,
      parameterCount: 4 // Kp, Kd for pitch & RPM loops
    };
  }

  reset() {
    this.prevError = 0;
    this.cumulativeDeviation = 0;
    this.trackingError = 0;
    this.timeSinceSpike = 0;
    this.responseTime = 0;
  }
}

/**
 * Standard MLP Turbine Controller
 * Multi-Layer Perceptron (2 -> 16 -> 16 -> 2) mapping wind speed and RPM error to blade pitch.
 * Lacks liquid dynamic adaptation during turbulent tornadic shear spikes.
 */
export class StandardMLPTurbineController implements TurbineController {
  private W1: number[][];
  private b1: number[];
  private W2: number[][];
  private b2: number[];
  private W3: number[][];
  private b3: number[];

  private cumulativeDeviation = 0;
  private trackingError = 0;
  private timeSinceSpike = 0;
  private responseTime = 0;

  constructor() {
    this.W1 = Array(16).fill(0).map(() => Array(2).fill(0).map(() => (Math.random() - 0.5) * 0.4));
    this.b1 = Array(16).fill(0).map(() => (Math.random() - 0.5) * 0.1);

    this.W2 = Array(16).fill(0).map(() => Array(16).fill(0).map(() => (Math.random() - 0.5) * 0.4));
    this.b2 = Array(16).fill(0).map(() => (Math.random() - 0.5) * 0.1);

    this.W3 = Array(2).fill(0).map(() => Array(16).fill(0).map(() => (Math.random() - 0.5) * 0.4));
    this.b3 = Array(2).fill(0).map(() => (Math.random() - 0.5) * 0.1);

    this.W1[0][0] = 0.8;
    this.W1[1][1] = 1.2;
    this.W3[0][0] = 1.0;
    this.W3[1][1] = 0.5;
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

  computePitchCorrection(windSpeed: number, rpmError: number, dt: number): { pitchAdjustment: number; rpmDamping: number } {
    const absErr = Math.abs(rpmError);
    this.trackingError = absErr;
    this.cumulativeDeviation += absErr * dt;

    if (absErr > 5.0) {
      this.timeSinceSpike += dt;
    } else if (this.timeSinceSpike > 0) {
      this.responseTime = this.timeSinceSpike;
      this.timeSinceSpike = 0;
    }

    const input = [windSpeed, rpmError];
    const h1 = this.matmul(this.W1, input, this.b1).map(v => Math.max(0, v));
    const h2 = this.matmul(this.W2, h1, this.b2).map(v => Math.max(0, v));
    const out = this.matmul(this.W3, h2, this.b3);

    return {
      pitchAdjustment: out[0],
      rpmDamping: Math.min(0.99, Math.max(0.85, 0.95 - out[1] * 0.05))
    };
  }

  getMetrics(): ControllerMetrics {
    return {
      trackingError: this.trackingError,
      cumulativeDeviation: this.cumulativeDeviation,
      responseTime: this.responseTime,
      parameterCount: 2*16 + 16 + 16*16 + 16 + 16*2 + 2 // 354
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
 * Clifford-Liquid GNC Turbine Controller
 * Embeds wind speed vector and fluid shear into Cl(3,0) multivectors with liquid ODE adaptation.
 */
export class CliffordGNCTurbineController implements TurbineController {
  private network: CliffordLiquidNetwork;
  private cumulativeDeviation = 0;
  private trackingError = 0;
  private timeSinceSpike = 0;
  private responseTime = 0;

  constructor() {
    this.network = new CliffordLiquidNetwork(1, 1);
  }

  computePitchCorrection(windSpeed: number, rpmError: number, dt: number): { pitchAdjustment: number; rpmDamping: number } {
    const absErr = Math.abs(rpmError);
    this.trackingError = absErr;
    this.cumulativeDeviation += absErr * dt;

    if (absErr > 5.0) {
      this.timeSinceSpike += dt;
    } else if (this.timeSinceSpike > 0) {
      this.responseTime = this.timeSinceSpike;
      this.timeSinceSpike = 0;
    }

    const windMV = Multivector.vector(windSpeed, rpmError, 0);
    const ltcOut = this.network.forward([windMV], dt);
    const outMV = ltcOut[0];

    const pitchAdjustment = outMV.get_scalar() + outMV.get_vector_x() * 0.5;
    const rpmDamping = 0.95 - Math.abs(outMV.get_bivector_xy()) * 0.02;

    return { pitchAdjustment, rpmDamping };
  }

  getMetrics(): ControllerMetrics {
    return {
      trackingError: this.trackingError,
      cumulativeDeviation: this.cumulativeDeviation,
      responseTime: this.responseTime,
      parameterCount: 16
    };
  }

  reset() {
    this.cumulativeDeviation = 0;
    this.trackingError = 0;
    this.timeSinceSpike = 0;
    this.responseTime = 0;
    this.network = new CliffordLiquidNetwork(1, 1);
  }
}
