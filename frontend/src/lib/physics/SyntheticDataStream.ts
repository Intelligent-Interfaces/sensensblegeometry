import * as THREE from 'three';
import { JSMultivector as Multivector } from './CliffordLiquidNetwork';

export type PresetScenario = 'ERA5_CALM' | 'DRYDEN_GUST' | 'CYCLONIC_SHEAR' | 'ALLEY_TORNADO';

export interface BifurcationEvent {
  startFrac: number;
  endFrac: number;
  type: 1 | 2; // 1 = P-Bifurcation (Transient), 2 = D-Bifurcation (Structural)
  name: string;
  description: string;
}

export interface SyntheticSample {
  time: number;
  wind: THREE.Vector3;
  vorticity: THREE.Vector3; // (w_xy, w_yz, w_zx)
  divergence: number;
  label: 0 | 1 | 2; // 0 = Normal, 1 = P-Bifurcation, 2 = D-Bifurcation
  labelName: string;
  bivectorNorm: number;
  energyScalar: number;
  multivector: Multivector;
}

export interface ScenarioConfig {
  name: string;
  description: string;
  durationSec: number;
  baseWind: [number, number, number];
  turbulenceIntensity: number;
  events: BifurcationEvent[];
}

export const PRESET_CONFIGS: Record<PresetScenario, ScenarioConfig> = {
  ERA5_CALM: {
    name: 'ERA5 Quiet Baseline',
    description: 'Empirical boundary layer wind with gentle Dryden atmospheric turbulence. Zero structural bifurcations.',
    durationSec: 10.0,
    baseWind: [4.0, 1.5, 0.5],
    turbulenceIntensity: 0.12,
    events: []
  },
  DRYDEN_GUST: {
    name: 'Dryden Gust (P-Bifurcation)',
    description: 'Transient aerodynamic gust pulse at t=3.0s–4.5s. Self-recovering without permanent structural divergence.',
    durationSec: 10.0,
    baseWind: [6.0, 2.0, 0.5],
    turbulenceIntensity: 0.25,
    events: [
      {
        startFrac: 0.30,
        endFrac: 0.45,
        type: 1,
        name: 'P-Bifurcation (Transient Gust)',
        description: 'Transient aerodynamic energy pulse pushing scalar threshold. System self-recovers.'
      }
    ]
  },
  CYCLONIC_SHEAR: {
    name: 'Cyclonic Storm (D-Bifurcation)',
    description: 'Severe directional shear and sustained vortex loading starting at t=6.5s. Structural bifurcation boundary crossing.',
    durationSec: 10.0,
    baseWind: [8.0, 3.0, 1.0],
    turbulenceIntensity: 0.4,
    events: [
      {
        startFrac: 0.65,
        endFrac: 1.0,
        type: 2,
        name: 'D-Bifurcation (Dynamical Divergence)',
        description: 'Top Lyapunov exponent crosses zero (λ > 0). Sustained angular torque divergence.'
      }
    ]
  },
  ALLEY_TORNADO: {
    name: 'Midwestern Alley Tornado',
    description: 'Full cyclogenesis lifecycle: transient gust warning followed by an extreme EF5 tornadic vortex touchdown.',
    durationSec: 12.0,
    baseWind: [10.0, 4.0, 2.0],
    turbulenceIntensity: 0.65,
    events: [
      {
        startFrac: 0.25,
        endFrac: 0.40,
        type: 1,
        name: 'P-Bifurcation (Pre-Squall Gust)',
        description: 'Leading-edge downburst gust pulse.'
      },
      {
        startFrac: 0.60,
        endFrac: 1.0,
        type: 2,
        name: 'D-Bifurcation (Tornadic Touchdown)',
        description: 'Extreme rotational shear with high bivector vorticity planes.'
      }
    ]
  }
};

export class SyntheticDataStream {
  public activePreset: PresetScenario = 'DRYDEN_GUST';
  public sampleRate: number = 200.0; // 200 Hz
  public currentTime: number = 0.0;
  public isPlaying: boolean = false;
  public isLooping: boolean = true;
  public playbackSpeed: number = 1.0;

  // Precomputed cached sequence buffers
  private times: Float32Array = new Float32Array(0);
  private windX: Float32Array = new Float32Array(0);
  private windY: Float32Array = new Float32Array(0);
  private windZ: Float32Array = new Float32Array(0);
  private vortXY: Float32Array = new Float32Array(0);
  private vortYZ: Float32Array = new Float32Array(0);
  private vortZX: Float32Array = new Float32Array(0);
  private divW: Float32Array = new Float32Array(0);
  private labels: Uint8Array = new Uint8Array(0);
  private totalSteps: number = 0;

