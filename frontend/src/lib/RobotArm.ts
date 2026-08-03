import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type RobotType = "KUKA_LBR_iiwa" | "Franka_Panda" | "UR5";

/**
 * Joint definition extracted from URDF files.
 * origin: [x, y, z] offset from parent joint
 * axis: [x, y, z] rotation axis
 * glbFile: per-link GLB mesh filename
 */
interface JointDef {
  name: string;
  origin: [number, number, number];
  axis: [number, number, number];
  glbFile: string;
}

interface RobotDef {
  basePath: string;
  baseGlb: string;
  joints: JointDef[];
}

// ─── Robot definitions from URDFs ───────────────────────────────────────────
const ROBOT_DEFS: Record<RobotType, RobotDef> = {
  // From kuka_description/kuka_lbr_iiwa/urdf/lbr_iiwa_14_r820.urdf
  "KUKA_LBR_iiwa": {
    basePath: "/models/kuka_lbr_iiwa",
    baseGlb: "base_link.glb",
    joints: [
      { name: "joint_a1", origin: [0, 0, 0],      axis: [0, 0, 1],  glbFile: "link_1.glb" },
      { name: "joint_a2", origin: [-0.00043624, 0, 0.36], axis: [0, 1, 0],  glbFile: "link_2.glb" },
      { name: "joint_a3", origin: [0, 0, 0],      axis: [0, 0, 1],  glbFile: "link_3.glb" },
      { name: "joint_a4", origin: [0.00043624, 0, 0.42], axis: [0, -1, 0], glbFile: "link_4.glb" },
      { name: "joint_a5", origin: [0, 0, 0],      axis: [0, 0, 1],  glbFile: "link_5.glb" },
      { name: "joint_a6", origin: [0, 0, 0.4],    axis: [0, 1, 0],  glbFile: "link_6.glb" },
      { name: "joint_a7", origin: [0, 0, 0],      axis: [0, 0, 1],  glbFile: "link_7.glb" },
    ],
  },
  // From franka_description URDF (standard Panda kinematics)
  "Franka_Panda": {
    basePath: "/models/franka_panda",
    baseGlb: "link_0.glb",
    joints: [
      { name: "panda_joint1", origin: [0, 0, 0.333],     axis: [0, 0, 1],  glbFile: "link_1.glb" },
      { name: "panda_joint2", origin: [0, 0, 0],          axis: [0, 1, 0],  glbFile: "link_2.glb" },
      { name: "panda_joint3", origin: [0, -0.316, 0],     axis: [0, 0, 1],  glbFile: "link_3.glb" },
      { name: "panda_joint4", origin: [0.0825, 0, 0],     axis: [0, -1, 0], glbFile: "link_4.glb" },
      { name: "panda_joint5", origin: [-0.0825, 0.384, 0], axis: [0, 0, 1], glbFile: "link_5.glb" },
      { name: "panda_joint6", origin: [0, 0, 0],          axis: [0, 1, 0],  glbFile: "link_6.glb" },
      { name: "panda_joint7", origin: [0.088, 0, 0],      axis: [0, 0, 1],  glbFile: "link_7.glb" },
    ],
  },
  // From ur_description URDF (UR5 standard)
  "UR5": {
    basePath: "/models/ur5",
    baseGlb: "base_link.glb",
    joints: [
      { name: "shoulder_pan",  origin: [0, 0, 0.08916],   axis: [0, 0, 1],  glbFile: "shoulder.glb" },
      { name: "shoulder_lift", origin: [0, 0.13585, 0],    axis: [0, 1, 0],  glbFile: "upperarm.glb" },
      { name: "elbow",         origin: [0, -0.1197, 0.425], axis: [0, 1, 0], glbFile: "forearm.glb" },
      { name: "wrist_1",       origin: [0, 0, 0.39225],   axis: [0, 1, 0],  glbFile: "wrist1.glb" },
      { name: "wrist_2",       origin: [0, 0.09315, 0],   axis: [0, 0, 1],  glbFile: "wrist2.glb" },
      { name: "wrist_3",       origin: [0, 0, 0.09465],   axis: [0, 1, 0],  glbFile: "wrist3.glb" },
    ],
  },
};

