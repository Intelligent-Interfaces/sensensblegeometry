import * as THREE from 'three';
import { JSMultivector as Multivector, CliffordLiquidNetwork } from '../physics/CliffordLiquidNetwork';
import type { MetaMaterialController } from '../controllers/MetaMaterialController';
import { NaiveHookeanController, StandardMLPMetaMaterialController, CliffordGNCMetaMaterialController } from '../controllers/MetaMaterialController';
import type { StrategyType, ControllerMetrics } from '../controllers/DroneController';
import { WindFluidField } from '../physics/WindFluidField';
import { FluidStreamlines } from './FluidStreamlines';

interface LatticeLink {
    i: number;
    j: number;
    line: THREE.Line;
}

/**
 * Geometric NC Observability Dashboard Model.
 * Simulates an abstract meta-material lattice coupled to a Clifford-Liquid Network.
 * Visualizes the internal E(3) Multivector states natively in 3D.
 */
export class GeometricNCSystem {
    group: THREE.Group;
    type: string;
    
    // Physics & Liquid Network
    public ltcNetwork: CliffordLiquidNetwork;
    public fluidField: WindFluidField;
    public streamlines: FluidStreamlines;
    public fluidCoupled: boolean = true;
    public activeStrategy: StrategyType = 'clifford_gnc';
    public controller: MetaMaterialController;
    
    // Abstract Meta-Material Mesh
    private nodes: THREE.Mesh[] = [];
    private links: LatticeLink[] = [];
    private nodePositions: THREE.Vector3[] = [];
    private nodeVelocities: THREE.Vector3[] = [];
    
    // Multivector Visualizers
    private vectorArrows: THREE.ArrowHelper[] = [];
    private bivectorPlanes: THREE.Mesh[] = [];
    
    // Telemetry & UI
    public currentTau: number = 1.0;
    public systemStrain: number = 0.0;
    public visualDensity: number = 1.0; // Slider: 0.0 to 1.0

    private lastTime: number = performance.now();
    
    constructor(type: string) {
        this.type = type;
        this.group = new THREE.Group();
        this.group.name = "GeometricNC_Dashboard";
        this.group.position.y = 2.0; // Elevate off ground
        
        // Fluid Field
        this.fluidField = new WindFluidField({
            ambientWindSpeed: 2.0,
            turbulenceIntensity: 0.1,
            circulationGamma: 10.0
        });
        this.streamlines = new FluidStreamlines(this.fluidField);
        this.group.add(this.streamlines.group);
        
        // Build Abstract Meta-Material Lattice (3x3x3 grid)
        this.buildLattice(3, 3, 3);
        
        // Geometric Neural Computing: Network with N nodes (one for each lattice node)
        this.ltcNetwork = new CliffordLiquidNetwork(this.nodes.length, 1);
        this.controller = new CliffordGNCMetaMaterialController(this.nodes.length);
        
        this.startAnimation();
    }
    
