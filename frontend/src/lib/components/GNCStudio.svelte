<script lang="ts">
  /**
   * GNCStudio.svelte (Redesigned - Progressive Disclosure & Canvas-First)
   */
  import GNCModelBuilder from './GNCModelBuilder.svelte';
  import GNCTrainingPanel from './GNCTrainingPanel.svelte';
  import GNCCodeInspector from './GNCCodeInspector.svelte';
  import StandardVsGeometric from './StandardVsGeometric.svelte';
  import Docsbar from './ui/Docsbar.svelte';
  import RichText from './ui/RichText.svelte';
  import Katex from './ui/Katex.svelte';
  import { MATH_EXPLANATIONS, GRADE_PHYSICAL_MAP } from '../physics/CliffordPresets';
  import { domainState } from '../domainState.svelte';

  type View = 'none' | 'builder' | 'training' | 'benchmark';

  let activeView = $state<View>('builder');
  let showInspector = $state(false);
  let showDocs = $state(false);
  
  let modelLayers = $state<any[]>([]);
  let trainingState = $state<any>({});
  
  // Binding to 3D canvas is enabled by default in the new spatial UI
  let bindTo3D = $state(true);

  // Reference to the 3D canvas slot (injected from outside)
  let { canvasSlot = null as any } = $props();

  function handleModelChange(layers: any[]) {
    modelLayers = layers;
    if (bindTo3D) {
      window.dispatchEvent(new CustomEvent('gnc:model-update', { detail: { layers } }));
    }
  }

  function handleTrainingTick(state: any) {
    trainingState = state;
  }

  $effect(() => {
    if (bindTo3D) {
      window.dispatchEvent(new CustomEvent('gnc:bind', { detail: { bound: true } }));
    }
  });
</script>

