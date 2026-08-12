export type SequenceType = 'pouring' | 'swirl' | 'spiral' | 'agitation';
export type DroneSequenceType = 'vortex_escape' | 'figure_eight' | 'heart_pulse' | 'double_helix';

export interface TrajectoryPoint {
  angles: number[];
  phaseName: string;
}

export interface DroneOffsetTarget {
  x: number;
  y: number;
  z: number;
  phaseName: string;
}

/**
 * RobotTrajectories.ts
 * Implements multi-phase movement sequences for 6/7-DOF manipulators and drone swarms,
 * derived from spatialmath / roboticstoolbox kinematics formulations.
 */
export class RobotTrajectories {
  /**
   * Generates a 4-phase Pouring Sequence:
   * Phase 1: Lift up above target container
   * Phase 2: Tilt pitch forward to pour
   * Phase 3: Hold dwell at maximum tilt
   * Phase 4: Pitch return & lower back to home
   */
  static getPouringTrajectory(time: number, dof: number = 7): TrajectoryPoint {
    const cyclePeriod = 8.0; // 8 second full cycle
    const t = (time % cyclePeriod) / cyclePeriod; // Normalized [0, 1]

    let phaseName = 'Home';
    let lift = 0;
    let tilt = 0;

    if (t < 0.25) {
      // Phase 1: Lift Up (0.0 to 0.25)
      phaseName = 'Phase 1: Vertical Lift';
      const progress = t / 0.25;
      lift = progress * 0.4;
      tilt = 0;
    } else if (t < 0.50) {
      // Phase 2: Tilt Pitch Forward (0.25 to 0.50)
      phaseName = 'Phase 2: Pitch Pouring';
      const progress = (t - 0.25) / 0.25;
      lift = 0.4;
      tilt = progress * (Math.PI / 3); // 60 deg tilt
    } else if (t < 0.75) {
      // Phase 3: Hold Dwell (0.50 to 0.75)
      phaseName = 'Phase 3: Dwell & Aerate';
      lift = 0.4;
      tilt = Math.PI / 3;
    } else {
      // Phase 4: Pitch Return & Lower (0.75 to 1.0)
      phaseName = 'Phase 4: Return Trajectory';
      const progress = (t - 0.75) / 0.25;
      lift = 0.4 * (1 - progress);
      tilt = (Math.PI / 3) * (1 - progress);
    }

    const angles = new Array(dof).fill(0);
    angles[0] = Math.sin(time * 0.5) * 0.2; // Base slight sway
    angles[1] = -lift;                      // Shoulder lift
    angles[2] = 0.1;
    angles[3] = -lift * 1.5 - tilt * 0.5;   // Elbow flexion
    angles[4] = 0;
    angles[5] = -tilt;                      // Wrist pitch tilt
    angles[6] = Math.sin(time * 2.0) * 0.1; // End-effector minor perturbation

    return { angles, phaseName };
  }

  /**
   * Generates a continuous Orbital Swirl Trajectory:
   * End-effector moves in circular motion (r * cos(wt), r * sin(wt))
   * with continuous tangent tilt pointing toward vortex center.
   */
  static getSwirlTrajectory(time: number, dof: number = 7): TrajectoryPoint {
    const omega = 2.5; // Swirl speed
    const radius = 0.35; // Radius of circular swirl

    const q0 = Math.sin(time * 0.2) * 0.1;
    const q1 = Math.cos(time * omega) * radius;
    const q2 = Math.sin(time * omega) * radius;
    const q3 = -0.6 + Math.sin(time * omega * 0.5) * 0.1;
    const q4 = Math.cos(time * omega) * 0.4; // Tangent tilt x
    const q5 = Math.sin(time * omega) * 0.4; // Tangent tilt y
    const q6 = time * omega;                 // Continuous wrist rotation

    const angles = [q0, q1, q2, q3, q4, q5, q6];
    while (angles.length < dof) angles.push(0);

    return {
      angles: angles.slice(0, dof),
      phaseName: 'Continuous Orbital Swirl'
    };
  }

  /**
   * Generates an Archimedean Spiral Trajectory:
   * Expanding radius spiral r(t) = k * t on XY plane.
   */
  static getSpiralTrajectory(time: number, dof: number = 7): TrajectoryPoint {
    const cyclePeriod = 10.0;
    const t = (time % cyclePeriod) / cyclePeriod;
    const revolutions = 4.0;
    const maxRadius = 0.5;

    const currentRadius = t * maxRadius;
    const theta = t * revolutions * 2 * Math.PI;

    const q0 = currentRadius * Math.cos(theta);
    const q1 = currentRadius * Math.sin(theta);
    const q2 = Math.sin(theta * 0.5) * 0.2;
    const q3 = -0.5 + currentRadius * 0.4;
    const q4 = Math.cos(theta) * 0.3;
    const q5 = Math.sin(theta) * 0.3;
    const q6 = theta * 0.5;

    const angles = [q0, q1, q2, q3, q4, q5, q6];
    while (angles.length < dof) angles.push(0);

    return {
      angles: angles.slice(0, dof),
      phaseName: `Spiral Expansion (${(currentRadius * 100).toFixed(0)}cm radius)`
    };
  }

