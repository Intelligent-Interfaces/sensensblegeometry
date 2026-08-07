import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export type RobotType = "KUKA_LBR_iiwa" | "Franka_Panda" | "UR5";

interface JointDef {
  name: string;
  origin: [number, number, number];
  rpy: [number, number, number];
  axis: [number, number, number];
  glbFile: string;
}

interface RobotDef {
  basePath: string;
  baseGlb: string;
  joints: JointDef[];
}

const PI = Math.PI;

const ROBOT_DEFS: Record<RobotType, RobotDef> = {
  "KUKA_LBR_iiwa": {
    basePath: "/models/kuka_lbr_iiwa",
    baseGlb: "base_link.glb",
    joints: [
      { name: "joint_a1", origin: [0, 0, 0],             rpy: [0, 0, 0], axis: [0, 0, 1],  glbFile: "link_1.glb" },
      { name: "joint_a2", origin: [-0.00043624, 0, 0.36], rpy: [0, 0, 0], axis: [0, 1, 0],  glbFile: "link_2.glb" },
      { name: "joint_a3", origin: [0, 0, 0],             rpy: [0, 0, 0], axis: [0, 0, 1],  glbFile: "link_3.glb" },
      { name: "joint_a4", origin: [0.00043624, 0, 0.42],  rpy: [0, 0, 0], axis: [0, -1, 0], glbFile: "link_4.glb" },
      { name: "joint_a5", origin: [0, 0, 0],             rpy: [0, 0, 0], axis: [0, 0, 1],  glbFile: "link_5.glb" },
      { name: "joint_a6", origin: [0, 0, 0.4],           rpy: [0, 0, 0], axis: [0, 1, 0],  glbFile: "link_6.glb" },
      { name: "joint_a7", origin: [0, 0, 0],             rpy: [0, 0, 0], axis: [0, 0, 1],  glbFile: "link_7.glb" },
    ],
  },
  "Franka_Panda": {
    basePath: "/models/franka_panda",
    baseGlb: "link_0.glb",
    joints: [
      { name: "panda_joint1", origin: [0, 0, 0.333],       rpy: [0, 0, 0],           axis: [0, 0, 1],  glbFile: "link_1.glb" },
      { name: "panda_joint2", origin: [0, 0, 0],           rpy: [-PI/2, 0, 0],       axis: [0, 0, 1],  glbFile: "link_2.glb" },
      { name: "panda_joint3", origin: [0, -0.316, 0],      rpy: [PI/2, 0, 0],        axis: [0, 0, 1],  glbFile: "link_3.glb" },
      { name: "panda_joint4", origin: [0.0825, 0, 0],      rpy: [PI/2, 0, 0],        axis: [0, 0, 1],  glbFile: "link_4.glb" },
      { name: "panda_joint5", origin: [-0.0825, 0.384, 0], rpy: [-PI/2, 0, 0],       axis: [0, 0, 1],  glbFile: "link_5.glb" },
      { name: "panda_joint6", origin: [0, 0, 0],           rpy: [PI/2, 0, 0],        axis: [0, 0, 1],  glbFile: "link_6.glb" },
      { name: "panda_joint7", origin: [0.088, 0, 0],       rpy: [PI/2, 0, 0],        axis: [0, 0, 1],  glbFile: "link_7.glb" },
    ],
  },
  "UR5": {
    basePath: "/models/ur5",
    baseGlb: "base_link.glb",
    joints: [
      { name: "shoulder_pan",  origin: [0, 0, 0.08916],    rpy: [0, 0, 0],        axis: [0, 0, 1],  glbFile: "shoulder.glb" },
      { name: "shoulder_lift", origin: [0, 0.13585, 0],     rpy: [0, PI/2, 0],     axis: [0, 1, 0],  glbFile: "upperarm.glb" },
      { name: "elbow",         origin: [0, -0.1197, 0.425], rpy: [0, 0, 0],        axis: [0, 1, 0],  glbFile: "forearm.glb" },
      { name: "wrist_1",       origin: [0, 0, 0.39225],    rpy: [0, PI/2, 0],     axis: [0, 1, 0],  glbFile: "wrist1.glb" },
      { name: "wrist_2",       origin: [0, 0.09315, 0],    rpy: [0, 0, 0],        axis: [0, 0, 1],  glbFile: "wrist2.glb" },
      { name: "wrist_3",       origin: [0, 0, 0.09465],    rpy: [0, 0, 0],        axis: [0, 1, 0],  glbFile: "wrist3.glb" },
    ],
  },
};