  private listeners: ((sample: SyntheticSample) => void)[] = [];

  constructor(preset: PresetScenario = 'DRYDEN_GUST') {
    this.setPreset(preset);
  }

  public setPreset(preset: PresetScenario) {
    this.activePreset = preset;
    this.generateSequence();
    this.currentTime = 0.0;
    this.emitCurrentSample();
  }

  public get config(): ScenarioConfig {
    return PRESET_CONFIGS[this.activePreset];
  }

  public get duration(): number {
    return this.config.durationSec;
  }

  public play() {
    this.isPlaying = true;
  }

  public pause() {
    this.isPlaying = false;
  }

  public togglePlay() {
    this.isPlaying = !this.isPlaying;
  }

  public seek(timeSec: number) {
    this.currentTime = Math.max(0, Math.min(timeSec, this.duration));
    this.emitCurrentSample();
  }

  public seekFraction(frac: number) {
    this.seek(frac * this.duration);
  }

  public reset() {
    this.currentTime = 0.0;
    this.emitCurrentSample();
  }

  public onSample(callback: (sample: SyntheticSample) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  public update(dt: number): SyntheticSample {
    if (this.isPlaying) {
      this.currentTime += dt * this.playbackSpeed;
      if (this.currentTime >= this.duration) {
        if (this.isLooping) {
          this.currentTime = this.currentTime % this.duration;
        } else {
          this.currentTime = this.duration;
          this.isPlaying = false;
        }
      }
    }
    const sample = this.getSampleAt(this.currentTime);
    this.notifyListeners(sample);
    return sample;
  }

  public getSampleAt(timeSec: number): SyntheticSample {
    if (this.totalSteps === 0) {
      return this.emptySample(timeSec);
    }

    const rawIdx = (timeSec / this.duration) * (this.totalSteps - 1);
    const idx = Math.max(0, Math.min(Math.floor(rawIdx), this.totalSteps - 1));
    const nextIdx = Math.min(idx + 1, this.totalSteps - 1);
    const alpha = rawIdx - idx;

    // Linear interpolation between sample steps
    const wx = this.windX[idx] * (1 - alpha) + this.windX[nextIdx] * alpha;
    const wy = this.windY[idx] * (1 - alpha) + this.windY[nextIdx] * alpha;
    const wz = this.windZ[idx] * (1 - alpha) + this.windZ[nextIdx] * alpha;

    const vxy = this.vortXY[idx] * (1 - alpha) + this.vortXY[nextIdx] * alpha;
    const vyz = this.vortYZ[idx] * (1 - alpha) + this.vortYZ[nextIdx] * alpha;
    const vzx = this.vortZX[idx] * (1 - alpha) + this.vortZX[nextIdx] * alpha;

    const div = this.divW[idx] * (1 - alpha) + this.divW[nextIdx] * alpha;
    const label = this.labels[idx] as 0 | 1 | 2;

    const windVec = new THREE.Vector3(wx, wy, wz);
    const vortVec = new THREE.Vector3(vxy, vyz, vzx);
    const bivectorNorm = Math.sqrt(vxy * vxy + vyz * vyz + vzx * vzx);
    const energyScalar = 0.5 * (wx * wx + wy * wy + wz * wz);

    let labelName = 'NORMAL AERO FLOW';
    if (label === 1) labelName = 'P-BIFURCATION (TRANSIENT GUST)';
    if (label === 2) labelName = 'D-BIFURCATION (STRUCTURAL DIVERGENCE)';

    // Full 8D Cl(3,0) Multivector
    const multivector = new Multivector(
      energyScalar,
      wx, wy, wz,
      vxy, vyz, vzx,
      div
    );

    return {
      time: timeSec,
      wind: windVec,
      vorticity: vortVec,
      divergence: div,
      label,
      labelName,
      bivectorNorm,
      energyScalar,
      multivector
    };
  }

  private emitCurrentSample() {
    const sample = this.getSampleAt(this.currentTime);
    this.notifyListeners(sample);
  }

  private notifyListeners(sample: SyntheticSample) {
    for (const listener of this.listeners) {
      listener(sample);
    }
  }

  private emptySample(timeSec: number): SyntheticSample {
    return {
      time: timeSec,
      wind: new THREE.Vector3(0, 0, 0),
      vorticity: new THREE.Vector3(0, 0, 0),
      divergence: 0,
      label: 0,
      labelName: 'NORMAL AERO FLOW',
      bivectorNorm: 0,
      energyScalar: 0,
      multivector: new Multivector()
    };
  }

  /**
   * Generates a realistic Dryden colored-noise atmospheric turbulence field
   * matching atmospheric reanalysis (ERA5) statistics.
   */
  private generateSequence() {
    const cfg = this.config;
    const numSteps = Math.floor(cfg.durationSec * this.sampleRate);
    this.totalSteps = numSteps;

    this.times = new Float32Array(numSteps);
    this.windX = new Float32Array(numSteps);
    this.windY = new Float32Array(numSteps);
    this.windZ = new Float32Array(numSteps);
    this.vortXY = new Float32Array(numSteps);
    this.vortYZ = new Float32Array(numSteps);
    this.vortZX = new Float32Array(numSteps);
    this.divW = new Float32Array(numSteps);
    this.labels = new Uint8Array(numSteps);

    const dt = 1.0 / this.sampleRate;
    const [bx, by, bz] = cfg.baseWind;
    const turbScale = cfg.turbulenceIntensity;

    // Dryden filter state
    let uTurb = 0;
    let vTurb = 0;
    let wTurb = 0;
    const alpha = 0.95; // Correlation pole

    // Pseudo-random deterministic generator based on seed
    let seed = 42;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return (seed / 233280.0) * 2.0 - 1.0;
    };

    for (let t = 0; t < numSteps; t++) {
      this.times[t] = t * dt;
      const frac = t / numSteps;

      // Colored Dryden noise step
      uTurb = alpha * uTurb + (1 - alpha) * rand() * turbScale * 4.0;
      vTurb = alpha * vTurb + (1 - alpha) * rand() * turbScale * 3.0;
      wTurb = alpha * wTurb + (1 - alpha) * rand() * turbScale * 2.0;

      let extraUx = 0;
      let extraUy = 0;
      let extraUz = 0;
      let currentLabel: 0 | 1 | 2 = 0;

      // Check for injected bifurcation events
      for (const ev of cfg.events) {
        if (frac >= ev.startFrac && frac <= ev.endFrac) {
          const eventDuration = ev.endFrac - ev.startFrac;
          const eventPhase = (frac - ev.startFrac) / Math.max(0.01, eventDuration);

          if (ev.type === 1) {
            // P-Bifurcation: smooth bell pulse that decays to zero
            const pulse = Math.sin(Math.PI * eventPhase) * 6.5;
            extraUx += pulse;
            extraUy += pulse * 0.35 * Math.sin(eventPhase * Math.PI * 2);
            currentLabel = 1;
          } else if (ev.type === 2) {
            // D-Bifurcation: ramp up to permanent divergent shift + severe cyclonic vortex
            const ramp = Math.min(1.0, eventPhase * 2.5);
            const shearVortex = Math.sin(eventPhase * Math.PI * 8.0) * 3.5;
            extraUx += 8.5 * ramp + shearVortex;
            extraUy += 4.2 * ramp;
            extraUz += 3.0 * ramp * Math.cos(eventPhase * Math.PI * 6.0);
            currentLabel = 2;
          }
        }
      }

      this.windX[t] = bx + uTurb + extraUx;
      this.windY[t] = by + vTurb + extraUy;
      this.windZ[t] = bz + wTurb + extraUz;
      this.labels[t] = currentLabel;
    }

    // Compute differential vorticity plane bivectors
    for (let t = 1; t < numSteps - 1; t++) {
      const du_dt = (this.windX[t + 1] - this.windX[t - 1]) / (2 * dt);
      const dv_dt = (this.windY[t + 1] - this.windY[t - 1]) / (2 * dt);
      const dw_dt = (this.windZ[t + 1] - this.windZ[t - 1]) / (2 * dt);

      // Bivector plane components (w_xy, w_yz, w_zx)
      this.vortXY[t] = (du_dt - dv_dt) * 0.25;
      this.vortYZ[t] = (dv_dt - dw_dt) * 0.25;
      this.vortZX[t] = (dw_dt - du_dt) * 0.25;
      this.divW[t] = (du_dt + dv_dt + dw_dt) * 0.15;
    }

    // Handle boundaries
    this.vortXY[0] = this.vortXY[1];
    this.vortYZ[0] = this.vortYZ[1];
    this.vortZX[0] = this.vortZX[1];
    this.divW[0] = this.divW[1];

    const last = numSteps - 1;
    this.vortXY[last] = this.vortXY[last - 1];
    this.vortYZ[last] = this.vortYZ[last - 1];
    this.vortZX[last] = this.vortZX[last - 1];
    this.divW[last] = this.divW[last - 1];
  }
}