  /**
   * Generates High-Frequency Multi-Axis Torsional Agitation:
   * Rapid multi-joint torsional rotation testing joint limits and singularity tolerance.
   */
  static getAgitationTrajectory(time: number, dof: number = 7): TrajectoryPoint {
    const freq = 4.0;
    const angles = [
      Math.sin(time * freq) * 0.6,
      Math.cos(time * freq * 0.8) * 0.5,
      Math.sin(time * freq * 1.2) * 0.7,
      -Math.abs(Math.sin(time * freq * 0.5)) * 0.9,
      Math.cos(time * freq * 1.5) * 0.8,
      Math.sin(time * freq * 1.8) * 0.7,
      Math.cos(time * freq * 2.0) * 1.0
    ];
    while (angles.length < dof) angles.push(0);

    return {
      angles: angles.slice(0, dof),
      phaseName: 'Torsional High-Speed Agitation'
    };
  }

  static getTrajectory(type: SequenceType, time: number, dof: number = 7): TrajectoryPoint {
    switch (type) {
      case 'pouring': return this.getPouringTrajectory(time, dof);
      case 'swirl': return this.getSwirlTrajectory(time, dof);
      case 'spiral': return this.getSpiralTrajectory(time, dof);
      case 'agitation': return this.getAgitationTrajectory(time, dof);
      default: return this.getSwirlTrajectory(time, dof);
    }
  }
}

export class DroneTrajectories {
  /**
   * Synchronized Figure-8 Loop:
   * Drones follow interlocking vertical figure-8 loops in formation.
   */
  static getFigureEightTrajectory(time: number, index: number, total: number): DroneOffsetTarget {
    const scale = 2.5;
    const phaseOffset = (index / total) * Math.PI * 2;
    const t = time * 0.8 + phaseOffset;

    const x = Math.sin(t) * scale;
    const y = Math.sin(t * 2) * (scale * 0.4);
    const z = Math.cos(t) * scale;

    return { x, y, z, phaseName: 'Synchronized Figure-8 Loop' };
  }

  /**
   * Heart Pulse Formation:
   * Drones arrange into a 3D cardioid heart shape that expands and contracts.
   */
  static getHeartPulseTrajectory(time: number, index: number, total: number): DroneOffsetTarget {
    const t = (index / total) * Math.PI * 2;
    const pulse = 1.0 + Math.sin(time * 3.0) * 0.15; // Pulsating scale

    // 2D Cardioid formula: x = 16 sin^3(t), y = 13 cos(t) - 5 cos(2t) - 2 cos(3t) - cos(4t)
    const rawX = 16 * Math.pow(Math.sin(t), 3);
    const rawY = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);

    const x = (rawX / 16) * 2.0 * pulse;
    const y = (rawY / 16) * 2.0 * pulse;
    const z = Math.sin(time * 2.0 + index) * 0.5;

    return { x, y, z, phaseName: 'Pulsating Heart Cardioid' };
  }

  /**
   * Double Helix Orbit:
   * Drones split into twin counter-rotating spiraling helix streams ascending & descending.
   */
  static getDoubleHelixTrajectory(time: number, index: number, total: number): DroneOffsetTarget {
    const strand = index % 2 === 0 ? 1 : -1;
    const heightSpread = ((index / total) - 0.5) * 3.0;
    const omega = 1.5;
    const radius = 1.8;

    const t = time * omega + heightSpread * 2.0 * strand;

    const x = Math.cos(t) * radius * strand;
    const y = heightSpread + Math.sin(time * 0.5) * 0.3;
    const z = Math.sin(t) * radius * strand;

    return { x, y, z, phaseName: 'Counter-Rotating Double Helix' };
  }

  /**
   * Vortex Escape & Formation Breakout:
   * Swarm performs breakout maneuvers around cyclone perimeter.
   */
  static getVortexEscapeTrajectory(time: number, index: number, total: number): DroneOffsetTarget {
    const angle = (index / total) * Math.PI * 2 + time * 0.5;
    const burst = Math.sin(time * 1.2 + index) * 0.4;
    const radius = 2.0 + burst;

    const x = Math.cos(angle) * radius;
    const y = Math.sin(time * 0.8 + index) * 0.5;
    const z = Math.sin(angle) * radius;

    return { x, y, z, phaseName: 'Cyclogenetic Vortex Breakout' };
  }

  static getTrajectory(type: DroneSequenceType, time: number, index: number, total: number): DroneOffsetTarget {
    switch (type) {
      case 'figure_eight': return this.getFigureEightTrajectory(time, index, total);
      case 'heart_pulse': return this.getHeartPulseTrajectory(time, index, total);
      case 'double_helix': return this.getDoubleHelixTrajectory(time, index, total);
      case 'vortex_escape': return this.getVortexEscapeTrajectory(time, index, total);
      default: return this.getVortexEscapeTrajectory(time, index, total);
    }
  }
}
