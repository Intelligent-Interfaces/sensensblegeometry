<script lang="ts">
  /**
   * GNCStudio.svelte
   * The main Geometric Neural Computing Studio.
   * Provides both split-screen and floating-3D layout modes.
   * Connects to the live 3D GeometricNCSystem.
   */
  import GNCModelBuilder from './GNCModelBuilder.svelte';
  import GNCTrainingPanel from './GNCTrainingPanel.svelte';
  import GNCCodeInspector from './GNCCodeInspector.svelte';
  import { domainState } from '../domainState.svelte';

  type Layout = 'split' | 'floating';

  let layout = $state<Layout>('split');
  let showInspector = $state(false);
  let modelLayers = $state<any[]>([]);
  let trainingState = $state<any>({});
  let bindTo3D = $state(false);

  // Reference to the 3D canvas slot (injected from outside)
  let { canvasSlot = null as any } = $props();

  function handleModelChange(layers: any[]) {
    modelLayers = layers;
    // If bound to 3D, notify parent Canvas to update network
    if (bindTo3D) {
      window.dispatchEvent(new CustomEvent('gnc:model-update', { detail: { layers } }));
    }
  }

  function handleTrainingTick(state: any) {
    trainingState = state;
  }

  function toggleBind() {
    bindTo3D = !bindTo3D;
    if (bindTo3D) {
      // Switch to GEOMETRIC_NC if not already there
      domainState.setActiveDomain('GEOMETRIC_NC');
      window.dispatchEvent(new CustomEvent('gnc:model-update', { detail: { layers: modelLayers } }));
    }
    window.dispatchEvent(new CustomEvent('gnc:bind', { detail: { bound: bindTo3D } }));
  }
</script>

