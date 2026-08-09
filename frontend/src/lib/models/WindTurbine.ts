import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export type TurbineType = "VAWT" | "GE_Haliade_X";

interface TurbineDef {
  basePath: string;
  glbFile: string;
  rotorAxis: [number, number, number];
}

const TURBINE_DEFS: Record<TurbineType, TurbineDef> = {
  "GE_Haliade_X": {
    basePath: "/models/turbine/ge_haliade",
    glbFile: "rotor.glb", // placeholder
    rotorAxis: [1, 0, 0],
  },
  "VAWT": {
    basePath: "/models/turbine/vawt",
    glbFile: "vawt_full.glb",
    rotorAxis: [0, 1, 0],
  }
};

// Classify VAWT parts by their CAD label
function classifyVAWT(name: string): "rotor" | "static" {
  const n = name.toLowerCase();
  // Blades, blade frames, blade pins → rotor
  if (n.includes("balde") || n.includes("blade")) return "rotor";
  if (/^f\d/.test(n) || /^f0/.test(n)) return "rotor";
  if (/^p\d/.test(n) || /^p0/.test(n)) return "rotor";
  // Hub cage parts → rotor (they spin with the blades)
  if (/^h\d/.test(n) || /^h0/.test(n)) return "rotor";
  // Motor, fasteners → static
  return "static";
}

export class WindTurbine {
  public group: THREE.Group;
  public type: string;

  private loader: GLTFLoader;
  private rootGroup: THREE.Group;
  private cadScaleFactor: number = 1.0;
  private rotorAxis: [number, number, number] = [0, 1, 0];

  // Each individual mesh from the GLB, stored with its rest position
  private parts: { mesh: THREE.Object3D; restPosition: THREE.Vector3; center: THREE.Vector3; kinematic: "rotor" | "static" }[] = [];
  private assemblyCentroid: THREE.Vector3 = new THREE.Vector3();

  targetRPM: number = 0;
  currentRPM: number = 0;
  targetExplodeFactor: number = 0.0;
  currentExplodeFactor: number = 0.0;

  public rotorJoint: THREE.Group | null = null;

  constructor(type: string) {
    this.type = type;
    this.group = new THREE.Group();
    this.group.name = `Turbine_${type}`;

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    this.loader = new GLTFLoader();
    this.loader.setDRACOLoader(dracoLoader);

    this.rootGroup = new THREE.Group();
    this.group.add(this.rootGroup);

    const defKey: TurbineType = (type in TURBINE_DEFS) ? type as TurbineType : "VAWT";
    this.rotorAxis = TURBINE_DEFS[defKey].rotorAxis;
    this.loadModel(defKey);
  }

  private async loadModel(defKey: TurbineType) {
    const def = TURBINE_DEFS[defKey];

    try {
      const gltf = await this.loader.loadAsync(`${def.basePath}/${def.glbFile}`);
      const scene = gltf.scene;
      scene.updateMatrixWorld(true);

      // Collect all mesh children from the GLB
      const meshes: THREE.Object3D[] = [];
      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          meshes.push(child);
        }
      });

      if (meshes.length === 0) return;

      // Compute each mesh's bounding-box center (for explosion direction)
      // and store its rest position (where it naturally sits in the GLB)
      const allCenters: THREE.Vector3[] = [];

      for (const mesh of meshes) {
        const box = new THREE.Box3().setFromObject(mesh);
        const center = box.getCenter(new THREE.Vector3());
        const kinematic = classifyVAWT(mesh.name);
        
        // Store the mesh's original local position as its "rest" state
        const restPosition = mesh.position.clone();

        this.parts.push({ mesh, restPosition, center, kinematic });
        allCenters.push(center);
      }

      // Compute assembly centroid
      this.assemblyCentroid.set(0, 0, 0);
      for (const c of allCenters) this.assemblyCentroid.add(c);
      this.assemblyCentroid.divideScalar(allCenters.length);

      // Style all meshes
      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.material = new THREE.MeshStandardMaterial({
            metalness: 0.75,
            roughness: 0.25,
            color: new THREE.Color(0xdce7eb),
          });
        }
      });

      // Add the scene directly — it already has the correct assembled positions
      this.rootGroup.add(scene);

      // Auto-scale to fit viewport
      const fullBox = new THREE.Box3().setFromObject(this.rootGroup);
      const size = fullBox.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) {
        const scale = 5.0 / maxDim;
        this.cadScaleFactor = maxDim / 5.0;
        this.rootGroup.scale.setScalar(scale);
      }

      // Center on ground
      const scaledBox = new THREE.Box3().setFromObject(this.rootGroup);
      const c = scaledBox.getCenter(new THREE.Vector3());
      this.rootGroup.position.x = -c.x;
      this.rootGroup.position.y = -scaledBox.min.y;
      this.rootGroup.position.z = -c.z;

      this.startAnimation();
    } catch (err) {
      console.error(`Failed to load turbine model ${this.type}:`, err);
    }
  }

  setRPM(rpm: number) { this.targetRPM = rpm; }

  setExplodeFactor(factor: number) {
    this.targetExplodeFactor = Math.max(0, Math.min(1, factor));
  }

  assemble() { this.targetExplodeFactor = 0.0; }

  explode() { this.targetExplodeFactor = 1.0; }

  private startAnimation() {
    const animate = () => {
      if (!this.group.parent) return;

      // Smooth RPM
      this.currentRPM += (this.targetRPM - this.currentRPM) * 0.05;

      // Smooth explode
      this.currentExplodeFactor += (this.targetExplodeFactor - this.currentExplodeFactor) * 0.08;

      // Apply per-part explosion
      for (const part of this.parts) {
        const dir = new THREE.Vector3().subVectors(part.center, this.assemblyCentroid);
        const len = dir.length();
        if (len > 0.001) {
          dir.normalize();
        } else {
          dir.set(0, 1, 0);
        }

        const explodeDist = this.currentExplodeFactor * 2.0 * this.cadScaleFactor;
        part.mesh.position.set(
          part.restPosition.x + dir.x * explodeDist,
          part.restPosition.y + dir.y * explodeDist,
          part.restPosition.z + dir.z * explodeDist,
        );
      }

      // Rotor spin — rotate parts tagged as rotor around the Y axis
      // (We don't use a joint group to avoid re-parenting which breaks positions)
      // Instead, skip rotor rotation for now until assembly is confirmed correct

      requestAnimationFrame(animate);
    };
    animate();
  }
}
