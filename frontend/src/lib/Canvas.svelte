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
  import { domainState, DOMAINS, type DomainType } from './domainState.svelte';

  // Blade visibility state from shared store
  let blades = $derived(canvasUI.blades);

  // Models
  import { RobotArm } from './models/RobotArm';
  import { WindTurbine } from './models/WindTurbine';
  import { DroneSystem } from './models/DroneSystem';
  import { CycloSystem } from './models/CycloSystem';
  import { UmbrellaSystem } from './models/UmbrellaSystem';
  import { DNASystem } from './models/DNASystem';
  import { FlowerSystem } from './models/FlowerSystem';

  // Domain state tracking
  let activeSimModel: any = $state();
  let resizeObserver: ResizeObserver;

  // Joint control state
  let jointAngles: number[] = $state([0, 0, 0, 0, 0, 0, 0]);
  let selectedLink: number = $state(-2); // -2 = all, -1 = none, 0 = base, 1+ = links
  let panelOpen: boolean = $state(false);

  // Cyclogenesis control state
  let cycloCategory: number = $state(5);
  let cycloTrack: boolean = $state(false);

  // Flower state
  let flowerWind: number = $state(30);
  let flowerDivergence: number = $state(137.5);

  // DNA state
  let dnaTwist: number = $state(50);
  
  // Turbine state
  let turbineRPM: number = $state(0);
  let turbineExplode: number = $state(0); // 0% = Assembled & Functional, 100% = Exploded View
  
  // Drone state
  let droneThrottle: number = $state(50);

  const PALETTE = [
    { hex: 0xffffff, css: '#ffffff', name: 'Ceramic' },
    { hex: 0xff5e00, css: '#ff5e00', name: 'KUKA' },
    { hex: 0x005b9f, css: '#005b9f', name: 'UR Blue' },
    { hex: 0x1e293b, css: '#1e293b', name: 'Onyx' },
    { hex: 0xc084fc, css: '#c084fc', name: 'Violet' },
    { hex: 0x3b8686, css: '#3b8686', name: 'Aurora' },
    { hex: 0xe07a5f, css: '#e07a5f', name: 'Sunset' },
    { hex: 0xf2cc8f, css: '#f2cc8f', name: 'Gold' },
    { hex: 0x6b8f71, css: '#6b8f71', name: 'Moss' },
    { hex: 0xd4618c, css: '#d4618c', name: 'Rose' },
  ];

  function applyJoints() {
    if (domainState.activeDomain === 'ROBOTICS') {
      activeSimModel?.setJointAngles(jointAngles);
    }
  }

  function swapModel(newType: string) {
    if (!scene) return;
    if (activeSimModel) {
      // Recursively dispose all meshes and materials in the old group
      activeSimModel.group.traverse((child: any) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          const mat = child.material;
          if (Array.isArray(mat)) mat.forEach(m => m.dispose());
          else mat.dispose();
        }
      });
      scene.remove(activeSimModel.group);
    }
    
    if (domainState.activeDomain === 'ROBOTICS') {
      activeSimModel = new RobotArm(newType as any);
    } else if (domainState.activeDomain === 'WIND_TURBINES') {
      activeSimModel = new WindTurbine(newType);
    } else if (domainState.activeDomain === 'DRONES') {
      activeSimModel = new DroneSystem(newType);
    } else if (domainState.activeDomain === 'CYCLOGENESIS') {
      activeSimModel = new CycloSystem(newType);
      activeSimModel.setCategory(cycloCategory);
    } else if (domainState.activeDomain === 'UMBRELLAS') {
      activeSimModel = new UmbrellaSystem(newType);
    } else if (domainState.activeDomain === 'DNA_STRUCTURES') {
      activeSimModel = new DNASystem(newType);
    } else if (domainState.activeDomain === 'FLOWERS') {
      activeSimModel = new FlowerSystem(newType);
    }

    selectedLink = -2; // Reset color selection to "All"
    turbineExplode = 0;
    if (activeSimModel) scene.add(activeSimModel.group);
  }

  onMount(() => {
    init().then(() => {
      simState = new SimulationState();

    // ── Three.js Setup ──
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc); // light chassis

    // Add lighting for standard materials
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

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

    // Initial model load triggered by the reactive $effect below

    // Grid & axes
    const grid = new THREE.GridHelper(10, 10, 0xcbd5e1, 0xe2e8f0);
    grid.position.y = -0.01;
    scene.add(grid);
    scene.add(new THREE.AxesHelper(3));

    // ── Render loop ──
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      // Camera Tracking Logic
      if (domainState.activeDomain === 'CYCLOGENESIS' && cycloTrack && activeSimModel?.group) {
        controls.target.lerp(activeSimModel.group.position, 0.05);
      } else {
        controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.05);
      }
      
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

    resizeObserver = new ResizeObserver(() => {
      if (!canvasElement || !camera || !renderer) return;
      const w = canvasElement.clientWidth;
      const h = canvasElement.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    
    resizeObserver.observe(canvasElement);
    });
  });

  onDestroy(() => {
    cancelAnimationFrame(animationFrameId);
    if (renderer) renderer.dispose();
    if (simState) simState.free();
    if (resizeObserver) resizeObserver.disconnect();
  });

  $effect(() => {
    const handleThemeChange = (e: CustomEvent) => {
      if (!scene) return;
      const isDark = e.detail.isDark;
      const bgColor = isDark ? 0x0f172a : 0xf8fafc;
      scene.background = new THREE.Color(bgColor);
    };
    window.addEventListener('themechanged', handleThemeChange as EventListener);

    // Watch domain changes
    if (activeSimModel?.type !== domainState.activeModelId) {
      swapModel(domainState.activeModelId);
    }

    return () => window.removeEventListener('themechanged', handleThemeChange as EventListener);
  });

  // ── GA Controls (Exported for Notebook) ──
  export const addVectorX = () => { simState?.add_object(Multivector.vector(Math.random() * 1.5 + 0.5, 0, 0)); };
  export const addVectorY = () => { simState?.add_object(Multivector.vector(0, Math.random() * 1.5 + 0.5, 0)); };
  export const addVectorZ = () => { simState?.add_object(Multivector.vector(0, 0, Math.random() * 1.5 + 0.5)); };

  export const addExplicitVector = (x: number, y: number, z: number) => {
    if (simState) simState.add_object(Multivector.vector(x, y, z));
  };

  export const addExplicitMultivector = (s: number, e1: number, e2: number, e3: number, e12: number, e23: number, e31: number, e123: number) => {
    if (simState) simState.add_object(new Multivector(s, e1, e2, e3, e12, e23, e31, e123));
  };
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
  
  <!-- Bottom: Model Switcher -->
  <div class="robot-switcher">
    
    <!-- Domain Selector -->
    <select 
      class="docbar-domain-select" 
      value={domainState.activeDomain} 
      onchange={(e) => domainState.setActiveDomain(e.currentTarget.value as DomainType)}
    >
      {#each Object.entries(DOMAINS) as [key, domain]}
        <option value={key}>{domain.label}</option>
      {/each}
    </select>

    <div class="switcher-divider"></div>

    {#each domainState.currentModels as model}
      <button
        class="robot-pill"
        class:active={domainState.activeModelId === model.id}
        onclick={() => { 
          domainState.setActiveModel(model.id); 
          if (domainState.activeDomain === 'ROBOTICS') { jointAngles = [0,0,0,0,0,0,0]; }
        }}
      >
        <span class="pill-label">{model.name}</span>
        <span class="pill-dof">{model.details}</span>
      </button>
    {/each}

    <div class="switcher-divider"></div>
    
    <button class="robot-pill" class:active={panelOpen} onclick={() => panelOpen = !panelOpen}>
      <span class="pill-label">⚙</span>
      <span class="pill-dof">CTRL</span>
    </button>
  </div>

  <!-- Right: Control Panel (OP-1 Field style) -->
  {#if panelOpen}
    <div class="ctrl-panel">
      <div class="ctrl-header">
        <span class="ctrl-title">Control Panel</span>
        <button class="ctrl-close" onclick={() => panelOpen = false}>✕</button>
      </div>

      {#if domainState.activeDomain === 'ROBOTICS'}
        <!-- Joint Sliders -->
        <div class="ctrl-section">
          <span class="ctrl-section-label">Joint Angles</span>
          {#each jointAngles as angle, i}
            <div class="joint-row">
              <span class="joint-label">J{i + 1}</span>
              <input
                type="range"
                class="joint-slider"
                min={-3.14}
                max={3.14}
                step={0.01}
                bind:value={jointAngles[i]}
                oninput={applyJoints}
              />
              <span class="joint-value">{angle.toFixed(1)}°</span>
            </div>
          {/each}
          <button class="ctrl-btn" onclick={() => { jointAngles = jointAngles.map(() => 0); applyJoints(); }}>
            Reset Joints
          </button>
        </div>

        <!-- Per-Link Color -->
        <div class="ctrl-section">
          <span class="ctrl-section-label">Link Color</span>
          <div class="link-selector">
            <button
              class="link-chip"
              class:active={selectedLink === -2}
              onclick={() => selectedLink = -2}
            >All</button>
            {#each activeSimModel?.getLinkNames?.() ?? [] as name, i}
              <button
                class="link-chip"
                class:active={selectedLink === i}
                onclick={() => selectedLink = i}
              >{name}</button>
            {/each}
          </div>

          <div class="swatch-grid">
            {#each PALETTE as swatch}
              <button
                class="color-swatch"
                style="--swatch-color: {swatch.css}"
                title={swatch.name}
                onclick={() => {
                  if (selectedLink === -2) activeSimModel?.setColor?.(swatch.hex);
                  else if (selectedLink >= 0) activeSimModel?.setLinkColor?.(selectedLink, swatch.hex);
                }}
              ></button>
            {/each}
            <button
              class="color-swatch reset-swatch"
              title="Original"
              onclick={() => {
                if (selectedLink === -2) activeSimModel?.setColor?.(null);
                else if (selectedLink >= 0) activeSimModel?.setLinkColor?.(selectedLink, null);
              }}
            ></button>
          </div>
        </div>
      {:else if domainState.activeDomain === 'WIND_TURBINES'}
        <div class="ctrl-section">
          <span class="ctrl-section-label">Turbine Settings</span>
          <div class="joint-row">
            <span class="joint-label">RPM</span>
            <input 
              type="range" 
              class="joint-slider" 
              min={0} 
              max={30} 
              step={1} 
              bind:value={turbineRPM} 
              oninput={() => activeSimModel?.setRPM?.(turbineRPM)}
            />
            <span class="joint-value">{turbineRPM} rpm</span>
          </div>
          <div class="joint-row" style="margin-top: 10px;">
            <span class="joint-label">View</span>
            <input 
              type="range" 
              class="joint-slider" 
              min={0} 
              max={100} 
              step={1} 
              bind:value={turbineExplode} 
              oninput={() => activeSimModel?.setExplodeFactor?.(turbineExplode / 100)}
            />
            <span class="joint-value">{turbineExplode === 0 ? 'Assembled' : turbineExplode + '%'}</span>
          </div>
          <div style="display: flex; gap: 6px; margin-top: 10px;">
            <button 
              class="ctrl-btn" 
              onclick={() => {
                turbineExplode = 0;
                activeSimModel?.assemble?.();
              }}
            >Assemble</button>
            <button 
              class="ctrl-btn" 
              onclick={() => {
                turbineExplode = 100;
                activeSimModel?.explode?.();
              }}
            >Explode Parts</button>
          </div>
        </div>

        <!-- Part Color Selector for Turbines -->
        <div class="ctrl-section">
          <span class="ctrl-section-label">Part Color</span>
          <div class="link-selector">
            <button
              class="link-chip"
              class:active={selectedLink === -2}
              onclick={() => selectedLink = -2}
            >All</button>
            {#each activeSimModel?.getLinkNames?.() ?? [] as name, i}
              <button
                class="link-chip"
                class:active={selectedLink === i}
                onclick={() => selectedLink = i}
              >{name}</button>
            {/each}
          </div>

          <div class="swatch-grid">
            {#each PALETTE as swatch}
              <button
                class="color-swatch"
                style="--swatch-color: {swatch.css}"
                title={swatch.name}
                onclick={() => {
                  if (selectedLink === -2) activeSimModel?.setColor?.(swatch.hex);
                  else if (selectedLink >= 0) activeSimModel?.setLinkColor?.(selectedLink, swatch.hex);
                }}
              ></button>
            {/each}
            <button
              class="color-swatch reset-swatch"
              title="Original"
              onclick={() => {
                if (selectedLink === -2) activeSimModel?.setColor?.(null);
                else if (selectedLink >= 0) activeSimModel?.setLinkColor?.(selectedLink, null);
              }}
            ></button>
          </div>
        </div>
      {:else if domainState.activeDomain === 'DRONES'}
        <div class="ctrl-section">
          <span class="ctrl-section-label">Drone Telemetry</span>
          <div class="joint-row">
            <span class="joint-label">THR</span>
            <input 
              type="range" 
              class="joint-slider" 
              min={0} 
              max={100} 
              step={1} 
              bind:value={droneThrottle} 
              oninput={() => activeSimModel?.setThrottle?.(droneThrottle)}
            />
            <span class="joint-value">{droneThrottle}%</span>
          </div>
        </div>
      {:else if domainState.activeDomain === 'CYCLOGENESIS'}
        <div class="ctrl-section">
          <span class="ctrl-section-label">Vortex Parameters</span>
          <div class="joint-row">
            <span class="joint-label">CAT</span>
            <input 
              type="range" 
              class="joint-slider" 
              min={1} 
              max={5} 
              step={0.1} 
              bind:value={cycloCategory} 
              oninput={() => activeSimModel?.setCategory?.(cycloCategory)}
            />
            <span class="joint-value">F-{cycloCategory.toFixed(1)}</span>
          </div>
          <div class="joint-row" style="margin-top: 12px;">
            <label class="joint-label" style="width:auto; cursor:pointer;">Track Storm: 
              <input type="checkbox" bind:checked={cycloTrack} style="margin-left: 6px;"/>
            </label>
          </div>
        </div>
      {:else if domainState.activeDomain === 'UMBRELLAS'}
        <div class="ctrl-section">
          <span class="ctrl-section-label">Umbrella Controls</span>
          <div class="joint-row">
            <label class="joint-label" style="width:auto; cursor:pointer;">Canopy Open: 
              <input type="checkbox" checked={true} onchange={(e) => {
                if (activeSimModel) activeSimModel.isOpen = e.currentTarget.checked;
              }} style="margin-left: 6px;"/>
            </label>
          </div>
        </div>
      {:else if domainState.activeDomain === 'DNA_STRUCTURES'}
        <div class="ctrl-section">
          <span class="ctrl-section-label">DNA Parameters</span>
          <div class="joint-row">
            <span class="joint-label">Twist</span>
            <input 
              type="range" 
              class="joint-slider" 
              min={0} 
              max={100} 
              step={1} 
              bind:value={dnaTwist} 
              oninput={() => activeSimModel?.setTwist?.(dnaTwist)}
            />
            <span class="joint-value">{dnaTwist === 50 ? 'Auto' : dnaTwist + '%'}</span>
          </div>
        </div>
      {:else if domainState.activeDomain === 'FLOWERS'}
        <div class="ctrl-section">
          <span class="ctrl-section-label">Botanical Controls</span>
          <div class="joint-row">
            <span class="joint-label">Wind</span>
            <input 
              type="range" 
              class="joint-slider" 
              min={0} 
              max={100} 
              step={1} 
              bind:value={flowerWind} 
              oninput={() => activeSimModel?.setWindSpeed?.(flowerWind)}
            />
            <span class="joint-value">{flowerWind}%</span>
          </div>
          {#if activeSimModel?.type === 'Sunflower'}
          <div class="joint-row" style="margin-top: 12px;">
            <span class="joint-label" style="width: 60px;">Phyllotaxis</span>
            <input 
              type="range" 
              class="joint-slider" 
              min={130} 
              max={145} 
              step={0.1} 
              bind:value={flowerDivergence} 
              oninput={() => activeSimModel?.setDivergence?.(flowerDivergence)}
            />
            <span class="joint-value">{flowerDivergence.toFixed(1)}°</span>
          </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
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

  /* ── Bottom Switcher ── */
  .robot-switcher {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 2px;
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    padding: 4px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
    pointer-events: auto;
    align-items: center;
  }

  .robot-pill {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    padding: 8px 20px;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: rgba(255, 255, 255, 0.55);
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
  }
  .robot-pill:hover {
    color: rgba(255, 255, 255, 0.85);
    background: rgba(255, 255, 255, 0.08);
  }
  .robot-pill.active {
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
  .pill-label { font-size: 0.8rem; font-weight: 600; letter-spacing: 0.03em; }
  .pill-dof { font-size: 0.6rem; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.08em; }

  .switcher-divider {
    width: 1px;
    height: 28px;
    background: rgba(255, 255, 255, 0.15);
    margin: 0 6px;
  }

  /* ── Domain Selector in Docbar ── */
  .docbar-domain-select {
    background: transparent;
    color: #ffffff;
    border: none;
    font-size: 0.8rem;
    font-weight: 700;
    padding: 8px 12px;
    cursor: pointer;
    outline: none;
    font-family: inherit;
    appearance: none;
    background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23ffffff%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
    background-repeat: no-repeat;
    background-position: right 8px center;
    background-size: 8px auto;
    padding-right: 22px;
    margin-right: 2px;
  }
  .docbar-domain-select:hover {
    background-color: rgba(255, 255, 255, 0.08);
    border-radius: 8px;
  }
  .docbar-domain-select option {
    background: #0f172a;
    color: #fff;
  }

  /* ── Right Control Panel (OP-1 Field inspired) ── */
  .ctrl-panel {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 260px;
    max-height: calc(100% - 80px);
    overflow-y: auto;
    background: rgba(15, 23, 42, 0.75);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
    pointer-events: auto;
    font-family: inherit;
    color: rgba(255, 255, 255, 0.8);
  }

  .ctrl-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  .ctrl-title {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.5);
  }
  .ctrl-close {
    appearance: none;
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.4);
    font-size: 13px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
  }
  .ctrl-close:hover { color: #fff; background: rgba(255,255,255,0.08); }

  .ctrl-section {
    margin-bottom: 18px;
  }
  .ctrl-section-label {
    display: block;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.35);
    margin-bottom: 10px;
  }

  /* Joint sliders */
  .joint-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }
  .joint-label {
    font-size: 10px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.5);
    width: 22px;
    text-align: right;
  }
  .joint-slider {
    flex: 1;
    -webkit-appearance: none;
    appearance: none;
    height: 4px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.12);
    outline: none;
    cursor: pointer;
  }
  .joint-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.8);
    border: 2px solid rgba(255, 255, 255, 0.3);
    cursor: grab;
  }
  .joint-value {
    font-size: 9px;
    color: rgba(255, 255, 255, 0.4);
    width: 36px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .ctrl-btn {
    width: 100%;
    padding: 6px 0;
    margin-top: 8px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.6);
    font-size: 10px;
    font-family: inherit;
    letter-spacing: 0.05em;
    cursor: pointer;
    transition: all 0.15s;
  }
  .ctrl-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  /* Link selector chips */
  .link-selector {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 10px;
  }
  .link-chip {
    padding: 3px 8px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    background: transparent;
    color: rgba(255, 255, 255, 0.5);
    font-size: 9px;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;
    text-transform: lowercase;
  }
  .link-chip:hover {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.8);
  }
  .link-chip.active {
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
    border-color: rgba(255, 255, 255, 0.3);
  }

  /* Color swatches */
  .swatch-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 6px;
  }
  .color-swatch {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 6px;
    border: 2px solid rgba(255, 255, 255, 0.15);
    background: var(--swatch-color);
    cursor: pointer;
    transition: all 0.15s ease;
    padding: 0;
  }
  .color-swatch:hover {
    transform: scale(1.15);
    border-color: rgba(255, 255, 255, 0.6);
    box-shadow: 0 0 12px var(--swatch-color);
  }
  .reset-swatch {
    background: conic-gradient(#ff5e00, #c084fc, #005b9f, #1e293b, #ffffff, #ff5e00);
    font-size: 0;
    position: relative;
  }
  .reset-swatch::after {
    content: '↺';
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    color: white;
    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  }
</style>

