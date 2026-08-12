
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
    
    if (uIsHurricane > 0.5) {
      spread = 2.0 + (uCategory * 0.5);
      heightMod = aRandom.y * 1.5 + (aRandom.x * 0.5);
      radius = 1.0 + pow(heightMod, 1.2) * 0.5 * spread;
      radius += 1.0; 
    }
    
    float noiseX = sin(uTime * 2.0 + aRandom.x * 10.0) * 0.1 * uCategory;
    float noiseZ = cos(uTime * 2.0 + aRandom.z * 10.0) * 0.1 * uCategory;
    
    // Spiral Clumping (Granularity)
    // Quantize the phase into 4 spiral arms
    float numArms = 4.0;
    float armPhase = floor(aPhase * numArms / (2.0 * 3.14159)) * (2.0 * 3.14159 / numArms);
    // Blend a bit of randomness so the arms aren't perfectly rigid
    float finalPhase = mix(aPhase, armPhase, 0.8) + aRandom.z * 0.5;

    float angle = finalPhase + uTime * speed * (2.0 / (heightMod + 1.0));
    
    vec3 pos = position;
    pos.x = cos(angle) * radius + noiseX + (aRandom.x - 0.5) * radius * 0.2;
    pos.z = sin(angle) * radius + noiseZ + (aRandom.z - 0.5) * radius * 0.2;
    pos.y = heightMod;

    vHeight = heightMod / (uIsHurricane > 0.5 ? 4.0 : 10.0);
    vIntensity = pow((1.0 - vHeight), 2.0); 
    vDistFromCenter = radius;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

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
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r = dot(cxy, cxy);
    if (r > 1.0) discard;
    
    // Sharper edge for "Debris" granularity
    float alpha = smoothstep(1.0, 0.4, r);
    
    vec3 baseColor;
    vec3 dirtColor;
    
    if (uIsHurricane > 0.5) {
      baseColor = mix(vec3(0.8, 0.85, 0.9), vec3(1.0, 1.0, 1.0), vHeight);
      dirtColor = vec3(0.5, 0.6, 0.7); 
    } else {
      baseColor = mix(vec3(0.15, 0.17, 0.20), vec3(0.4, 0.45, 0.5), vHeight);
      dirtColor = vec3(0.35, 0.25, 0.15);
    }
    
    vec3 color = mix(baseColor, dirtColor, vIntensity);

    // Increase opacity slightly for sharper granular chunks
    float finalAlpha = alpha * 0.05 * (1.0 + uCategory * 0.2);
    
    if (uIsHurricane > 0.5 && vDistFromCenter < 2.0) {
      finalAlpha *= smoothstep(1.0, 2.0, vDistFromCenter);
    }

    gl_FragColor = vec4(color, finalAlpha);
  }
`;

export class CycloSystem {
  group: THREE.Group;
  type: string;
  pointsMaterial: THREE.ShaderMaterial;
  particles: THREE.Points;

  constructor(type: string) {
    this.type = type;
    this.group = new THREE.Group();

    const isHurricane = type === 'Hurricane_Cat5';
    const pointCount = 100000;

    // --- Mode 1: Debris/Points ---
    const pointGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(pointCount * 3);
    const randoms = new Float32Array(pointCount * 3);
    const phases = new Float32Array(pointCount);

    for (let i = 0; i < pointCount; i++) {
      randoms[i * 3 + 0] = Math.random();
      randoms[i * 3 + 1] = Math.random(); 
      randoms[i * 3 + 2] = Math.random();
      phases[i] = Math.random() * Math.PI * 2;
    }

    pointGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pointGeo.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 3));
    pointGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    this.pointsMaterial = new THREE.ShaderMaterial({
      vertexShader: cycloneVertexShader,
      fragmentShader: cycloneFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uCategory: { value: 5.0 },
        uIsHurricane: { value: isHurricane ? 1.0 : 0.0 }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    this.particles = new THREE.Points(pointGeo, this.pointsMaterial);
    this.group.add(this.particles);

    // --- Animation & Wandering ---
    const startTime = Date.now();
    const animate = () => {
      // ALWAYS queue the next frame so the loop doesn't die!
      requestAnimationFrame(animate);
      
      // Only update positions if actually in the scene
      if (!this.group.parent) {
        requestAnimationFrame(animate);
        return;
      }
      
      const elapsed = (Date.now() - startTime) / 1000;
      this.pointsMaterial.uniforms.uTime.value = elapsed;

      // Wander logic
      const speed = isHurricane ? 0.2 : 0.5;
      this.group.position.x = Math.sin(elapsed * speed * 0.7) * 2.0;
      this.group.position.z = Math.cos(elapsed * speed * 1.1) * 2.0;
    };
    animate();
  }

  setCategory(cat: number) {
    if (this.pointsMaterial) this.pointsMaterial.uniforms.uCategory.value = cat;
  }
}
