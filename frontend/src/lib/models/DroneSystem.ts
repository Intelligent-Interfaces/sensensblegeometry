import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { WindFluidField } from '../physics/WindFluidField';
import { FluidStreamlines } from './FluidStreamlines';
import { JSMultivector as Multivector, CliffordLiquidNetwork } from '../physics/CliffordLiquidNetwork';
import type { StrategyType, DroneController, ControllerMetrics } from '../controllers/DroneController';
import { NaivePIDController, StandardMLPController, CliffordGNCController } from '../controllers/DroneController';
import type { DroneSequenceType } from '../physics/RobotTrajectories';
import { DroneTrajectories } from '../physics/RobotTrajectories';

interface DroneInstance {
  mesh: THREE.Group;
  rotors: THREE.Object3D[];
  targetOffset: THREE.Vector3;
  velocity: THREE.Vector3;
  lag: number;
  controller: DroneController;
}

export class DroneSystem {
  group: THREE.Group;
  type: string;
  
  private loader: GLTFLoader;
  private drones: DroneInstance[] = [];
  
  targetThrottle: number = 50;
  targetY: number = 2;
  rotSpeed: number = 0.2;
  
  public fluidField: WindFluidField;
  public streamlines: FluidStreamlines;
  public fluidCoupled: boolean = true;
  public activeStrategy: StrategyType = 'clifford_gnc';
  public activeSequence: DroneSequenceType = 'vortex_escape';
  public activePhase: string = 'Cyclogenetic Vortex Breakout';

  private startTime = performance.now();
  private lastTime = performance.now();

  constructor(type: string) {
    this.type = type;
    this.group = new THREE.Group();
    this.group.name = `Drone_Swarm_${type}`;
    
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');

    this.loader = new GLTFLoader();
    this.loader.setDRACOLoader(dracoLoader);

    this.fluidField = new WindFluidField({
      vortexCoreRadius: 2.0,
      circulationGamma: 15.0,
      ambientWindSpeed: 4.0,
      turbulenceIntensity: 0.3,
    });
    this.streamlines = new FluidStreamlines(this.fluidField);
    this.group.add(this.streamlines.group);

    this.group.position.y = 0;
    this.loadModel();
  }

  private async loadModel() {
    try {
      const gltf = await this.loader.loadAsync('/models/drone/drone.glb');
      const baseModel = gltf.scene;
      
      // Auto-scale & center model
      const box = new THREE.Box3().setFromObject(baseModel);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) {
        const scale = 1.0 / maxDim; // slightly smaller since it's a swarm
        baseModel.scale.setScalar(scale);
      }
      
      // Spawn Swarm
      const numDrones = 7;
      for (let i = 0; i < numDrones; i++) {
        const clone = baseModel.clone(true);
        const rotors: THREE.Object3D[] = [];
        clone.traverse((child) => {
          if (child.name.toLowerCase().includes('prop') || child.name.toLowerCase().includes('rotor') || child.name.toLowerCase().includes('blade')) {
            rotors.push(child);
          }
        });

        const offset = new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 4
        );
        
        // Stagger positions slightly
        clone.position.copy(offset);
        clone.position.y += 2; 

        this.group.add(clone);
        this.drones.push({
          mesh: clone,
          rotors: rotors,
          targetOffset: offset,
          velocity: new THREE.Vector3(),
          lag: 1.0 + Math.random() * 2.0, // Individual response lag
          controller: new CliffordGNCController() // default
        });
      }
      
