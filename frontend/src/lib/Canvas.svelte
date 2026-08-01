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
    
    // Create a vector in X direction
    let vecX = Multivector.vector(2.0, 0.0, 0.0);
    // Create a vector in Y direction
    let vecY = Multivector.vector(0.0, 3.0, 0.0);
    
    // Perform Geometric Product (X * Y should produce a bivector XY with magnitude 6.0)
    let result = vecX.geometric_product(vecY);
    
    simState.add_object(vecX);
    simState.add_object(vecY);
    simState.add_object(result);
    console.log(`Simulation objects count: ${simState.object_count()}`);

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

      // Clear previous arrows (inefficient, but works for PoC)
      const toRemove = scene.children.filter(c => c instanceof THREE.ArrowHelper);
      toRemove.forEach(c => scene.remove(c));

      const count = simState.object_count();
      for (let i = 0; i < count; i++) {
        const obj = simState.get_object(i);
        
        const vx = obj.get_vector_x();
        const vy = obj.get_vector_y();
        const vz = obj.get_vector_z();

        // If it has vector components, draw an arrow
        if (Math.abs(vx) > 0.001 || Math.abs(vy) > 0.001 || Math.abs(vz) > 0.001) {
          const dir = new THREE.Vector3(vx, vy, vz);
          const length = dir.length();
          dir.normalize();
          const origin = new THREE.Vector3(0, 0, 0);
          
          // Color based on index for variety
          const color = i === 0 ? 0xff3333 : (i === 1 ? 0x33ff33 : 0x3333ff);
          const arrowHelper = new THREE.ArrowHelper(dir, origin, length, color);
          scene.add(arrowHelper);
        }
        
        // Bivectors can be drawn as well (future work)
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
</script>

<div class="canvas-container" bind:this={canvasElement}>
  <!-- Three.js will inject its <canvas> here -->
</div>

<style>
  .canvas-container {
    width: 100%;
    height: 100%;
    background-color: #1e1e1e; /* Darker background */
    overflow: hidden;
  }
</style>