export class RobotArm {
  public group: THREE.Group;
  public joints: THREE.Group[];
  public linkMeshes: THREE.Mesh[];
  public robotType: RobotType;
  public loaded: boolean = false;

  private loader: GLTFLoader;
  private jointDefs: JointDef[];

  constructor(robotType: RobotType = "KUKA_LBR_iiwa") {
    this.group = new THREE.Group();
    this.group.name = `${robotType}_RobotArm`;
    this.joints = [];
    this.linkMeshes = [];
    this.robotType = robotType;
    this.loader = new GLTFLoader();
    this.jointDefs = ROBOT_DEFS[robotType].joints;

    this.loadModel();
  }

  private async loadModel() {
    const def = ROBOT_DEFS[this.robotType];

    try {
      // Load base link
      const baseGltf = await this.loader.loadAsync(`${def.basePath}/${def.baseGlb}`);
      const baseScene = baseGltf.scene;
      // URDF meshes use Z-up; Three.js uses Y-up
      baseScene.rotation.x = -Math.PI / 2;
      this.group.add(baseScene);

      // Build kinematic chain: each joint is a Group nested inside its parent
      let parentGroup: THREE.Group = this.group;

      for (const jointDef of def.joints) {
        // Create a joint group at the URDF-specified origin
        const jointGroup = new THREE.Group();
        jointGroup.name = jointDef.name;

        // URDF origin is in Z-up; convert to Y-up for Three.js
        // URDF (x, y, z) → Three.js (x, z, -y) ... but since we rotated
        // the base by -90° around X, the child groups inherit that frame.
        // Actually, it's cleaner to keep the entire chain in URDF frame
        // and just rotate the root. So use URDF coords directly:
        jointGroup.position.set(
          jointDef.origin[0],
          jointDef.origin[1],
          jointDef.origin[2]
        );

        parentGroup.add(jointGroup);
        this.joints.push(jointGroup);

        // Load the link mesh for this joint
        try {
          const linkGltf = await this.loader.loadAsync(`${def.basePath}/${jointDef.glbFile}`);
          const linkScene = linkGltf.scene;
          jointGroup.add(linkScene);
        } catch (meshErr) {
          console.warn(`Failed to load mesh ${jointDef.glbFile}:`, meshErr);
        }

        // Next joint's parent is this joint
        parentGroup = jointGroup;
      }

      this.loaded = true;
    } catch (err) {
      console.error(`Failed to load robot model ${this.robotType}:`, err);
      // Fall back to a simple placeholder
      this.buildPlaceholder();
    }
  }

  private buildPlaceholder() {
    const mat = new THREE.MeshStandardMaterial({ color: 0xff0000, wireframe: true });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.2), mat);
    mesh.position.y = 0.25;
    this.group.add(mesh);
  }

  public setJointAngles(angles: number[]) {
    for (let i = 0; i < Math.min(angles.length, this.joints.length); i++) {
      if (!this.joints[i]) continue;

      const axisVec = this.jointDefs[i].axis;
      const angle = angles[i];

      // Reset rotation then apply around the URDF-specified axis
      this.joints[i].rotation.set(0, 0, 0);

      if (axisVec[0] !== 0) {
        this.joints[i].rotation.x = angle * axisVec[0];
      } else if (axisVec[1] !== 0) {
        this.joints[i].rotation.y = angle * axisVec[1];
      } else if (axisVec[2] !== 0) {
        this.joints[i].rotation.z = angle * axisVec[2];
      }
    }
  }

  /**
   * Override the color of all meshes in the robot.
   * Pass null to restore original materials.
   */
  public setColor(hex: number | null) {
    this.group.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;

      if (hex === null) {
        // Restore original material if we saved one
        if (mesh.userData.originalMaterial) {
          mesh.material = mesh.userData.originalMaterial;
        }
        return;
      }

      // Save original material on first override
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
}

