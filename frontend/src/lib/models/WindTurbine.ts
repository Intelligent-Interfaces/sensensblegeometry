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

      // We'll rotate the entire model for now if we can't isolate the blades cleanly
      // since the step converter merged it into a single mesh.
      // But let's try to isolate it anyway:
      model.traverse((child) => {
        if (child.name.toLowerCase().includes('rotor') || child.name.toLowerCase().includes('blade') || child.name.toLowerCase().includes('hub')) {
          this.rotors.push(child);
        }
        
        // PBR aesthetics upgrade
        if ((child as THREE.Mesh).isMesh) {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (mat) {
             mat.metalness = 0.8;
             mat.roughness = 0.2;
             mat.color = new THREE.Color(0xdce7eb); // Off-white industrial
          }
        }
      });
      
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