<div class="gnc-studio-spatial">
  <!-- Full-bleed 3D Canvas Background -->
  <div class="canvas-layer">
    {@render canvasSlot?.()}
  </div>

  <!-- Top Glass Bar (Global Status) -->
  <div class="top-hud">
    <div class="hud-left">
      <span class="hud-brand">Geometric NC Studio</span>
      <span class="hud-badge"><Katex math="Cl(3,0)" /> GA</span>
    </div>
    <div class="hud-right">
      <button class="icon-btn" onclick={() => showInspector = true} title="Inspect Code">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>
        </svg>
      </button>
      <button class="icon-btn" onclick={() => showDocs = true} title="Math & Physics Guide">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path>
        </svg>
      </button>
    </div>
  </div>

  <!-- Main Floating Content Area -->
  <div class="floating-content-layer pointer-events-none">
    <div class="pointer-events-auto content-wrapper">
      {#if activeView === 'builder'}
        <GNCModelBuilder onModelChange={handleModelChange} />
      {:else if activeView === 'training'}
        <GNCTrainingPanel onTrainingTick={handleTrainingTick} />
      {:else if activeView === 'benchmark'}
        <StandardVsGeometric />
      {/if}
    </div>
  </div>

  <!-- Bottom Floating Dock -->
  <div class="bottom-dock-container">
    <div class="dock">
      <button class="dock-btn" class:active={activeView === 'none'} onclick={() => activeView = 'none'} title="Hide overlays for 3D Canvas view">
        <span class="dock-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v8M8 12h8"></path></svg></span> 3D Canvas
      </button>
      <button class="dock-btn" class:active={activeView === 'builder'} onclick={() => activeView = activeView === 'builder' ? 'none' : 'builder'}>
        <span class="dock-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg></span> Model Builder
      </button>
      <button class="dock-btn" class:active={activeView === 'training'} onclick={() => activeView = activeView === 'training' ? 'none' : 'training'}>
        <span class="dock-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg></span> Training HUD
      </button>
      <button class="dock-btn" class:active={activeView === 'benchmark'} onclick={() => activeView = activeView === 'benchmark' ? 'none' : 'benchmark'}>
        <span class="dock-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg></span> Benchmark
      </button>
    </div>
  </div>

  <!-- Docsbar Drawer -->
  <Docsbar bind:isOpen={showDocs} title="Geometric Neural Computing Guide">
    <p class="docs-text"><RichText text="Geometric Neural Computing operates natively on Multivectors in $Cl(3,0)$ to preserve 3D physical symmetries." /></p>
    
    <div class="docs-section-title">Clifford Grades & Physics</div>
    {#each Object.entries(GRADE_PHYSICAL_MAP) as [key, g]}
      <div class="info-card">
        <h4 style="color: {g.color}"><Katex math={g.symbol} /> — {g.physicalMeaning}</h4>
        <p><strong>Basis:</strong> <Katex math={g.basis} /></p>
        <p><strong>Example:</strong> {g.example}</p>
      </div>
    {/each}

    <div class="docs-section-title">Theoretical Foundations</div>
    {#each MATH_EXPLANATIONS as math}
      <div class="info-card">
        <h4>{math.title}</h4>
        <p><RichText text={math.content} /></p>
      </div>
    {/each}
  </Docsbar>

  <!-- Code Inspector Modal -->
  {#if showInspector}
    <div class="modal-overlay">
      <div class="modal-content">
        <GNCCodeInspector
          layers={modelLayers}
          trainingState={trainingState}
          onClose={() => showInspector = false}
          onExport={(code: string) => console.log('Exported')}
        />
      </div>
    </div>
  {/if}
</div>

<style>
  .gnc-studio-spatial {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: transparent;
    color: var(--text-main);
  }

  .canvas-layer {
    position: absolute;
    inset: 0;
    z-index: 1;
  }

  .canvas-placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
  }
  .cp-icon { font-size: 3rem; margin-bottom: 10px; opacity: 0.5; }

  /* ── Top HUD ── */
  .top-hud {
    position: absolute;
    top: 16px;
    left: 16px;
    right: 16px;
    z-index: 10;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    pointer-events: none;
  }
  
  .hud-left, .hud-right {
    display: flex;
    align-items: center;
    gap: 12px;
    pointer-events: auto;
    background: var(--panel-bg);
    opacity: 0.95;
    backdrop-filter: blur(12px);
    padding: 8px 16px;
    border-radius: 20px;
    border: 1px solid var(--card-border);
  }

  .hud-brand { font-size: 0.8rem; font-weight: 700; }
  .hud-badge {
    font-size: 0.6rem;
    font-family: monospace;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 12px;
    background: rgba(16, 185, 129, 0.15);
    border: 1px solid rgba(16, 185, 129, 0.3);
    color: #10b981;
  }

  .icon-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s;
    padding: 4px;
  }
  .icon-btn:hover { color: #10b981; }

  /* ── Main Content Area ── */
  .floating-content-layer {
    position: absolute;
    inset: 64px 0 90px 0;
    z-index: 5;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 12px 16px 140px 16px;
    box-sizing: border-box;
  }
  .pointer-events-none { pointer-events: none; }
  .pointer-events-auto { pointer-events: auto; }
  
  .content-wrapper {
    width: 100%;
    max-width: 1100px;
    display: flex;
    justify-content: center;
  }

  /* ── Bottom Dock ── */
  .bottom-dock-container {
    position: absolute;
    bottom: 24px;
    left: 0;
    right: 0;
    z-index: 10;
    display: flex;
    justify-content: center;
    pointer-events: none;
  }
  
  .dock {
    display: flex;
    gap: 8px;
    background: var(--panel-bg);
    opacity: 0.95;
    backdrop-filter: blur(16px);
    padding: 6px;
    border-radius: 24px;
    border: 1px solid var(--card-border);
    pointer-events: auto;
    box-shadow: 0 10px 25px rgba(0,0,0,0.4);
  }

  .dock-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 18px;
    border: none;
    background: transparent;
    color: var(--text-muted);
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .dock-btn:hover {
    color: var(--text-main);
    background: var(--card-bg);
  }
  .dock-btn.active {
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
    box-shadow: 0 2px 10px rgba(16, 185, 129, 0.1);
  }

  /* ── Overlays ── */
  .modal-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.6);
    backdrop-filter: blur(8px);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;
  }
  .modal-content {
    width: 92%;
    max-width: 1100px;
    height: 82vh;
    background: var(--panel-bg);
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid var(--card-border);
    box-shadow: 0 25px 60px rgba(0,0,0,0.4);
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .modal-content:has(.maximized) {
    width: 96vw;
    height: 92vh;
    max-width: none;
    border-radius: 12px;
  }

  /* Docs */
  .docs-text {
    font-size: 0.75rem;
    color: var(--text-muted);
    line-height: 1.5;
  }
  .docs-section-title {
    font-size: 0.65rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #10b981;
    margin-top: 12px;
  }
  .info-card {
    background: var(--card-bg);
    padding: 12px;
    border-radius: 8px;
    border: 1px solid var(--card-border);
  }
  .info-card h4 { margin: 0 0 4px 0; font-size: 0.7rem; color: var(--text-main); }
  .info-card p { margin: 0; font-size: 0.65rem; color: var(--text-muted); }

  /* ── Responsive Mobile ── */
  @media (max-width: 600px) {
    .top-hud {
      flex-direction: column;
      gap: 12px;
    }
    .hud-left, .hud-right {
      width: 100%;
      justify-content: space-between;
      box-sizing: border-box;
    }
    .floating-content-layer {
      inset: 120px 0 80px 0; /* Extra space for wrapped top-hud */
    }
    .dock {
      flex-wrap: wrap;
      justify-content: center;
    }
    .dock-btn {
      padding: 6px 10px;
    }
  }
</style>
