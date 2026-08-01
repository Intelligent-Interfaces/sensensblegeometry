<script lang="ts">
  import { onMount } from 'svelte';
  import Canvas from './lib/Canvas.svelte';
  import Notebook from './lib/Notebook.svelte';
  import GuidedTour from './lib/GuidedTour.svelte';
  import { tourState } from './lib/tourState.svelte';

  // Active stage tracking
  let activeStage = $state(1);
  let isDarkMode = $state(false);
  
  let canvasComponent = $state<any>(null);

  const stages = [
    { id: 1, label: 'Geometric Canvas', katex: String.raw`\mathbf{A} = \sum_{k} a_k e_k`, caption: 'Multivectors in Cl(3,0) span scalar, vector, bivector, and trivector grades.' },
    { id: 2, label: 'ML Copilot', katex: String.raw`\hat{y} = f_\theta(\mathbf{X}_{av})`, caption: 'Geometric neural network predicts physical properties from multivector state.' },
  ];

  function switchStage(id: number) {
    activeStage = id;
  }

  function toggleTheme() {
    isDarkMode = !isDarkMode;
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Dispatch an event so Canvas can update ThreeJS background
    window.dispatchEvent(new CustomEvent('themechanged', { detail: { isDark: isDarkMode } }));
  }

  function startBivectorTour() {
    activeStage = 1;
    
    tourState.startTour([
      {
        title: 'The Birth of a Bivector',
        text: 'Welcome to Cl(3,0). Let’s build some geometry from scratch. First, we need an empty canvas.',
        autoAction: () => document.getElementById('clear-btn')?.click()
      },
      {
        title: 'Vector e₁',
        text: 'Let’s spawn a 1D vector along the X axis (e₁). Watch the canvas.',
        autoAction: () => document.getElementById('add-vec-x')?.click()
      },
      {
        title: 'Vector e₂',
        text: 'Now let’s add a second vector along the Y axis (e₂).',
        autoAction: () => document.getElementById('add-vec-y')?.click()
      },
      {
        title: 'Creating the Plane',
        text: 'In Geometric Algebra, we multiply vectors to create higher-dimensional objects. Click the highlighted Wedge button to form an oriented plane!',
        actionRequired: 'wedge_clicked',
        highlightElement: 'btn-wedge'
      },
      {
        title: 'The e₁₂ Bivector',
        text: 'Boom. You just created the e₁₂ bivector. It represents the oriented area swept out by moving e₁ along e₂. It is a fundamental piece of the plane.'
      },
      {
        title: 'Taking the Dual',
        text: 'What if we want the normal vector to this plane? In Cl(3,0), multiplying by the inverse pseudoscalar (-e₁₂₃) flips dimensions. Click Dual!',
        actionRequired: 'dual_clicked',
        highlightElement: 'btn-dual'
      },
      {
        title: 'The Normal Vector',
        text: 'Amazing! The dual of the e₁₂ plane is the e₃ vector (the Z-axis normal). You are now manipulating geometry natively.'
      }
    ]);
  }

  function toggleTour() {
    if (tourState.isActive) {
      tourState.closeTour();
    } else {
      startBivectorTour();
    }
  }
</script>

<div class="layout">
  <!-- ═══ Header / Stage Nav ═══ -->
  <header class="topbar">
    <div class="brand">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="22" height="22">
        <circle cx="12" cy="12" r="9" stroke="var(--accent-vis)"/>
        <line x1="8" y1="8" x2="16" y2="16" stroke="var(--accent-vis)"/>
        <line x1="16" y1="8" x2="8" y2="16" stroke="var(--accent-vis)"/>
      </svg>
      <div>
        <h1>Sensensble Geometry Lab</h1>
        <span class="subtitle">Cl(3,0) Multivector Explorer</span>
      </div>
    </div>

    <div class="header-actions">
      <button class="icon-btn" class:active={tourState.isActive} onclick={toggleTour} title="Toggle Interactive Tour">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
          <path d="M6 12v5c3 3 9 3 12 0v-5"/>
        </svg>
      </button>
      <button class="icon-btn" onclick={toggleTheme} aria-label="Toggle theme" title="Toggle Light/Dark Mode">
        {#if isDarkMode} 
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
        {:else} 
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
        {/if}
      </button>
    </div>
  </header>

  <!-- ═══ Workspace ═══ -->
  <div class="workspace">
    <GuidedTour />
    
    <section class="pane canvas-pane" class:hidden={activeStage !== 1}>
      <Canvas bind:this={canvasComponent} />
    </section>

    <section class="pane copilot-pane" class:hidden={activeStage !== 2}>
      <div class="placeholder-pane">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent-fuse)" stroke-width="1.5">
          <path d="M12 2a10 10 0 1 0 10 10"/>
          <path d="M12 6v6l4 2"/>
          <circle cx="18" cy="6" r="3" fill="var(--accent-fuse)" opacity="0.3"/>
        </svg>
        <p>ML Copilot — coming soon</p>
        <span>Equivariant neural networks for geometric predictions.</span>
      </div>
    </section>
  </div>

  <!-- Bottom Drawer Notebook overlay -->
  <Notebook 
    activeStage={activeStage}
    stages={stages}
    onSwitchStage={switchStage}
    katexEq={stages[activeStage - 1].katex}
    caption={stages[activeStage - 1].caption}
    canvasComponent={canvasComponent}
  />
</div>

<style>
  .layout {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--bg-chassis);
  }

  /* ── Header ── */
  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 24px;
    background: var(--panel-bg);
    border-bottom: 1px solid var(--card-border);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    z-index: 20;
    flex-shrink: 0;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .brand h1 {
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: -0.3px;
    color: var(--text-main);
    margin: 0;
  }

  .brand .subtitle {
    font-size: 0.7rem;
    color: var(--text-muted);
    font-family: var(--font-mono);
  }

  /* ── Header Actions ── */
  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    background: transparent;
    border: 1px solid var(--card-border);
    cursor: pointer;
    transition: all 0.15s ease;
    font-size: 1rem;
    color: var(--text-main);
  }
  .icon-btn:hover { 
    background: var(--card-border); 
    transform: translateY(-1px);
  }
  .icon-btn.active {
    background: var(--accent-vis-light);
    border-color: var(--accent-vis);
  }

  /* ── Workspace ── */
  .workspace {
    flex: 1;
    overflow: hidden;
    position: relative;
  }

  .pane {
    position: absolute;
    inset: 0;
    transition: opacity 0.25s ease;
  }

  .pane.hidden {
    opacity: 0;
    pointer-events: none;
  }

  /* ── Copilot placeholder ── */
  .placeholder-pane {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 12px;
    color: var(--text-muted);
  }

  .placeholder-pane p {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-main);
  }

  .placeholder-pane span {
    font-size: 0.85rem;
    max-width: 300px;
    text-align: center;
  }

  .placeholder-pane span {
    font-size: 0.85rem;
    max-width: 300px;
    text-align: center;
  }
</style>
