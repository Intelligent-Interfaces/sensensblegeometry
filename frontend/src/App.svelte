<script lang="ts">
  import { onMount } from 'svelte';
  import Canvas from './lib/Canvas.svelte';
  import Notebook from './lib/Notebook.svelte';
  import katex from 'katex';
  import 'katex/dist/katex.min.css';

  // Active stage tracking
  let activeStage = $state(1);

  const stages = [
    { id: 1, label: 'Geometric Canvas', katex: String.raw`\mathbf{A} = \sum_{k} a_k e_k`, caption: 'Multivectors in Cl(3,0) span scalar, vector, bivector, and trivector grades.' },
    { id: 2, label: 'Analytical Notebook', katex: String.raw`R = e^{-\frac{\theta}{2} B}`, caption: 'Rotors sandwich-multiply vectors to apply GA rotations: RxR̃.' },
    { id: 3, label: 'ML Copilot', katex: String.raw`\hat{y} = f_\theta(\mathbf{X}_{av})`, caption: 'Geometric neural network predicts physical properties from multivector state.' },
  ];

  let mathFooterEl: HTMLElement;

  $effect(() => {
    const stage = stages.find(s => s.id === activeStage);
    if (stage && mathFooterEl) {
      katex.render(stage.katex, mathFooterEl, { throwOnError: false, displayMode: true });
    }
  });

  function switchStage(id: number) {
    activeStage = id;
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

    <nav class="stage-nav">
      {#each stages as stage}
        <button
          class="stage-tab"
          class:active={activeStage === stage.id}
          onclick={() => switchStage(stage.id)}
        >
          <span class="badge">{stage.id}</span>
          {stage.label}
        </button>
      {/each}
    </nav>
  </header>

  <!-- ═══ Workspace ═══ -->
  <div class="workspace">
    <section class="pane canvas-pane" class:hidden={activeStage !== 1}>
      <Canvas />
    </section>

    <section class="pane notebook-pane" class:hidden={activeStage !== 2}>
      <Notebook />
    </section>

    <section class="pane copilot-pane" class:hidden={activeStage !== 3}>
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

  <!-- ═══ KaTeX Math Footer ═══ -->
  <footer class="math-footer">
    <span class="stage-label">
      STAGE {activeStage} · {stages[activeStage - 1].label.toUpperCase()}
    </span>
    <div class="eq-display">
      <div bind:this={mathFooterEl}></div>
    </div>
    <p class="eq-caption">{stages[activeStage - 1].caption}</p>
  </footer>
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

  /* ── Stage Nav ── */
  .stage-nav {
    display: flex;
    gap: 6px;
    background: #f8fafc;
    padding: 4px;
    border-radius: 8px;
    border: 1px solid var(--card-border);
  }

  .stage-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    font-size: 0.72rem;
    font-family: var(--font-mono);
    color: var(--text-muted);
    background: transparent;
    border: 1px solid transparent;
    border-radius: 5px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .stage-tab:hover {
    color: var(--text-main);
    background: #e2e8f0;
  }

  .stage-tab.active {
    color: var(--text-main);
    background: var(--panel-bg);
    border-color: var(--card-border);
    font-weight: 600;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    font-size: 0.65rem;
    background: #e2e8f0;
  }

  .stage-tab.active .badge {
    background: var(--accent-vis);
    color: #fff;
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

  /* ── KaTeX Math Footer ── */
  .math-footer {
    flex-shrink: 0;
    background: var(--panel-bg);
    border-top: 1px solid var(--card-border);
    padding: 14px 32px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.03);
    z-index: 20;
  }

  .stage-label {
    font-size: 0.62rem;
    font-family: var(--font-mono);
    color: var(--accent-vis);
    text-transform: uppercase;
    letter-spacing: 2px;
    font-weight: 800;
  }

  .eq-display {
    background: #f8fafc;
    border-radius: 12px;
    padding: 12px 32px;
    width: 100%;
    max-width: 700px;
    text-align: center;
    box-shadow: inset 0 1px 6px rgba(0, 0, 0, 0.04);
    min-height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .eq-caption {
    font-size: 0.75rem;
    color: var(--text-muted);
    max-width: 600px;
    text-align: center;
    line-height: 1.5;
  }
</style>