      this.startAnimation();
    } catch (err) {
      console.warn('Could not load drone GLTF model:', err);
    }
  }

  setThrottle(throttle: number) {
    this.targetThrottle = throttle;
    this.targetY = 0.5 + (throttle / 100) * 3.5;
    this.rotSpeed = 0.1 + (throttle / 100) * 0.8;
  }

  setStrategy(strategy: StrategyType) {
    if (this.activeStrategy === strategy) return;
    this.activeStrategy = strategy;
    this.drones.forEach(drone => {
      switch(strategy) {
        case 'naive_pid': drone.controller = new NaivePIDController(); break;
        case 'standard_mlp': drone.controller = new StandardMLPController(); break;
        case 'clifford_gnc': drone.controller = new CliffordGNCController(); break;
      }
    });
  }

  setSequence(sequence: DroneSequenceType) {
    this.activeSequence = sequence;
  }

  getSwarmMetrics(): ControllerMetrics {
    if (this.drones.length === 0) return { trackingError: 0, cumulativeDeviation: 0, responseTime: 0, parameterCount: 0 };
    
    // Average the metrics across the swarm
    let totalError = 0;
    let totalDev = 0;
    let maxResponse = 0;
    
    this.drones.forEach(drone => {
      const m = drone.controller.getMetrics();
      totalError += m.trackingError;
      totalDev += m.cumulativeDeviation;
      if (m.responseTime > maxResponse) maxResponse = m.responseTime;
    });
    
    const count = this.drones.length;
    const baseMetrics = this.drones[0].controller.getMetrics();
    
    return {
      trackingError: totalError / count,
      cumulativeDeviation: totalDev / count,
      responseTime: maxResponse,
      parameterCount: baseMetrics.parameterCount
    };
  }

  private startAnimation() {
    const animate = () => {
      if (!this.group.parent) {
        requestAnimationFrame(animate);
        return;
      }
      const now = performance.now();
      const dt = Math.min((now - this.lastTime) / 1000, 0.1);
      const time = (now - this.startTime) / 1000;
      this.lastTime = now;

      // Update fluid streamlines GPU particles
      if (this.streamlines) {
        this.streamlines.group.visible = this.fluidCoupled;
        if (this.fluidCoupled) {
          this.streamlines.update(dt, time);
        }
      }

      // Flocking & Aerodynamic Swarm logic
      this.drones.forEach((drone, index) => {
        // Rotors
        if (drone.rotors.length > 0) {
          drone.rotors.forEach((r, idx) => {
            r.rotation.y += (idx % 2 === 0 ? 1 : -1) * this.rotSpeed;
          });
        }

        // Target position for this specific drone
        const traj = DroneTrajectories.getTrajectory(this.activeSequence, time, index, this.drones.length);
        this.activePhase = traj.phaseName;

        const idealPos = new THREE.Vector3(
          traj.x,
          this.targetY + traj.y,
          traj.z
        );

        // Spring physics for smooth lagging movement
        const force = idealPos.clone().sub(drone.mesh.position).multiplyScalar(1.5 / drone.lag);
        drone.velocity.add(force.multiplyScalar(dt));

        // Aerodynamic wind force coupling via controller
        if (this.fluidCoupled && this.fluidField) {
          const windVel = this.fluidField.getVelocityAt(drone.mesh.position.x, drone.mesh.position.y, drone.mesh.position.z, time);
          
          const posError = idealPos.clone().sub(drone.mesh.position);
          const correction = drone.controller.computeCorrection(windVel.x, windVel.y, windVel.z, posError, dt);
          
          drone.velocity.add(windVel.clone().multiplyScalar(dt * 0.25)); // Environmental wind
          drone.velocity.add(correction.multiplyScalar(dt * 5.0)); // Intelligent active stabilization
        }

        drone.velocity.multiplyScalar(0.92); // damping
        drone.mesh.position.add(drone.velocity.clone().multiplyScalar(dt * 10));

        // Tilt based on velocity and wind turbulence
        drone.mesh.rotation.z = -drone.velocity.x * 0.5;
        drone.mesh.rotation.x = drone.velocity.z * 0.5;
        drone.mesh.rotation.y = Math.sin(time * 0.2 + index) * 0.1;
      });

      requestAnimationFrame(animate);
    };
    animate();
  }
}
