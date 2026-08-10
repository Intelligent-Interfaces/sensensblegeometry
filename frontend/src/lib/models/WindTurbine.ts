import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { WindFluidField } from '../physics/WindFluidField';
import { FluidStreamlines } from './FluidStreamlines';
import { Multivector } from 'engine';
import { CliffordLiquidNetwork } from '../physics/CliffordLiquidNetwork';

export type TurbineType = "VAWT" | "GE_Haliade_X";

interface TurbineDef {
  basePath: string;
  glbFiles: string[];
  rotorAxis: [number, number, number];
}

const TURBINE_DEFS: Record<TurbineType, TurbineDef> = {
  "GE_Haliade_X": {
    basePath: "/models/turbine/ge_haliade",
    glbFiles: ["rotor.glb", "nacelle.glb", "tower.glb"],
    rotorAxis: [1, 0, 0],
  },
  "VAWT": {
    basePath: "/models/turbine/vawt",
    glbFiles: ["vawt_full.glb"],
    rotorAxis: [0, 1, 0]
  }
};

function classifyVAWT(name: string): "rotor" | "static" {
  const n = name.toLowerCase();
  // Static base parts: 4 base legs (H1-001/H1-006), collars, square base plate (H1-007), motor, fasteners
  if (n.startsWith("motor") || n.includes("iso") || 
      n.startsWith("h1-001") || n.startsWith("h1-002") || n.startsWith("h1-003") || 
      n.startsWith("h1-004") || n.startsWith("h1-005") || n.startsWith("h1-006") || n.startsWith("h1-007")) {
    return "static";
  }
  // Rotor parts: 3 blades (Balde/001/002), frames (F1/001/002), pins (P1-P008), shaft rod (H1-2), hub arms (H1-008-H1-010)
  if (n.includes("balde") || n.includes("blade") || n === "h1-2" || /^f\d/.test(n) || /^f0/.test(n) || /^p\d/.test(n) || /^p0/.test(n) || 
      n.startsWith("h1-008") || n.startsWith("h1-009") || n.startsWith("h1-010") || n.includes("hub")) {
    return "rotor";
  }
  return "static";
}

// Semantic group names and matchers
function getPartGroupInfo(type: TurbineType, meshName: string): { groupName: string; groupIndex: number } {
  const n = meshName.toLowerCase();
  
  if (type === "GE_Haliade_X") {
    if (n.includes("rotor") || n.includes("blade") || n.includes("hub")) return { groupName: "Rotor & Blades", groupIndex: 0 };
    if (n.includes("nacelle") || n.includes("generator")) return { groupName: "Nacelle", groupIndex: 1 };
    return { groupName: "Tower & Foundation", groupIndex: 2 };
  } else {
    // VAWT (Lenz2)
    if (n.includes("balde") || n.includes("blade")) {
      return { groupName: "Blades", groupIndex: 0 };
    }
    if (n.startsWith("h1-008") || n.startsWith("h1-009") || n.startsWith("h1-010") || n.includes("hub")) {
      return { groupName: "Hub & Spokes", groupIndex: 1 };
    }
    if (n.startsWith("motor") || n.startsWith("h1-001") || n.startsWith("h1-002") || n.startsWith("h1-003") || 
        n.startsWith("h1-004") || n.startsWith("h1-005") || n.startsWith("h1-006") || n.startsWith("h1-007")) {
      return { groupName: "4-Leg Base", groupIndex: 2 };
    }
    return { groupName: "Internal Ribs & Shaft", groupIndex: 3 };
  }
}

function getPartColor(type: TurbineType, name: string): number {
  const { groupIndex } = getPartGroupInfo(type, name);
  if (type === "VAWT") {
    switch (groupIndex) {
      case 0: return 0xfacc15; // Blades -> industrial yellow
      case 1: return 0xeab308; // Hub & Spokes -> golden yellow
      case 2: return 0xca8a04; // 4-Leg Base -> yellow
      case 3: return 0x1e293b; // Internal Ribs & Shaft -> dark slate
      default: return 0xfacc15;
    }
  } else {
    switch (groupIndex) {
      case 0: return 0x0ea5e9;
      case 1: return 0x0284c7;
      case 2: return 0x475569;
      case 3: return 0x94a3b8;
      default: return 0xdce7eb;
    }
  }
}

