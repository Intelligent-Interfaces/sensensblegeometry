
import * as THREE from 'three';

const cycloneVertexShader = `
  uniform float uTime;
  uniform float uCategory;
  uniform float uIsHurricane;
  
  attribute vec3 aRandom;
  attribute float aPhase;
  
  varying float vHeight;
  varying float vIntensity;
  varying float vDistFromCenter;

  void main() {
    // Height 0 to 10
    float heightMod = aRandom.y * 10.0; 
    float speed = 2.0 + (uCategory * 0.5);
    
    // Funnel equation: radius grows exponentially with height
    float spread = 0.5 + (uCategory * 0.3);
    float radius = 0.2 + pow(heightMod, 1.2) * 0.1 * spread;
    
    // If hurricane, make it massively wider and flatter, with a clear "eye"
    if (uIsHurricane > 0.5) {
      spread = 2.0 + (uCategory * 0.5);
      // Flat profile
      heightMod = aRandom.y * 1.5 + (aRandom.x * 0.5);
      radius = 1.0 + pow(heightMod, 1.2) * 0.5 * spread;
      // Eye of the storm
      radius += 1.0; 
    }
    
    // Add turbulence/noise based on category
    float noiseX = sin(uTime * 2.0 + aRandom.x * 10.0) * 0.1 * uCategory;
    float noiseZ = cos(uTime * 2.0 + aRandom.z * 10.0) * 0.1 * uCategory;
    
    // Swirl angle: spins faster at bottom, slower at top
    float angle = aPhase + uTime * speed * (2.0 / (heightMod + 1.0));
    
    vec3 pos = position;
    pos.x = cos(angle) * radius + noiseX + (aRandom.x - 0.5) * radius * 0.2;
    pos.z = sin(angle) * radius + noiseZ + (aRandom.z - 0.5) * radius * 0.2;
    pos.y = heightMod;

    vHeight = heightMod / (uIsHurricane > 0.5 ? 4.0 : 10.0); // normalized 0 to 1
    vIntensity = pow((1.0 - vHeight), 2.0); // Brighter at base
    vDistFromCenter = radius;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Size attenuation: closer particles are larger
    float baseSize = uIsHurricane > 0.5 ? 150.0 : 80.0;
    baseSize += (aRandom.x * 40.0) + (uCategory * 10.0);
    gl_PointSize = baseSize * (1.0 / -mvPosition.z);
  }
`;

const cycloneFragmentShader = `
  varying float vHeight;
  varying float vIntensity;
  varying float vDistFromCenter;
  
  uniform float uCategory;
  uniform float uIsHurricane;

  void main() {
    // Soft circular particle
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r = dot(cxy, cxy);
    if (r > 1.0) discard;
    
    // Smooth smoky edge
    float alpha = smoothstep(1.0, 0.0, r);
    
    // Colors based on system type
    vec3 baseColor;
    vec3 dirtColor;
    
    if (uIsHurricane > 0.5) {
      // Hurricane: White/Grey massive clouds over ocean
      baseColor = mix(vec3(0.8, 0.85, 0.9), vec3(1.0, 1.0, 1.0), vHeight);
      dirtColor = vec3(0.5, 0.6, 0.7); // Darker rain bands
    } else {
      // Tornado: Dark grey and dirt
      baseColor = mix(vec3(0.15, 0.17, 0.20), vec3(0.4, 0.45, 0.5), vHeight);
      dirtColor = vec3(0.35, 0.25, 0.15);
    }
    
    vec3 color = mix(baseColor, dirtColor, vIntensity);

    float finalAlpha = alpha * 0.015 * (1.0 + uCategory * 0.2);
    
    // Clear out the eye of the hurricane slightly
    if (uIsHurricane > 0.5 && vDistFromCenter < 2.0) {
      finalAlpha *= smoothstep(1.0, 2.0, vDistFromCenter);
    }

    gl_FragColor = vec4(color, finalAlpha);
  }
`;

export class CycloSystem {
  group: THREE.Group;
  type: string;
  material: THREE.ShaderMaterial;

  constructor(type: string) {
    this.type = type;
    this.group = new THREE.Group();

    // Generate Particles
    const particleCount = 150000;
    const geometry = new THREE.BufferGeometry();
    
    const positions = new Float32Array(particleCount * 3);
    const randoms = new Float32Array(particleCount * 3);
    const phases = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Initialize at 0,0,0; vertex shader does the math
      positions[i * 3 + 0] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;

      randoms[i * 3 + 0] = Math.random();
      randoms[i * 3 + 1] = Math.random(); // Used for height
      randoms[i * 3 + 2] = Math.random();

      phases[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 3));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    this.material = new THREE.ShaderMaterial({
      vertexShader: cycloneVertexShader,
      fragmentShader: cycloneFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uCategory: { value: 5.0 }, // Default CAT-5
        uIsHurricane: { value: type === 'Hurricane_Cat5' ? 1.0 : 0.0 }
      },
      transparent: true,
      depthWrite: false, // Prevents z-fighting for volumetric blending
      blending: THREE.NormalBlending
    });

    const particles = new THREE.Points(geometry, this.material);
    // Shift down to ground level
    particles.position.y = 0;
    this.group.add(particles);

    // Animation Loop
    const startTime = Date.now();
    const animate = () => {
      if (!this.group.parent) return;
      const elapsed = (Date.now() - startTime) / 1000;
      this.material.uniforms.uTime.value = elapsed;
      requestAnimationFrame(animate);
    };
    animate();
  }

  // Method to update category dynamically
  setCategory(cat: number) {
    if (this.material) {
      this.material.uniforms.uCategory.value = cat;
    }
  }
}
