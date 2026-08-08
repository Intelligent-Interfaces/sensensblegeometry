import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export class WindTurbine {
  group: THREE.Group;
  type: string;
  
  private loader: GLTFLoader;
  private rotors: THREE.Object3D[] = [];
  targetRPM: number = 15;
  currentRPM: number = 0;

  constructor(type: string) {
    this.type = type;
    this.group = new THREE.Group();
    this.group.name = `Turbine_${type}`;
    
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');

    this.loader = new GLTFLoader();
    this.loader.setDRACOLoader(dracoLoader);

    this.group.position.y = 0;
    this.loadModel();
  }

  private async loadModel() {
    try {
      let gltfFile = '/models/turbine/hawt_modern.glb';
      if (this.type === 'GE_Haliade_X') {
          gltfFile = '/models/turbine/hawt_modern_2.glb';
      }
      
      const gltf = await this.loader.loadAsync(gltfFile);
      const model = gltf.scene;
      
      // Auto-scale
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) {
        const scale = 5.0 / maxDim;
        model.scale.setScalar(scale);
      }

      // Re-compute bounding box after scale
      const scaledBox = new THREE.Box3().setFromObject(model);
      const center = scaledBox.getCenter(new THREE.Vector3());

      // Center it on X and Z, and place the base on Y=0
      model.position.x = -center.x;
      model.position.y = -scaledBox.min.y;
      model.position.z = -center.z;

      // We'll group the rotors so they spin around their true physical center
      const rotorGroup = new THREE.Group();
      model.add(rotorGroup);
      
      const rotorParts: THREE.Object3D[] = [];
      const totalHeight = scaledBox.max.y - scaledBox.min.y;
      
      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat) {
             mat.metalness = 0.8;
             mat.roughness = 0.2;
             mat.color = new THREE.Color(0xdce7eb); // Off-white industrial
          }
          
          mesh.geometry.computeBoundingBox();
          const bbox = mesh.geometry.boundingBox!;
          const size = bbox.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          
          // Heuristic: Rotor parts are high up (don't touch the ground) and are large.
          // Or they contain 'blade', 'rotor', 'hub' in name (if preserved).
          const nameMatch = mesh.name.toLowerCase().includes('rotor') || mesh.name.toLowerCase().includes('blade') || mesh.name.toLowerCase().includes('hub');
          const isHighUp = bbox.min.y > (totalHeight * 0.15);
          const isLarge = maxDim > (totalHeight * 0.25); // Blades are long
          
          if (nameMatch || (isHighUp && isLarge)) {
            rotorParts.push(mesh);
          }
        }
      });
      
      if (rotorParts.length > 0) {
        // Calculate the bounding box of just the rotor assembly
        const rotorBox = new THREE.Box3();
        rotorParts.forEach(part => rotorBox.expandByObject(part));
        const rotorCenter = rotorBox.getCenter(new THREE.Vector3());
        
        // Place the pivot group at the rotor's centroid
        rotorGroup.position.copy(rotorCenter);
        
        // Move all rotor parts into this group, preserving their spatial relation
        rotorParts.forEach(part => {
           rotorGroup.attach(part);
        });
        
        this.rotors.push(rotorGroup);
      }
      
      this.group.add(model);
      
      this.startAnimation();
    } catch (err) {
      console.warn('Could not load Wind Turbine GLTF model:', err);
    }
  }

  setRPM(rpm: number) {
    this.targetRPM = rpm;
  }

  private startAnimation() {
    const animate = () => {
      if (!this.group.parent) return;

      // Smooth RPM transition
      this.currentRPM += (this.targetRPM - this.currentRPM) * 0.05;
      const rotSpeed = (this.currentRPM / 60) * Math.PI * 2 * (1/60); // rad per frame at 60fps

      if (this.rotors.length > 0) {
         this.rotors.forEach(r => {
           r.rotation.z -= rotSpeed;
         });
      } else {
         // Fallback if the STEP converter didn't preserve the 'blade' naming conventions
         this.group.rotation.y += rotSpeed * 0.1;
      }

      requestAnimationFrame(animate);
    };
    animate();
  }
}
