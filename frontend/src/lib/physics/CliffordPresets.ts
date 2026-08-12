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
    symbol: '\\mathbf{e}_0',
    basis: '1',
    dim: 1,
    physicalMeaning: 'Magnitude & Mass',
    example: 'Speed, Temperature, Mass, Air Pressure',
    color: '#38bdf8'
  },
  vector: {
    key: 'vector',
    symbol: '\\mathbf{e}_i',
    basis: '\\mathbf{e}_1, \\mathbf{e}_2, \\mathbf{e}_3',
    dim: 3,
    physicalMeaning: 'Directional Force & Velocity',
    example: 'Wind Velocity vector, Linear Push, Gravitational Pull',
    color: '#ef4444'
  },
  bivector: {
    key: 'bivector',
    symbol: '\\mathbf{e}_{ij}',
    basis: '\\mathbf{e}_{12}, \\mathbf{e}_{23}, \\mathbf{e}_{31}',
    dim: 3,
    physicalMeaning: 'Rotational Shear & Torque',
    example: 'Vortex Spin, Gyroscopic Torque, Axis of Rotation',
    color: '#10b981'
  },
  trivector: {
    key: 'trivector',
    symbol: '\\mathbf{e}_{123}',
    basis: '\\mathbf{e}_{123} \\text{ (Pseudoscalar)}',
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
  story: string;
  whyItWorks: string;
  imageUrl: string;
  targetObject: string;
  layers: {
    type: 'input' | 'clifford_hidden' | 'ltc_recurrent' | 'output';
    label: string;
    nodes: number;
    grades: { scalar: boolean; vector: boolean; bivector: boolean; trivector: boolean };
    tau: number;
    activation: string;
    initialization: string;
    normalization: boolean;
    dropout: number;
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
    story: 'Autonomous drone swarms operating in search and rescue missions face catastrophic failure when encountering sudden, turbulent cyclonic winds. Standard PID controllers and traditional neural networks struggle to map chaotic 3D wind vectors to the necessary 4-motor torque adjustments in real-time, often leading to tumbling.',
    whyItWorks: 'Wind gusts arrive as directional vectors $\\mathbf{e}_1, \\mathbf{e}_2, \\mathbf{e}_3$. Multiplying vectors by weights produces Bivectors $\\mathbf{e}_{12}, \\mathbf{e}_{23}, \\mathbf{e}_{31}$, which mathematically represent the exact 3D planes of rotation needed for rotor thrust compensation. Because $Cl(3,0)$ is $E(3)$-equivariant, the drone responds identically regardless of which direction the storm hits.',
    imageUrl: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=800&q=80',
    layers: [
      { type: 'input', label: 'Wind Input', nodes: 1, grades: { scalar: false, vector: true, bivector: false, trivector: false }, tau: 1.0, activation: 'identity', initialization: 'glorot_uniform', normalization: false, dropout: 0.0 },
      { type: 'clifford_hidden', label: 'Clifford Rotor Layer', nodes: 8, grades: { scalar: true, vector: true, bivector: true, trivector: false }, tau: 1.0, activation: 'geometric_sigmoid', initialization: 'he_normal', normalization: true, dropout: 0.1 },
      { type: 'ltc_recurrent', label: 'Liquid Memory (LTC)', nodes: 8, grades: { scalar: true, vector: true, bivector: true, trivector: false }, tau: 0.8, activation: 'geometric_sigmoid', initialization: 'he_normal', normalization: true, dropout: 0.2 },
      { type: 'output', label: 'Torque Output', nodes: 1, grades: { scalar: false, vector: true, bivector: true, trivector: false }, tau: 1.0, activation: 'identity', initialization: 'glorot_uniform', normalization: false, dropout: 0.0 }
    ]
  },
  {
    id: 'turbine_feathering',
    title: 'Dynamic Aerodynamic Feathering',
    subtitle: 'Turbine Blade Protection during Tornadoes',
    icon: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0M12 3v9M12 12l6 6M12 12l-6 6',
    targetObject: 'WindTurbine',
    description: 'Maps continuous wind speed and vortex turbulence into automatic blade angle adjustment to prevent catastrophic turbine over-spin.',
    story: 'Offshore wind farms are constantly battered by unpredictable atmospheric turbulence. When a squall hits, the massive momentum of the blades can tear the turbine apart if the pitch is not feathered perfectly. A liquid geometric network acts as an artificial nervous system, instantaneously reacting to violent spikes in fluid pressure by dynamically relaxing the blade angle.',
    whyItWorks: 'Under high winds, standard linear control explodes. The Liquid Time-Constant (LTC) ODE automatically slows down its adaptation rate (time-constant $\\tau$ shrinks) during extreme stress, maintaining bounded, smooth RPM control.',
    imageUrl: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=800&q=80',
    layers: [
      { type: 'input', label: 'Fluid Velocity Input', nodes: 1, grades: { scalar: true, vector: true, bivector: false, trivector: false }, tau: 1.0, activation: 'identity', initialization: 'glorot_uniform', normalization: false, dropout: 0.0 },
      { type: 'ltc_recurrent', label: 'Liquid Stress Recurrent', nodes: 4, grades: { scalar: true, vector: true, bivector: false, trivector: false }, tau: 1.2, activation: 'geometric_sigmoid', initialization: 'he_normal', normalization: true, dropout: 0.1 },
      { type: 'output', label: 'RPM & Pitch Control', nodes: 1, grades: { scalar: true, vector: false, bivector: false, trivector: false }, tau: 1.0, activation: 'identity', initialization: 'glorot_uniform', normalization: false, dropout: 0.0 }
    ]
  },
  {
    id: 'kuka_iiwa_manipulation',
    title: 'Kinematic Twisting',
    subtitle: 'Continuous Rotational Trajectories for Precision Fluid & Robotic Operations',
    icon: 'M12 2v20M2 12h20',
    targetObject: 'KukaArm',
    description: 'Computes 7-DOF joint motor torques and bivector rotational planes for continuous fluid agitations, shaking, and precision assembly without gimbal lock.',
    story: 'High-precision robotic manipulators must navigate complex joint trajectories when executing fluid mixing, pouring, and high-speed manufacturing turns. Traditional end-effector trajectory planners hit gimbal lock or singularity points when executing multi-axis torsional rotations. By processing 3D joint rotations as continuous Cl(3,0) multivectors, a liquid neural network computes smooth, singularity-free rotor torques for continuous physical manipulation.',
    whyItWorks: 'Joint angles and end-effector angular velocities map directly onto Bivector planes of rotation $\\mathbf{e}_{12}, \\mathbf{e}_{23}, \\mathbf{e}_{31}$. Geometric product multiplication preserves $SO(3)$ Lie algebra natively without Euler angle gimbal lock or double-cover quaternion ambiguities.',
    imageUrl: '/kuka_iiwa.jpg',
    layers: [
      { type: 'input', label: 'Kinematic State Input', nodes: 1, grades: { scalar: true, vector: true, bivector: true, trivector: false }, tau: 1.0, activation: 'identity', initialization: 'glorot_uniform', normalization: false, dropout: 0.0 },
      { type: 'clifford_hidden', label: 'Rotor Kinematics Layer', nodes: 14, grades: { scalar: true, vector: true, bivector: true, trivector: true }, tau: 1.0, activation: 'geometric_sigmoid', initialization: 'he_normal', normalization: true, dropout: 0.1 },
      { type: 'ltc_recurrent', label: 'Liquid Trajectory Memory', nodes: 8, grades: { scalar: true, vector: true, bivector: true, trivector: false }, tau: 0.5, activation: 'geometric_sigmoid', initialization: 'he_normal', normalization: true, dropout: 0.1 },
      { type: 'output', label: '7-DOF Joint Torque Output', nodes: 1, grades: { scalar: true, vector: true, bivector: true, trivector: false }, tau: 1.0, activation: 'identity', initialization: 'glorot_uniform', normalization: false, dropout: 0.0 }
    ]
  },
  {
    id: 'metamaterial_flexing',
    title: 'Resilient Meta-Material Flexing',
    subtitle: 'Morphing Structural Lattice',
    icon: 'M12 2l9 4.9v9.8L12 22l-9-4.9V6.9L12 2zm0 2.3L4.5 8.4v7.2L12 19.7l7.5-4.1V8.4L12 4.3z',
    targetObject: 'MetaMaterial',
    description: 'Enables physical lattice joints to yield and absorb energy under cyclogenetic turbulence without structural failure.',
    story: 'Future architectural structures and aerospace hulls will be built from active meta-materials that can change their physical properties on demand. By embedding a distributed geometric neural network into the material lattice, the structure can sense incoming stress waves and instruct localized struts to yield or stiffen, effectively absorbing shockwaves like a liquid crystal.',
    whyItWorks: 'By mapping joint forces to Bivector shear planes, the neural network computes continuous strain-relieving deformations. The material behaves like a living liquid crystal.',
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    layers: [
      { type: 'input', label: 'Lattice Force Input', nodes: 1, grades: { scalar: true, vector: true, bivector: true, trivector: false }, tau: 1.0, activation: 'identity', initialization: 'glorot_uniform', normalization: false, dropout: 0.0 },
      { type: 'clifford_hidden', label: 'Shear Tensor Layer', nodes: 16, grades: { scalar: true, vector: true, bivector: true, trivector: true }, tau: 1.0, activation: 'geometric_sigmoid', initialization: 'he_normal', normalization: true, dropout: 0.2 },
      { type: 'ltc_recurrent', label: 'Liquid Lattice LTC', nodes: 8, grades: { scalar: true, vector: true, bivector: true, trivector: false }, tau: 1.0, activation: 'geometric_sigmoid', initialization: 'he_normal', normalization: true, dropout: 0.1 },
      { type: 'output', label: 'Deformation Vector', nodes: 1, grades: { scalar: true, vector: true, bivector: true, trivector: false }, tau: 1.0, activation: 'identity', initialization: 'glorot_uniform', normalization: false, dropout: 0.0 }
    ]
  }
];

export const MATH_EXPLANATIONS = [
  {
    title: 'What is Geometric Algebra Cl(3,0)?',
    content: 'Geometric Algebra combines scalars, vectors, bivectors (oriented areas), and trivectors (oriented volumes) into a unified mathematical space called a Multivector. Unlike standard linear algebra, multivectors can be multiplied directly using the Geometric Product ($\\mathbf{u} \\mathbf{v} = \\mathbf{u} \\cdot \\mathbf{v} + \\mathbf{u} \\wedge \\mathbf{v}$).'
  },
  {
    title: 'Why E(3) Equivariance Matters for Storms',
    content: 'Standard neural networks must be trained on millions of rotated examples to learn that a wind gust coming from the North requires the same physics as a gust from the West. Clifford Neural Networks are $E(3)$-equivariant by construction: rotating the input rotated the output identically, with ZERO extra data training.'
  },
  {
    title: 'How Liquid Time-Constant (LTC) Networks Work',
    content: 'LTCs use Ordinary Differential Equations (ODEs) where the time-constant $\\tau$ changes dynamically depending on the input. During calm weather, $\\tau$ is large (steady memory). During violent storm spikes, $\\tau$ shrinks (instant adaptation), keeping the system completely stable.'
  }
];
