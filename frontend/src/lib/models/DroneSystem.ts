import * as THREE from 'three';

export class DroneSystem {
  group: THREE.Group;
  type: string;

  constructor(type: string) {
    this.type = type;
    this.group = new THREE.Group();

    // Central body
    const bodyGeo = new THREE.BoxGeometry(0.5, 0.2, 0.5);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    this.group.add(body);

    // Arms and Rotors
    const armGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.8);
    const armMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
    
    const rotorGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.02, 16);
    const rotorMat = new THREE.MeshStandardMaterial({ color: 0xf87171, transparent: true, opacity: 0.6 });

    const rotors: THREE.Mesh[] = [];

    const positions = [
      [0.4, 0.4], [-0.4, 0.4], [0.4, -0.4], [-0.4, -0.4]
    ];

    positions.forEach((pos, i) => {
      // Arm
      const arm = new THREE.Mesh(armGeo, armMat);
      arm.rotation.x = Math.PI / 2;
      arm.rotation.z = (i % 2 === 0 ? 1 : -1) * Math.PI / 4;
      this.group.add(arm);

      // Rotor
      const rotor = new THREE.Mesh(rotorGeo, rotorMat);
      rotor.position.set(pos[0], 0.1, pos[1]);
      this.group.add(rotor);
      rotors.push(rotor);
    });

    this.group.position.y = 2; // Hover height

    // Animate rotors
    const animate = () => {
      if (!this.group.parent) return;
      rotors.forEach(r => r.rotation.y += 0.5);
      requestAnimationFrame(animate);
    };
    animate();
  }
}
