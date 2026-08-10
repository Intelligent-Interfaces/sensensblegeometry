/**
 * CliffordPresets.ts
 * Educational metadata, physical intuition maps, and task-based templates
 * for Clifford-Liquid Neural Networks (Cl(3,0) Geometric Neural Computing).
 */

export interface GradeInfo {
  key: 'scalar' | 'vector' | 'bivector' | 'trivector';
  symbol: string;
  basis: string;
  dim: number;
  physicalMeaning: string;
  example: string;
  color: string;
}

export const GRADE_PHYSICAL_MAP: Record<string, GradeInfo> = {
  scalar: {
    key: 'scalar',
    symbol: 'e₀',
    basis: '1',
    dim: 1,
    physicalMeaning: 'Magnitude & Mass',
    example: 'Speed, Temperature, Mass, Air Pressure',
    color: '#38bdf8'
  },
  vector: {
    key: 'vector',
    symbol: 'e₁e₂e₃',
    basis: 'e₁, e₂, e₃',
    dim: 3,
    physicalMeaning: 'Directional Force & Velocity',
    example: 'Wind Velocity vector, Linear Push, Gravitational Pull',
    color: '#ef4444'
  },
  bivector: {
    key: 'bivector',
    symbol: 'e₁₂e₂₃e₃₁',
    basis: 'e₁₂, e₂₃, e₃₁',
    dim: 3,
    physicalMeaning: 'Rotational Shear & Torque',
    example: 'Vortex Spin, Gyroscopic Torque, Axis of Rotation',
    color: '#10b981'
  },
  trivector: {
    key: 'trivector',
    symbol: 'e₁₂₃',
    basis: 'e₁₂₃ (Pseudoscalar)',
    dim: 1,
    physicalMeaning: 'Volumetric Expansion',
    example: 'Compression, Pressure Density, Handedness / Chirality',
    color: '#c084fc'
  }
};

