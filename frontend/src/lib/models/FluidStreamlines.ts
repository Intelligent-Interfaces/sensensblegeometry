import * as THREE from 'three';
import { WindFluidField } from '../physics/WindFluidField';

export class FluidStreamlines {
  public group: THREE.Group;
  private particleCount: number = 8000;
  private particles: THREE.Points;
  private positions: Float32Array;
  private velocities: Float32Array;
  private ages: Float32Array;
  private maxAges: Float32Array;
  private fluidField: WindFluidField;
  private geometry: THREE.BufferGeometry;

  constructor(fluidField: WindFluidField) {
    this.fluidField = fluidField;
    this.group = new THREE.Group();
    this.group.name = "FluidStreamlines";

    this.positions = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount * 3);
    this.ages = new Float32Array(this.particleCount);
    this.maxAges = new Float32Array(this.particleCount);

    this.initParticles();

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x0ea5e9, // Cyan stream visual
      size: 0.08,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particles = new THREE.Points(this.geometry, material);
    this.group.add(this.particles);
  }

  private initParticles() {
    for (let i = 0; i < this.particleCount; i++) {
      this.resetParticle(i);
      this.ages[i] = Math.random() * this.maxAges[i];
    }
  }

  private resetParticle(i: number) {
    // Emitter volume around the 3D turbine / drone bounds
    this.positions[i * 3 + 0] = (Math.random() - 0.5) * 8.0;
    this.positions[i * 3 + 1] = Math.random() * 6.0;
    this.positions[i * 3 + 2] = (Math.random() - 0.5) * 8.0;

    this.ages[i] = 0;
    this.maxAges[i] = 2.0 + Math.random() * 3.0; // 2 to 5 seconds lifetime
  }

  public update(dt: number, timeSeconds: number) {
    const pos = this.positions;
    const posAttr = this.geometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < this.particleCount; i++) {
      this.ages[i] += dt;
      if (this.ages[i] >= this.maxAges[i]) {
        this.resetParticle(i);
        continue;
      }

      const px = pos[i * 3 + 0];
      const py = pos[i * 3 + 1];
      const pz = pos[i * 3 + 2];

      // Sample 3D fluid velocity from WindFluidField
      const vel = this.fluidField.getVelocityAt(px, py, pz, timeSeconds);

      // Advect particle position along fluid velocity vector (scaled for visualization)
      pos[i * 3 + 0] += vel.x * dt * 0.35;
      pos[i * 3 + 1] += vel.y * dt * 0.35;
      pos[i * 3 + 2] += vel.z * dt * 0.35;
    }

    posAttr.needsUpdate = true;
  }
}
