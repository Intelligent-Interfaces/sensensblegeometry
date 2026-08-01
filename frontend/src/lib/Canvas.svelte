<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import init, { Multivector, SimulationState } from 'engine';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  import { tourState } from './tourState.svelte';

  let canvasElement: HTMLDivElement;
  let simState: SimulationState;

  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let controls: OrbitControls;
  let animationFrameId: number;

  import { canvasUI } from './canvasState.svelte';

  // Blade visibility state from shared store
  let blades = $derived(canvasUI.blades);



  onMount(async () => {
    await init();
    simState = new SimulationState();

    // ── Three.js Setup ──
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc); // light chassis

    const width = canvasElement.clientWidth;
    const height = canvasElement.clientHeight;
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(4, 3, 5);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    canvasElement.appendChild(renderer.domElement);

    // OrbitControls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Grid & axes
    const grid = new THREE.GridHelper(10, 10, 0xcbd5e1, 0xe2e8f0);
    grid.position.y = -0.01;
    scene.add(grid);
    scene.add(new THREE.AxesHelper(3));

    // ── Render loop ──
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();

      // Remove old math objects
      const toRemove = scene.children.filter(
        c => c instanceof THREE.ArrowHelper || (c as THREE.Mesh).userData?.isMathObject
      );
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
          const hasVec = Math.abs(vx) > 0.001 || Math.abs(vy) > 0.001 || Math.abs(vz) > 0.001;
          const showVec = (blades.e1 && Math.abs(vx) > 0.001)
                       || (blades.e2 && Math.abs(vy) > 0.001)
                       || (blades.e3 && Math.abs(vz) > 0.001);

          if (hasVec && showVec) {
            const maskedVec = new THREE.Vector3(
              blades.e1 ? vx : 0,
              blades.e2 ? vy : 0,
              blades.e3 ? vz : 0
            );
            if (maskedVec.length() > 0.001) {
              const length = maskedVec.length();
              maskedVec.normalize();
              const colors = [0x0284c7, 0x0369a1, 0x38bdf8];
              const arrow = new THREE.ArrowHelper(maskedVec, new THREE.Vector3(0, 0, 0), length, colors[i % 3], 0.15, 0.08);
              scene.add(arrow);
            }
          }

          // 2. Bivectors (Oriented 2D Areas)
          const bxy = blades.e12 ? obj.get_bivector_xy() : 0;
          const byz = blades.e23 ? obj.get_bivector_yz() : 0;
          const bzx = blades.e31 ? obj.get_bivector_zx() : 0;

          if (Math.abs(bxy) > 0.001 || Math.abs(byz) > 0.001 || Math.abs(bzx) > 0.001) {
            const normal = new THREE.Vector3(byz, bzx, bxy);
            const area = normal.length();
            normal.normalize();
            const radius = Math.sqrt(area / Math.PI);

            const geo = new THREE.RingGeometry(radius * 0.15, radius, 32);
            const mat = new THREE.MeshBasicMaterial({ color: 0x7c3aed, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
            const ring = new THREE.Mesh(geo, mat);
            ring.lookAt(normal);
            ring.userData = { isMathObject: true };
            scene.add(ring);
          }

          // 3. Trivectors (3D Volumes)
          const tv = blades.e123 ? obj.get_trivector() : 0;
          if (Math.abs(tv) > 0.001) {
            const radius = Math.cbrt((Math.abs(tv) * 3) / (4 * Math.PI));
            const geo = new THREE.SphereGeometry(radius, 32, 16);
            const mat = new THREE.MeshBasicMaterial({ color: 0xea580c, transparent: true, opacity: 0.25 });
            const sphere = new THREE.Mesh(geo, mat);
            sphere.userData = { isMathObject: true };
            scene.add(sphere);
          }
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    const resizeObserver = new ResizeObserver(() => {
      if (!canvasElement || !camera || !renderer) return;
      const w = canvasElement.clientWidth;
      const h = canvasElement.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    
    resizeObserver.observe(canvasElement);
    
    return () => resizeObserver.disconnect();
  });

  onDestroy(() => {
    cancelAnimationFrame(animationFrameId);
    if (renderer) renderer.dispose();
    if (simState) simState.free();
  });

  $effect(() => {
    const handleThemeChange = (e: CustomEvent) => {
      if (!scene) return;
      const isDark = e.detail.isDark;
      const bgColor = isDark ? 0x0f172a : 0xf8fafc;
      scene.background = new THREE.Color(bgColor);
    };
    window.addEventListener('themechanged', handleThemeChange as EventListener);
    return () => window.removeEventListener('themechanged', handleThemeChange as EventListener);
  });

  // ── GA Controls (Exported for Notebook) ──
  export const addVectorX = () => { simState?.add_object(Multivector.vector(Math.random() * 1.5 + 0.5, 0, 0)); };
  export const addVectorY = () => { simState?.add_object(Multivector.vector(0, Math.random() * 1.5 + 0.5, 0)); };
  export const addVectorZ = () => { simState?.add_object(Multivector.vector(0, 0, Math.random() * 1.5 + 0.5)); };

  export const computeProduct = (type: 'geometric' | 'wedge' | 'inner') => {
    if (simState && simState.object_count() >= 2) {
      const n = simState.object_count();
      const a = simState.get_object(n - 2);
      const b = simState.get_object(n - 1);
      
      let result;
      if (type === 'geometric') result = a.geometric_product(b);
      else if (type === 'wedge') {
        result = a.wedge(b);
        tourState.reportAction('wedge_clicked');
      }
      else if (type === 'inner') result = a.inner(b);
      
      if (result) simState.add_object(result);
    }
  };

  export const computeDual = () => {
    if (simState && simState.object_count() >= 1) {
      const n = simState.object_count();
      const a = simState.get_object(n - 1);
      const result = a.dual();
      simState.add_object(result);
      tourState.reportAction('dual_clicked');
    }
  };

  export const clearCanvas = () => simState?.clear();
</script>

<div class="canvas-wrapper">
  <!-- Three.js mount point -->
  <div class="canvas-container" bind:this={canvasElement}></div>
</div>

<style>
  .canvas-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    background: var(--bg-chassis);
  }

  .canvas-container {
    width: 100%;
    height: 100%;
  }
</style>