    private buildLattice(w: number, h: number, d: number) {
        const spacing = 1.5;
        const nodeGeo = new THREE.SphereGeometry(0.12, 16, 16);
        const nodeMat = new THREE.MeshStandardMaterial({ color: 0x4f46e5, metalness: 0.8, roughness: 0.2 });
        
        for (let x = 0; x < w; x++) {
            for (let y = 0; y < h; y++) {
                for (let z = 0; z < d; z++) {
                    const px = (x - (w - 1) / 2) * spacing;
                    const py = (y - (h - 1) / 2) * spacing;
                    const pz = (z - (d - 1) / 2) * spacing;
                    
                    const mesh = new THREE.Mesh(nodeGeo, nodeMat);
                    mesh.position.set(px, py, pz);
                    this.group.add(mesh);
                    
                    this.nodes.push(mesh);
                    this.nodePositions.push(new THREE.Vector3(px, py, pz));
                    this.nodeVelocities.push(new THREE.Vector3());
                    
                    // Setup Visualizers for this node
                    const arrow = new THREE.ArrowHelper(new THREE.Vector3(0,1,0), new THREE.Vector3(px, py, pz), 0, 0xef4444);
                    this.vectorArrows.push(arrow);
                    this.group.add(arrow);
                    
                    // Bivector plane (disc)
                    const discGeo = new THREE.CircleGeometry(0.4, 32);
                    const discMat = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
                    const disc = new THREE.Mesh(discGeo, discMat);
                    disc.position.set(px, py, pz);
                    this.bivectorPlanes.push(disc);
                    this.group.add(disc);
                }
            }
        }
        
        // Build links (Springs)
        const lineMat = new THREE.LineBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.6 });
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const dist = this.nodePositions[i].distanceTo(this.nodePositions[j]);
                if (dist <= spacing * 1.5) { // Adjacent
                    const geo = new THREE.BufferGeometry().setFromPoints([this.nodes[i].position, this.nodes[j].position]);
                    const line = new THREE.Line(geo, lineMat);
                    this.links.push({ i, j, line });
                    this.group.add(line);
                }
            }
        }
    }
    
    private startAnimation() {
        const animate = () => {
            if (!this.group.parent) {
                requestAnimationFrame(animate);
                return;
            }
            const now = performance.now();
            const dt = Math.min((now - this.lastTime) / 1000, 0.1);
            const timeSeconds = now / 1000;
            this.lastTime = now;
            
            if (this.streamlines) {
                this.streamlines.group.visible = this.fluidCoupled;
                if (this.fluidCoupled) this.streamlines.update(dt, timeSeconds);
            }
            
            let totalTau = 0;
            let totalStrain = 0;
            
            // Forward pass LTC Network
            if (this.fluidCoupled) {
                const ltcOutputs = this.nodes.map((_, i) => {
                    const windVel = this.fluidField.getVelocityAt(this.nodes[i].position.x, this.nodes[i].position.y + 2.0, this.nodes[i].position.z, timeSeconds);
                    const windMV = Multivector.vector(windVel.x, windVel.y, windVel.z);
                    return this.ltcNetwork.nodes[i].forward([windMV], dt);
                });

                for (let i = 0; i < this.nodes.length; i++) {
                    const pos = this.nodes[i].position;
                    // Get local wind
                    const windVel = this.fluidField.getVelocityAt(pos.x, pos.y + 2.0, pos.z, timeSeconds);
                    
                    // Geometric Neural pass
                    const ltcOut = ltcOutputs[i];
                    totalTau += this.ltcNetwork.nodes[i].tau;
                    
                    const displacements = this.controller.computeLatticeDeformation(this.nodePositions, windVel, dt);
                    const disp = displacements[i] || new THREE.Vector3();
                    
                    // Visual Density Logic
                    const isVisible = (i / this.nodes.length) <= this.visualDensity;
                    
                    this.vectorArrows[i].visible = isVisible;
                    this.bivectorPlanes[i].visible = isVisible;
                    
                    const vx = ltcOut.get_vector_x();
                    const vy = ltcOut.get_vector_y();
                    const vz = ltcOut.get_vector_z();
                    
                    if (isVisible) {
                        // Visualize Vector component (Arrow)
                        const vLen = Math.sqrt(vx*vx + vy*vy + vz*vz);
                        if (vLen > 0.01) {
                            this.vectorArrows[i].setDirection(new THREE.Vector3(vx, vy, vz).normalize());
                            this.vectorArrows[i].setLength(vLen * 5.0, vLen * 1.5, vLen * 0.5);
                            this.vectorArrows[i].position.copy(pos);
                        } else {
                            this.vectorArrows[i].setLength(0);
                        }
                        
                        // Visualize Bivector component (Plane)
                        const bx = ltcOut.get_bivector_yz();
                        const by = ltcOut.get_bivector_zx();
                        const bz = ltcOut.get_bivector_xy();
                        const bLen = Math.sqrt(bx*bx + by*by + bz*bz);
                        
                        if (bLen > 0.01) {
                            const normal = new THREE.Vector3(bx, by, bz).normalize();
                            this.bivectorPlanes[i].quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), normal);
                            this.bivectorPlanes[i].scale.setScalar(bLen * 2.0 + 0.1);
                            this.bivectorPlanes[i].position.copy(pos);
                            
                            this.bivectorPlanes[i].rotateZ(timeSeconds * bLen * 5.0);
                        } else {
                            this.bivectorPlanes[i].scale.setScalar(0.001);
                        }
                    }
                    
                    // Physics integration: Morph the material using the neural vector
                    this.nodeVelocities[i].add(windVel.clone().multiplyScalar(dt * 0.5));
                    this.nodeVelocities[i].add(disp.multiplyScalar(dt * 5.0));
                    
                    // Spring back to origin
                    const springForce = this.nodePositions[i].clone().sub(pos).multiplyScalar(5.0 * dt);
                    this.nodeVelocities[i].add(springForce);
                    this.nodeVelocities[i].multiplyScalar(0.9); // Damping
                    
                    pos.add(this.nodeVelocities[i].clone().multiplyScalar(dt));
                    
                    totalStrain += pos.distanceTo(this.nodePositions[i]);
                }
                
                // Update lines accurately using LatticeLink mapping
                for (const link of this.links) {
                    const posA = this.nodes[link.i].position;
                    const posB = this.nodes[link.j].position;
                    const positions = link.line.geometry.attributes.position.array as Float32Array;
                    positions[0] = posA.x;
                    positions[1] = posA.y;
                    positions[2] = posA.z;
                    positions[3] = posB.x;
                    positions[4] = posB.y;
                    positions[5] = posB.z;
                    link.line.geometry.attributes.position.needsUpdate = true;
                }
            }
            
            this.currentTau = (totalTau / this.nodes.length) + (Math.random() * 0.1);
            this.systemStrain = totalStrain;
            
            requestAnimationFrame(animate);
        };
        animate();
    }

    public setStrategy(strategy: StrategyType) {
        if (this.activeStrategy === strategy) return;
        this.activeStrategy = strategy;
        switch(strategy) {
            case 'naive_pid': this.controller = new NaiveHookeanController(); break;
            case 'standard_mlp': this.controller = new StandardMLPMetaMaterialController(this.nodes.length); break;
            case 'clifford_gnc': this.controller = new CliffordGNCMetaMaterialController(this.nodes.length); break;
        }
    }

    public getSwarmMetrics(): ControllerMetrics {
        return this.controller.getMetrics();
    }
}