export class RobotArm {
  public group: THREE.Group;
  public joints: THREE.Group[];
  public linkMeshes: THREE.Mesh[];
  public robotType: RobotType;
  public loaded: boolean = false;
  public linkGroups: THREE.Object3D[] = [];
  public type: string;

  private loader: GLTFLoader;
  private jointDefs: JointDef[];
  private urdfRoot: THREE.Group;

  constructor(robotType: RobotType = "KUKA_LBR_iiwa") {
    this.type = robotType;
    this.group = new THREE.Group();
    this.group.name = `${robotType}_RobotArm`;
    this.joints = [];
    this.linkMeshes = [];
    this.robotType = robotType;
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');

    this.loader = new GLTFLoader();
    this.loader.setDRACOLoader(dracoLoader);
    this.jointDefs = ROBOT_DEFS[robotType].joints;

    this.urdfRoot = new THREE.Group();
    this.urdfRoot.rotation.x = -Math.PI / 2;
    this.group.add(this.urdfRoot);

    this.loadModel();
  }

  private async loadModel() {
    const def = ROBOT_DEFS[this.robotType];

    try {
      const baseGltf = await this.loader.loadAsync(`${def.basePath}/${def.baseGlb}`);
      const baseScene = baseGltf.scene;
      this.urdfRoot.add(baseScene);
      this.linkGroups.push(baseScene);

      let parentGroup: THREE.Object3D = this.urdfRoot;

      for (const jointDef of def.joints) {
        const jointGroup = new THREE.Group();
        jointGroup.name = jointDef.name;

        jointGroup.position.set(
          jointDef.origin[0],
          jointDef.origin[1],
          jointDef.origin[2]
        );
        
        // Apply static RPY rotation
        jointGroup.rotation.set(jointDef.rpy[0], jointDef.rpy[1], jointDef.rpy[2], 'XYZ');

        parentGroup.add(jointGroup);
        this.joints.push(jointGroup);

        try {
          const linkGltf = await this.loader.loadAsync(`${def.basePath}/${jointDef.glbFile}`);
          const linkScene = linkGltf.scene;
          jointGroup.add(linkScene);
          this.linkGroups.push(linkScene);
        } catch (meshErr) {
          console.warn(`Failed to load mesh ${jointDef.glbFile}:`, meshErr);
        }

        parentGroup = jointGroup;
      }

      this.loaded = true;
    } catch (err) {
      console.error(`Failed to load robot model ${this.robotType}:`, err);
    }
  }

  public setJointAngles(angles: number[]) {
    for (let i = 0; i < Math.min(angles.length, this.joints.length); i++) {
      if (!this.joints[i]) continue;

      const def = this.jointDefs[i];
      const angle = angles[i];

      // 1. Base transform from URDF rpy
      const rpyEuler = new THREE.Euler(def.rpy[0], def.rpy[1], def.rpy[2], 'XYZ');
      const baseQuat = new THREE.Quaternion().setFromEuler(rpyEuler);

      // 2. Dynamic rotation around URDF axis
      const axis = new THREE.Vector3(def.axis[0], def.axis[1], def.axis[2]).normalize();
      const dynQuat = new THREE.Quaternion().setFromAxisAngle(axis, angle);

      // 3. Combine base orientation and dynamic rotation
      this.joints[i].quaternion.copy(baseQuat).multiply(dynQuat);
    }
  }

  public getLinkNames(): string[] {
    const def = ROBOT_DEFS[this.robotType];
    const names = [def.baseGlb.replace('.glb', '')];
    for (const j of def.joints) {
      names.push(j.glbFile.replace('.glb', ''));
    }
    return names;
  }

  public setLinkColor(linkIndex: number, hex: number | null) {
    const target = this.linkGroups[linkIndex];
    if (!target) return;

    target.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;

      if (hex === null) {
        if (mesh.userData.originalMaterial) {
          mesh.material = mesh.userData.originalMaterial;
        }
        return;
      }

      if (!mesh.userData.originalMaterial) {
        mesh.userData.originalMaterial = mesh.material;
      }

      mesh.material = new THREE.MeshStandardMaterial({
        color: hex,
        roughness: 0.15,
        metalness: 0.05,
      });
    });
  }

  public setColor(hex: number | null) {
    for (let i = 0; i < this.linkGroups.length; i++) {
      this.setLinkColor(i, hex);
    }
  }
}
