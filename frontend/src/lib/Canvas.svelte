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

  // Blade visibility state
  let blades = $state({
    e1: true,
    e2: true,
    e3: true,
    e12: true,
    e23: true,
    e31: true,
    e123: true,
  });

  const bladeLabels = [
    { key: 'e1', label: 'e₁' },
    { key: 'e2', label: 'e₂' },
    { key: 'e3', label: 'e₃' },
    { key: 'e12', label: 'e₁₂' },
    { key: 'e23', label: 'e₂₃' },
    { key: 'e31', label: 'e₃₁' },
    { key: 'e123', label: 'e₁₂₃' },
  ];

  function toggleBlade(key: string) {
    blades = { ...blades, [key]: !blades[key as keyof typeof blades] };
  }

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

    const handleResize = () => {
      if (!canvasElement) return;
      const w = canvasElement.clientWidth;
      const h = canvasElement.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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

  // ── GA Controls ──
  const addVectorX = () => { simState?.add_object(Multivector.vector(Math.random() * 1.5 + 0.5, 0, 0)); };
  const addVectorY = () => { simState?.add_object(Multivector.vector(0, Math.random() * 1.5 + 0.5, 0)); };
  const addVectorZ = () => { simState?.add_object(Multivector.vector(0, 0, Math.random() * 1.5 + 0.5)); };

  const computeProduct = (type: 'geometric' | 'wedge' | 'inner') => {
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

  const computeDual = () => {
    if (simState && simState.object_count() >= 1) {
      const n = simState.object_count();
      const a = simState.get_object(n - 1);
      const result = a.dual();
      simState.add_object(result);
      tourState.reportAction('dual_clicked');
    }
  };

  const clearCanvas = () => simState?.clear();
</script>

<div class="canvas-wrapper">
  <!-- ── Floating Control Panel ── -->
  <div class="control-panel">
    <p class="panel-heading">Add Vectors</p>

    <!-- Vector add buttons -->
    <div class="btn-group">
      <button id="add-vec-x" onclick={addVectorX}>+ e₁</button>
      <button id="add-vec-y" onclick={addVectorY}>+ e₂</button>
      <button id="add-vec-z" onclick={addVectorZ}>+ e₃</button>
    </div>

    <div class="divider"></div>
    <p class="panel-heading">Cl(3,0) Operations</p>
    
    <div class="op-grid">
      <button class="primary" onclick={() => computeProduct('geometric')}>Geometric (ab)</button>
      <button id="btn-wedge" class="primary" class:pulsing={tourState.currentStep?.highlightElement === 'btn-wedge'} onclick={() => computeProduct('wedge')}>Wedge (a ∧ b)</button>
      <button class="primary" onclick={() => computeProduct('inner')}>Inner (a · b)</button>
      <button id="btn-dual" class="primary" class:pulsing={tourState.currentStep?.highlightElement === 'btn-dual'} onclick={computeDual}>Dual (a*)</button>
    </div>

    <button id="clear-btn" class="danger" style="margin-top: 4px;" onclick={clearCanvas}>Clear Canvas</button>

    <!-- ── Blade Toggles ── -->
    <div class="divider"></div>
    <p class="panel-heading">Blade Visibility</p>
    <div class="blade-grid">
      {#each bladeLabels as b}
        <button
          class="blade-toggle"
          class:active={blades[b.key as keyof typeof blades]}
          onclick={() => toggleBlade(b.key)}
        >
          {b.label}
        </button>
      {/each}
    </div>
  </div>

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
    overflow: hidden;
  }

  /* ── Control Panel ── */
  .control-panel {
    position: absolute;
    top: 16px;
    left: 16px;
    background: var(--panel-bg);
    backdrop-filter: blur(10px);
    border: 1px solid var(--card-border);
    border-radius: 12px;
    padding: 14px;
    color: var(--text-main);
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 190px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }

  .panel-heading {
    font-size: 0.68rem;
    font-family: var(--font-mono);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1.2px;
    font-weight: 700;
    margin: 0;
  }

  .btn-group {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 5px;
  }

  .op-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 5px;
  }

  button {
    background: var(--bg-chassis);
    color: var(--text-main);
    border: 1px solid var(--card-border);
    padding: 6px 10px;
    border-radius: 5px;
    cursor: pointer;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    transition: all 0.15s ease;
    font-weight: 500;
  }

  button:hover {
    background: var(--card-border);
  }

  button.primary {
    background: var(--accent-vis-light);
    color: var(--accent-vis);
    border-color: var(--accent-vis);
    font-weight: 700;
  }

  button.primary:hover {
    background: var(--accent-vis);
    color: white;
  }

  button.danger {
    background: #fee2e2;
    color: #dc2626;
    border-color: #fca5a5;
  }

  button.danger:hover {
    background: #dc2626;
    color: white;
  }

  /* ── Pulse animation for tour highlights ── */
  button.pulsing {
    animation: pulse 1.5s infinite;
    box-shadow: 0 0 0 0 rgba(198, 120, 221, 0.7);
    border-color: #c678dd;
    color: #c678dd;
  }

  @keyframes pulse {
    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(198, 120, 221, 0.7); }
    70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(198, 120, 221, 0); }
    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(198, 120, 221, 0); }
  }

  /* ── Blade Toggles ── */
  .blade-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
  }

  .blade-toggle {
    padding: 5px 4px;
    font-size: 0.68rem;
    font-family: var(--font-mono);
    background: var(--bg-chassis);
    color: var(--text-muted);
    border: 1px solid var(--card-border);
    border-radius: 4px;
    cursor: pointer;
    text-align: center;
    transition: all 0.15s ease;
  }

  .blade-toggle.active {
    background: var(--accent-vis-light);
    color: var(--accent-vis);
    border-color: var(--accent-vis);
    font-weight: 700;
  }

  .blade-toggle:hover:not(.active) {
    background: var(--card-border);
    color: var(--text-main);
  }

  .divider {
    height: 1px;
    background: var(--card-border);
    margin: 2px 0;
  }
</style>
