<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import init, { Multivector, SimulationState } from 'engine';
  import * as THREE from 'three';

  let canvasElement: HTMLDivElement;
  let simState: SimulationState;
  
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let animationFrameId: number;

  onMount(async () => {
    // Initialize the WebAssembly module
    await init();
    console.log("WASM Engine initialized successfully");

    // Initialize the simulation state
    simState = new SimulationState();
    
    // --- Three.js Setup ---
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1e1e1e);

    // Set up camera
    const width = canvasElement.clientWidth;
    const height = canvasElement.clientHeight;
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);

    // Set up renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    canvasElement.appendChild(renderer.domElement);

    // Add basic lighting and grid
    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    // Render loop
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // In a full physics loop, we would call simState.step() here
      // For now, we just read the static objects from WASM memory and render them

      // Clear previous math objects (inefficient, but works for PoC)
      const toRemove = scene.children.filter(c => c instanceof THREE.ArrowHelper || c.userData?.isMathObject);
      toRemove.forEach(c => {
        if ((c as THREE.Mesh).geometry) (c as THREE.Mesh).geometry.dispose();
        if ((c as THREE.Mesh).material) ((c as THREE.Mesh).material as THREE.Material).dispose();
        scene.remove(c);
      });

      if (simState) {
          const count = simState.object_count();
          for (let i = 0; i < count; i++) {
            const obj = simState.get_object(i);
            
            const vx = obj.get_vector_x();
            const vy = obj.get_vector_y();
            const vz = obj.get_vector_z();

            // 1. Vectors (1D Arrows)
            if (Math.abs(vx) > 0.001 || Math.abs(vy) > 0.001 || Math.abs(vz) > 0.001) {
              const dir = new THREE.Vector3(vx, vy, vz);
              const length = dir.length();
              dir.normalize();
              const origin = new THREE.Vector3(0, 0, 0);
              
              // Color based on index for variety
              const color = i % 3 === 0 ? 0xff3333 : (i % 3 === 1 ? 0x33ff33 : 0x3333ff);
              const arrowHelper = new THREE.ArrowHelper(dir, origin, length, color);
              scene.add(arrowHelper);
            }
            
            // 2. Bivectors (Oriented 2D Areas)
            const bxy = obj.get_bivector_xy();
            const byz = obj.get_bivector_yz();
            const bzx = obj.get_bivector_zx();
            
            if (Math.abs(bxy) > 0.001 || Math.abs(byz) > 0.001 || Math.abs(bzx) > 0.001) {
              // Normal vector via dual: (byz, bzx, bxy)
              const normal = new THREE.Vector3(byz, bzx, bxy);
              const area = normal.length();
              normal.normalize();

              // Scale radius by area
              const radius = Math.sqrt(area / Math.PI);
              const geometry = new THREE.CircleGeometry(radius, 32);
              const material = new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
              const disk = new THREE.Mesh(geometry, material);
              
              disk.lookAt(normal);
              disk.userData = { isMathObject: true };
              scene.add(disk);
            }

            // 3. Trivectors (3D Volumes)
            const tv = obj.get_trivector();
            if (Math.abs(tv) > 0.001) {
              const volume = Math.abs(tv);
              const radius = Math.cbrt((volume * 3) / (4 * Math.PI));

              const geometry = new THREE.SphereGeometry(radius, 32, 16);
              const material = new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.3 });
              const sphere = new THREE.Mesh(geometry, material);
              
              sphere.userData = { isMathObject: true };
              scene.add(sphere);
            }
          }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (!canvasElement) return;
      const w = canvasElement.clientWidth;
      const h = canvasElement.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });

  onDestroy(() => {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (renderer) renderer.dispose();
  });

  // UI Interactive Functions
  const addVectorX = () => {
    if (simState) {
      const v = Multivector.vector(Math.random() * 2 + 1, 0, 0); // random length 1-3
      simState.add_object(v);
    }
  };

  const addVectorY = () => {
    if (simState) {
      const v = Multivector.vector(0, Math.random() * 2 + 1, 0);
      simState.add_object(v);
    }
  };

  const addVectorZ = () => {
    if (simState) {
      const v = Multivector.vector(0, 0, Math.random() * 2 + 1);
      simState.add_object(v);
    }
  };

  const computeProduct = () => {
    if (simState && simState.object_count() >= 2) {
        const count = simState.object_count();
        const a = simState.get_object(count - 2);
        const b = simState.get_object(count - 1);
        const res = a.geometric_product(b);
        simState.add_object(res);
    }
  };

  const clearCanvas = () => {
    if (simState) {
      simState.clear();
    }
  };
</script>

<div class="canvas-wrapper">
  <!-- Interactive UI Overlay -->
  <div class="control-panel">
    <h3>Geometric Controls</h3>
    <button onclick={addVectorX}>Add Vector X</button>
    <button onclick={addVectorY}>Add Vector Y</button>
    <button onclick={addVectorZ}>Add Vector Z</button>
    <div class="divider"></div>
    <button onclick={computeProduct} class="primary">Compute Geometric Product</button>
    <button onclick={clearCanvas} class="danger">Clear Canvas</button>
  </div>

  <div class="canvas-container" bind:this={canvasElement}>
    <!-- Three.js will inject its <canvas> here -->
  </div>
</div>

<style>
  .canvas-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .canvas-container {
    width: 100%;
    height: 100%;
    background-color: #1e1e1e; /* Darker background */
    overflow: hidden;
  }

  .control-panel {
    position: absolute;
    top: 20px;
    left: 20px;
    background: rgba(30, 30, 30, 0.85);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    padding: 16px;
    color: white;
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 200px;
  }

  .control-panel h3 {
    margin: 0 0 10px 0;
    font-size: 1.1rem;
    color: #e0e0e0;
    font-family: monospace;
  }

  button {
    background: #333;
    color: white;
    border: 1px solid #555;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-family: monospace;
    transition: all 0.2s;
  }

  button:hover {
    background: #444;
  }

  button.primary {
    background: #2b5c8f;
    border-color: #3b7cbf;
  }

  button.primary:hover {
    background: #3b7cbf;
  }

  button.danger {
    background: #8f2b2b;
    border-color: #bf3b3b;
  }

  button.danger:hover {
    background: #bf3b3b;
  }

  .divider {
    height: 1px;
    background: rgba(255,255,255,0.1);
    margin: 5px 0;
  }
</style>