export class WindTurbine {
  public group: THREE.Group;
  public type: string;

  private loader: GLTFLoader;
  private rootGroup: THREE.Group;
  private cadScaleFactor: number = 1.0;
  private rotorAxis: [number, number, number] = [0, 1, 0];

  private rotorScene: THREE.Group | null = null;
  private vawtRotorMeshes: THREE.Object3D[] = [];

  // Each individual mesh from the GLB, stored with its rest position
  private parts: { mesh: THREE.Object3D; restPosition: THREE.Vector3; center: THREE.Vector3; kinematic: "rotor" | "static" }[] = [];
  private assemblyCentroid: THREE.Vector3 = new THREE.Vector3();

  targetRPM: number = 0;
  currentRPM: number = 0;
  targetExplodeFactor: number = 0.0;
  currentExplodeFactor: number = 0.0;

  public fluidField: WindFluidField;
  public streamlines: FluidStreamlines;
  public fluidCoupled: boolean = true;
  public ltcNetwork: CliffordLiquidNetwork;
  private lastTime: number = performance.now();

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

    this.fluidField = new WindFluidField({
      turbulenceIntensity: 0.2,
    });
    this.streamlines = new FluidStreamlines(this.fluidField);
    this.group.add(this.streamlines.group);
    
    // GNC: 1 Node processing 1 Multivector input (Wind Vector)
    this.ltcNetwork = new CliffordLiquidNetwork(1, 1);