<div class="gnc-studio" class:layout-split={layout === 'split'} class:layout-floating={layout === 'floating'}>

  <!-- Studio Toolbar -->
  <div class="studio-toolbar">
    <div class="toolbar-left">
      <span class="studio-brand">Geometric NC Studio</span>
      <span class="studio-badge">Cl(3,0)</span>
    </div>
    <div class="toolbar-center">
      <div class="layout-toggle">
        <button class="layout-btn" class:active={layout === 'split'} onclick={() => layout = 'split'}
          title="Split Screen">Split</button>
        <button class="layout-btn" class:active={layout === 'floating'} onclick={() => layout = 'floating'}
          title="Floating 3D">Floating</button>
      </div>
    </div>
    <div class="toolbar-right">
      <button
        class="bind-btn"
        class:active={bindTo3D}
        onclick={toggleBind}
        title="Bind to 3D Simulation"
      >
        {bindTo3D ? 'Bound to 3D' : 'Bind to 3D'}
      </button>
      <button class="inspect-btn" onclick={() => showInspector = !showInspector}>
        {showInspector ? 'Close Code' : 'Inspect Code'}
      </button>
    </div>
  </div>

  <!-- Main Body -->
  <div class="studio-body">

    <!-- Left Panel: Model Builder + Training -->
    <div class="studio-left">
      <div class="studio-section builder-section">
        <GNCModelBuilder onModelChange={handleModelChange} />
      </div>
      <div class="studio-divider"></div>
      <div class="studio-section training-section">
        <GNCTrainingPanel onTrainingTick={handleTrainingTick} />
      </div>
    </div>

    <!-- Right Panel: 3D Canvas (split mode only) or slot reference -->
    {#if layout === 'split'}
      <div class="studio-right">
        <div class="canvas-header">
          <span class="canvas-header-label">3D Embodied Simulation</span>
          {#if bindTo3D}
            <span class="bound-indicator">Live</span>
          {/if}
        </div>
        <div class="canvas-area">
          {@render canvasSlot?.()}
          {#if !canvasSlot}
            <div class="canvas-placeholder">
              <p>3D Scene</p>
              <span>Bind model and switch to Geometric NC domain to see the live simulation.</span>
            </div>
          {/if}
        </div>
      </div>
    {:else}
      <!-- Floating 3D button -->
      <button class="floating-3d-hint" onclick={() => window.dispatchEvent(new CustomEvent('gnc:open-float-3d'))}>
        Open 3D View
      </button>
    {/if}

  </div>

  <!-- Code Inspector Overlay -->
  {#if showInspector}
    <div class="inspector-overlay">
      <GNCCodeInspector
        layers={modelLayers}
        trainingState={trainingState}
        onClose={() => showInspector = false}
        onExport={(code) => console.log('Exported', code.length, 'chars')}
      />
    </div>
  {/if}
</div>

<style>
  .gnc-studio {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-chassis);
    color: var(--text-main);
    font-family: 'Inter', system-ui, sans-serif;
    position: relative;
    overflow: hidden;
  }

  /* ── Toolbar ── */
  .studio-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 18px;
    border-bottom: 1px solid var(--card-border);
    background: var(--panel-bg);
    flex-shrink: 0;
    gap: 16px;
  }

  .toolbar-left { display: flex; align-items: center; gap: 10px; }
  .studio-brand { font-size: 0.82rem; font-weight: 700; color: var(--text-main); letter-spacing: 0.01em; }
  .studio-badge {
    font-size: 0.6rem;
    font-family: monospace;
    padding: 2px 7px;
    border-radius: 10px;
    background: rgba(139,92,246,0.2);
    border: 1px solid rgba(139,92,246,0.4);
    color: #a78bfa;
  }

  .toolbar-center { display: flex; justify-content: center; flex: 1; }

  .layout-toggle {
    display: flex;
    background: var(--card-border);
    border-radius: 8px;
    padding: 3px;
    gap: 2px;
  }
  .layout-btn {
    padding: 5px 14px;
    border-radius: 6px;
    border: none;
    background: transparent;
    font-size: 0.7rem;
    color: var(--text-muted);
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
  }
  .layout-btn:hover { color: var(--text-main); }
  .layout-btn.active { background: var(--panel-bg); color: var(--text-main); box-shadow: 0 1px 2px rgba(0,0,0,0.1); }

  .toolbar-right { display: flex; align-items: center; gap: 8px; }

  .bind-btn {
    padding: 6px 14px;
    border-radius: 8px;
    border: 1px solid rgba(16,185,129,0.3);
    background: rgba(16,185,129,0.08);
    color: #6ee7b7;
    font-size: 0.7rem;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
  }
  .bind-btn.active {
    background: rgba(16,185,129,0.25);
    border-color: #10b981;
    color: #34d399;
    box-shadow: 0 0 12px rgba(16,185,129,0.2);
  }

  .inspect-btn {
    padding: 6px 14px;
    border-radius: 8px;
    border: 1px solid rgba(79,70,229,0.4);
    background: rgba(79,70,229,0.12);
    color: #a5b4fc;
    font-size: 0.7rem;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
  }
  .inspect-btn:hover { background: rgba(79,70,229,0.25); }

  /* ── Body ── */
  .studio-body {
    display: flex;
    flex: 1;
    overflow: hidden;
    gap: 0;
  }

  /* ── Left Panel ── */
  .studio-left {
    width: 340px;
    min-width: 280px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--card-border);
    overflow: hidden;
    background: var(--panel-bg);
  }

  .studio-section {
    padding: 14px 16px;
    overflow: auto;
  }

  .builder-section { flex: 1.4; overflow: hidden; display: flex; flex-direction: column; }
  .training-section { flex: 1; border-top: 1px solid var(--card-border); }
  .studio-divider { height: 0; }

  /* ── Right Panel (3D Canvas) ── */
  .studio-right {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg-chassis);
  }

  .canvas-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border-bottom: 1px solid var(--card-border);
    flex-shrink: 0;
  }

  .canvas-header-label {
    font-size: 0.67rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted);
    font-weight: 600;
  }

  .bound-indicator {
    font-size: 0.6rem;
    padding: 2px 7px;
    border-radius: 10px;
    background: rgba(16,185,129,0.2);
    border: 1px solid rgba(16,185,129,0.4);
    color: #34d399;
    animation: pulse-live 2s infinite;
  }

  @keyframes pulse-live {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .canvas-area {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  .canvas-placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: var(--text-muted);
  }
  .canvas-placeholder p { font-size: 0.9rem; font-weight: 600; margin: 0; }
  .canvas-placeholder span { font-size: 0.7rem; text-align: center; max-width: 220px; }

  /* ── Floating mode ── */
  .layout-floating .studio-body {
    flex-direction: column;
  }

  .floating-3d-hint {
    margin: 12px;
    padding: 8px 18px;
    border-radius: 8px;
    border: 1px dashed var(--card-border);
    background: transparent;
    color: var(--text-muted);
    font-size: 0.72rem;
    cursor: pointer;
    font-family: inherit;
    align-self: flex-start;
  }

  /* ── Inspector Overlay ── */
  .inspector-overlay {
    position: absolute;
    inset: 52px 0 0 0;
    z-index: 50;
    padding: 12px;
    background: rgba(0,0,0,0.6);
    backdrop-filter: blur(6px);
  }
</style>
