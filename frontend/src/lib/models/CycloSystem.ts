import * as THREE from 'three';

export class CycloSystem {
  group: THREE.Group;
  type: string;

  constructor(type: string) {
    this.type = type;
    this.group = new THREE.Group();

    // Tornado placeholder: A stacked set of rings
    const numRings = 20;
    const rings: THREE.Mesh[] = [];
    
    const mat = new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.5, side: THREE.DoubleSide });

    for (let i = 0; i < numRings; i++) {
      const radius = 0.5 + (i / numRings) * 2; // wider at top
      const geo = new THREE.TorusGeometry(radius, 0.1, 8, 24);
      const ring = new THREE.Mesh(geo, mat);
      ring.position.y = (i / numRings) * 5; // 5 units tall
      ring.rotation.x = Math.PI / 2;
      this.group.add(ring);
      rings.push(ring);
    }

    // Animate rings
    const animate = () => {
      if (!this.group.parent) return;
      rings.forEach((r, i) => {
        r.rotation.z += 0.05 * (1 + (numRings - i) / numRings); // inner/lower spins faster
        // Add a slight wobble
        r.position.x = Math.sin(Date.now() * 0.002 + i) * 0.1;
        r.position.z = Math.cos(Date.now() * 0.002 + i) * 0.1;
      });
      requestAnimationFrame(animate);
    };
    animate();
  }
}