    const defKey: TurbineType = (type in TURBINE_DEFS) ? type as TurbineType : "VAWT";
    this.rotorAxis = TURBINE_DEFS[defKey].rotorAxis;
    this.loadModel(defKey);
  }

  private currentRotorAngle: number = 0;

  private async loadModel(defKey: TurbineType) {
    const def = TURBINE_DEFS[defKey];

    try {
      const scenes: THREE.Group[] = [];

      // Load all parts defined in the definition
      for (const file of def.glbFiles) {
        const gltf = await this.loader.loadAsync(`${def.basePath}/${file}`);
        const scene = gltf.scene;

        // Position and orientation alignment for GE Haliade-X rotor
        if (defKey === "GE_Haliade_X" && file === "rotor.glb") {
          scene.rotation.set(0, 0, Math.PI / 2);
          scene.position.set(-2800, 90161, 0);
          this.rotorScene = scene;
        }

        scene.updateMatrixWorld(true);
        scenes.push(scene);
      }

      if (scenes.length === 0) return;

      for (const scene of scenes) {
        this.rootGroup.add(scene);
      }

      if (defKey === "VAWT") {
        this.rotorScene = scenes[0].getObjectByName("Rotor_Group") as THREE.Group;
      }

      this.rootGroup.updateMatrixWorld(true);

      const allCenters: THREE.Vector3[] = [];

      this.rootGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const box = new THREE.Box3().setFromObject(mesh);
          const center = box.getCenter(new THREE.Vector3());
          const kinematic = classifyVAWT(mesh.name);

          mesh.material = new THREE.MeshStandardMaterial({
            metalness: 0.6,
            roughness: 0.3,
            color: new THREE.Color(getPartColor(defKey, mesh.name)),
          });

          const restPosition = mesh.position.clone();
          this.parts.push({ mesh, restPosition, center, kinematic });
          allCenters.push(center);
        }
      });

      // Compute assembly centroid
      this.assemblyCentroid.set(0, 0, 0);
      for (const c of allCenters) this.assemblyCentroid.add(c);
      if (allCenters.length > 0) this.assemblyCentroid.divideScalar(allCenters.length);

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

  public getLinkNames(): string[] {
    const defKey: TurbineType = (this.type in TURBINE_DEFS) ? this.type as TurbineType : "VAWT";
    if (defKey === "GE_Haliade_X") {
      return ["Rotor & Blades", "Nacelle", "Tower & Foundation"];
    } else {
      return ["Blades", "Hub & Frame", "Motor & Base", "Fasteners"];
    }
  }

  public setLinkColor(linkIndex: number, hex: number | null) {
    const defKey: TurbineType = (this.type in TURBINE_DEFS) ? this.type as TurbineType : "VAWT";

    for (const part of this.parts) {
      if (!part.mesh) continue;
      const mesh = part.mesh as THREE.Mesh;
      if (!mesh.isMesh) continue;

      const groupInfo = getPartGroupInfo(defKey, mesh.name);
      if (groupInfo.groupIndex !== linkIndex) continue;

      if (hex === null) {
        if (mesh.userData.originalMaterial) {
          mesh.material = mesh.userData.originalMaterial;
        }
      } else {
        if (!mesh.userData.originalMaterial) {
          mesh.userData.originalMaterial = mesh.material;
        }
        mesh.material = new THREE.MeshStandardMaterial({
          color: hex,
          roughness: 0.25,
          metalness: 0.6,
        });
      }
    }
  }

  public setColor(hex: number | null) {
    const numGroups = this.getLinkNames().length;
    for (let i = 0; i < numGroups; i++) {
      this.setLinkColor(i, hex);
    }
  }

  private startAnimation() {
    const animate = () => {
      if (!this.group.parent) return;

      const now = performance.now();
      const dt = Math.min((now - this.lastTime) / 1000, 0.1);
      const timeSeconds = now / 1000;
      this.lastTime = now;

      // Update fluid streamlines GPU particles
      if (this.streamlines) {
        this.streamlines.group.visible = this.fluidCoupled;
        if (this.fluidCoupled) {
          this.streamlines.update(dt, timeSeconds);
        }
      }

      // Fluid dynamics coupling: calculate wind speed at hub height (0, 2.5, 0)
      if (this.fluidCoupled && this.fluidField) {
        const windVel = this.fluidField.getVelocityAt(0, 2.5, 0, timeSeconds);
        
        // Geometric Neural Computing: Pass fluid velocity into Equivariant Clifford-LTC
        const windMV = Multivector.vector(windVel.x, windVel.y, windVel.z);
        const ltcOut = this.ltcNetwork.forward([windMV], dt);
        const outMV = ltcOut[0];
        
        // The LTC dynamically learns to map environmental cyclogenesis stress 
        // into a scalar RPM target (feathering blades automatically under high wind)
        // Base mapping + neural adaptation
        const localWindSpeed = windVel.length();
        const aeroTargetRPM = Math.min(60, localWindSpeed * 3.5 + outMV.get_scalar() * 10.0);
        this.targetRPM = aeroTargetRPM;
      }

      // Smooth RPM acceleration / deceleration (rigid body inertia)
      this.currentRPM += (this.targetRPM - this.currentRPM) * 0.05;

      // Smooth explode
      this.currentExplodeFactor += (this.targetExplodeFactor - this.currentExplodeFactor) * 0.08;

      // Apply per-part explosion (only offset when explode factor is active)
      for (const part of this.parts) {
        if (this.currentExplodeFactor > 0.001) {
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
        } else {
          part.mesh.position.copy(part.restPosition);
        }
      }

      // Rigid body rotational physics
      const deltaRad = (this.currentRPM * (2 * Math.PI) / 60) * (1 / 60);
      this.currentRotorAngle += deltaRad;

      // When target RPM is 0 and speed decelerates near 0, smoothly snap back to nearest 360 alignment
      if (this.targetRPM === 0 && Math.abs(this.currentRPM) < 0.1) {
        const targetAngle = Math.round(this.currentRotorAngle / (2 * Math.PI)) * (2 * Math.PI);
        this.currentRotorAngle += (targetAngle - this.currentRotorAngle) * 0.1;
      }

      if (this.type === "GE_Haliade_X" && this.rotorScene) {
        this.rotorScene.rotation.x = this.currentRotorAngle;
      } else if (this.type === "VAWT" && this.rotorScene) {
        this.rotorScene.rotation.y = this.currentRotorAngle;
      }

      requestAnimationFrame(animate);
    };
    animate();
  }
}
