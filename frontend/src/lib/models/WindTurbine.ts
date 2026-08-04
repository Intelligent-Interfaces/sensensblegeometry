import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

export class WindTurbine {
  group: THREE.Group;
  type: string;

  constructor(type: string) {
    this.type = type;
    this.group = new THREE.Group();

    // Placeholder: Tower
    const towerGeo = new THREE.CylinderGeometry(0.1, 0.2, 4, 16);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.y = 2;
    this.group.add(tower);

    // Placeholder: Nacelle
    const nacelleGeo = new THREE.BoxGeometry(0.4, 0.4, 1);
    const nacelleMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
    const nacelle = new THREE.Mesh(nacelleGeo, nacelleMat);
    nacelle.position.y = 4;
    nacelle.position.z = 0.2;
    this.group.add(nacelle);

    // Placeholder: Rotor Blades
    const rotor = new THREE.Group();
    const bladeGeo = new THREE.BoxGeometry(0.1, 3, 0.05);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    for (let i = 0; i < 3; i++) {
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.y = 1.5;
      const pivot = new THREE.Group();
      pivot.rotation.z = (i * Math.PI * 2) / 3;
      pivot.add(blade);
      rotor.add(pivot);
    }
    rotor.position.set(0, 4, 0.7);
    this.group.add(rotor);

    // Animate the rotor automatically
    const animate = () => {
      if (!this.group.parent) return; // Stop if removed from scene
      rotor.rotation.z -= 0.02;
      requestAnimationFrame(animate);
    };
    animate();
  }
}