export interface TaskTemplate {
  id: string;
  title: string;
  subtitle: string;
  icon: string; // SVG path data
  description: string;
  whyItWorks: string;
  targetObject: string;
  layers: {
    type: 'input' | 'clifford_hidden' | 'ltc_recurrent' | 'output';
    label: string;
    nodes: number;
    grades: { scalar: boolean; vector: boolean; bivector: boolean; trivector: boolean };
    tau: number;
    activation: string;
  }[];
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'drone_flocking',
    title: 'Storm-Resilient Drone Flocking',
    subtitle: 'Swarm Stabilization under Violent Winds',
    icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    targetObject: 'DroneSwarm',
    description: 'Converts 3D wind gust vectors directly into rotational rotor torque to keep drones upright and in formation without tumbling.',
    whyItWorks: 'Wind gusts arrive as directional vectors (e₁e₂e₃). Multiplying vectors by weights produces Bivectors (e₁₂e₂₃e₃₁), which mathematically represent the exact 3D planes of rotation needed for rotor thrust compensation. Because Cl(3,0) is E(3)-equivariant, the drone responds identically regardless of which direction the storm hits.',
    layers: [
      { type: 'input', label: 'Wind Input', nodes: 1, grades: { scalar: false, vector: true, bivector: false, trivector: false }, tau: 1.0, activation: 'identity' },
      { type: 'clifford_hidden', label: 'Clifford Rotor Layer', nodes: 8, grades: { scalar: true, vector: true, bivector: true, trivector: false }, tau: 1.0, activation: 'geometric_sigmoid' },
      { type: 'ltc_recurrent', label: 'Liquid Memory (LTC)', nodes: 8, grades: { scalar: true, vector: true, bivector: true, trivector: false }, tau: 0.8, activation: 'geometric_sigmoid' },
      { type: 'output', label: 'Torque Output', nodes: 1, grades: { scalar: false, vector: true, bivector: true, trivector: false }, tau: 1.0, activation: 'identity' }
    ]
  },
  {
    id: 'turbine_feathering',
    title: 'Dynamic Aerodynamic Feathering',
    subtitle: 'Turbine Blade Protection during Tornadoes',
    icon: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0M12 3v9M12 12l6 6M12 12l-6 6',
    targetObject: 'WindTurbine',
    description: 'Maps continuous wind speed and vortex turbulence into automatic blade angle adjustment to prevent catastrophic turbine over-spin.',
    whyItWorks: 'Under high winds, standard linear control explodes. The Liquid Time-Constant (LTC) ODE automatically slows down its adaptation rate (time-constant τ shrinks) during extreme stress, maintaining bounded, smooth RPM control.',
    layers: [
      { type: 'input', label: 'Fluid Velocity Input', nodes: 1, grades: { scalar: true, vector: true, bivector: false, trivector: false }, tau: 1.0, activation: 'identity' },
      { type: 'ltc_recurrent', label: 'Liquid Stress Recurrent', nodes: 4, grades: { scalar: true, vector: true, bivector: false, trivector: false }, tau: 1.2, activation: 'geometric_sigmoid' },
      { type: 'output', label: 'RPM & Pitch Control', nodes: 1, grades: { scalar: true, vector: false, bivector: false, trivector: false }, tau: 1.0, activation: 'identity' }
    ]
  },
  {
    id: 'metamaterial_flexing',
    title: 'Resilient Meta-Material Flexing',
    subtitle: 'Morphing Structural Lattice',
    icon: 'M12 2l9 4.9v9.8L12 22l-9-4.9V6.9L12 2zm0 2.3L4.5 8.4v7.2L12 19.7l7.5-4.1V8.4L12 4.3z',
    targetObject: 'MetaMaterial',
    description: 'Enables physical lattice joints to yield and absorb energy under cyclogenetic turbulence without structural failure.',
    whyItWorks: 'By mapping joint forces to Bivector shear planes, the neural network computes continuous strain-relieving deformations. The material behaves like a living liquid crystal.',
    layers: [
      { type: 'input', label: 'Lattice Force Input', nodes: 1, grades: { scalar: true, vector: true, bivector: true, trivector: false }, tau: 1.0, activation: 'identity' },
      { type: 'clifford_hidden', label: 'Shear Tensor Layer', nodes: 16, grades: { scalar: true, vector: true, bivector: true, trivector: true }, tau: 1.0, activation: 'geometric_sigmoid' },
      { type: 'ltc_recurrent', label: 'Liquid Lattice LTC', nodes: 8, grades: { scalar: true, vector: true, bivector: true, trivector: false }, tau: 1.0, activation: 'geometric_sigmoid' },
      { type: 'output', label: 'Deformation Vector', nodes: 1, grades: { scalar: true, vector: true, bivector: true, trivector: false }, tau: 1.0, activation: 'identity' }
    ]
  }
];

export const MATH_EXPLANATIONS = [
  {
    title: 'What is Geometric Algebra Cl(3,0)?',
    content: 'Geometric Algebra combines scalars, vectors, bivectors (oriented areas), and trivectors (oriented volumes) into a unified mathematical space called a Multivector. Unlike standard linear algebra, multivectors can be multiplied directly using the Geometric Product.'
  },
  {
    title: 'Why E(3) Equivariance Matters for Storms',
    content: 'Standard neural networks must be trained on millions of rotated examples to learn that a wind gust coming from the North requires the same physics as a gust from the West. Clifford Neural Networks are E(3)-equivariant by construction: rotating the input rotated the output identically, with ZERO extra data training.'
  },
  {
    title: 'How Liquid Time-Constant (LTC) Networks Work',
    content: 'LTCs use Ordinary Differential Equations (ODEs) where the time-constant τ changes dynamically depending on the input. During calm weather, τ is large (steady memory). During violent storm spikes, τ shrinks (instant adaptation), keeping the system completely stable.'
  }
];
