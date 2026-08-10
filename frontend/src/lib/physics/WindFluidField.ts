import * as THREE from 'three';

export interface FluidFieldConfig {
  vortexCoreRadius: number; // r_c (meters)
  circulationGamma: number; // Circulation Gamma (m^2/s)
  ambientWindSpeed: number; // Base wind velocity magnitude (m/s)
  ambientWindDirection: number; // Angle in radians (0 = +X, PI/2 = +Z)
  vortexCenter: THREE.Vector3; // 3D center of cyclogenetic vortex
  turbulenceIntensity: number; // Fluctuating component scale
}

export class WindFluidField {
  public config: FluidFieldConfig;

  constructor(config?: Partial<FluidFieldConfig>) {
    this.config = {
      vortexCoreRadius: 1.5,
      circulationGamma: 25.0,
      ambientWindSpeed: 8.0,
      ambientWindDirection: 0.0,
      vortexCenter: new THREE.Vector3(0, 2.5, 0),
      turbulenceIntensity: 0.2,
      ...config,
    };
  }

  /**
   * Evaluates the 3D fluid velocity vector V(x, y, z, t) using a 3D Lamb-Oseen Vortex model
   * combined with ambient boundary-layer wind flow.
   */
  public getVelocityAt(x: number, y: number, z: number, timeSeconds: number): THREE.Vector3 {
    const { vortexCoreRadius, circulationGamma, ambientWindSpeed, ambientWindDirection, vortexCenter, turbulenceIntensity } = this.config;

    // 1. Ambient wind vector
    const windX = Math.cos(ambientWindDirection) * ambientWindSpeed;
    const windZ = Math.sin(ambientWindDirection) * ambientWindSpeed;
    const velocity = new THREE.Vector3(windX, 0, windZ);

    // 2. Relative position to vortex core
    const dx = x - vortexCenter.x;
    const dz = z - vortexCenter.z;
    const r2 = dx * dx + dz * dz;
    const r = Math.sqrt(r2);

    if (r > 0.001) {
      // Lamb-Oseen tangential velocity v_theta(r) = (Gamma / 2pi r) * (1 - exp(-r^2 / r_c^2))
      const rc2 = vortexCoreRadius * vortexCoreRadius;
      const vTheta = (circulationGamma / (2 * Math.PI * r)) * (1.0 - Math.exp(-r2 / rc2));

      // Tangential direction vector (-sin theta, cos theta)
      const uThetaX = -dz / r;
      const uThetaZ = dx / r;

      // Inflow radial draft (cyclogenetic suction towards core)
      const vRadial = -0.15 * vTheta;
      const uRadialX = dx / r;
      const uRadialZ = dz / r;

      velocity.x += uThetaX * vTheta + uRadialX * vRadial;
      velocity.z += uThetaZ * vTheta + uRadialZ * vRadial;

      // Vertical updraft inside vortex core (height-dependent uplift)
      const updraft = (vortexCoreRadius / (r + 0.5)) * 0.4 * Math.abs(vTheta);
      velocity.y += updraft;
    }

    // 3. Turbulent velocity fluctuations (harmonic noise)
    if (turbulenceIntensity > 0) {
      const freq = 3.0;
      velocity.x += Math.sin(x * freq + timeSeconds * 4.0) * turbulenceIntensity * ambientWindSpeed;
      velocity.y += Math.cos(y * freq + timeSeconds * 3.5) * turbulenceIntensity * ambientWindSpeed * 0.5;
      velocity.z += Math.sin(z * freq + timeSeconds * 4.5) * turbulenceIntensity * ambientWindSpeed;
    }

    return velocity;
  }

  /**
   * Computes magnitude of wind speed at (x, y, z, t)
   */
  public getSpeedAt(x: number, y: number, z: number, timeSeconds: number): number {
    return this.getVelocityAt(x, y, z, timeSeconds).length();
  }
}
