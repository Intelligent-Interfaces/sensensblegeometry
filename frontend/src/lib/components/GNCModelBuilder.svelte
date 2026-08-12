<script lang="ts">
  /**
   * GNCModelBuilder.svelte (Redesigned - Pipeline HUD)
   * A clean, visual node pipeline instead of heavy vertical cards.
   * Utilizes Popovers for configuration progressive disclosure.
   */
  import { onMount } from 'svelte';
  import { GRADE_PHYSICAL_MAP, TASK_TEMPLATES, type TaskTemplate } from '../physics/CliffordPresets';
  import Popover from './ui/Popover.svelte';
  import Tooltip from './ui/Tooltip.svelte';
  import RichText from './ui/RichText.svelte';
  import Katex from './ui/Katex.svelte';
  import { domainState, type DomainType } from '../domainState.svelte';

  interface NetworkLayer {
    id: string;
    type: 'input' | 'clifford_hidden' | 'ltc_recurrent' | 'output';
    label: string;
    nodes: number;
    grades: { scalar: boolean; vector: boolean; bivector: boolean; trivector: boolean };
    tau: number;
    activation: string;
    initialization: string;
    normalization: boolean;
    dropout: number;
  }

  let { onModelChange = (_layers: NetworkLayer[]) => {} } = $props();

  let selectedTask = $state<string>('drone_flocking');
  let activeTemplate = $derived(TASK_TEMPLATES.find(t => t.id === selectedTask) || TASK_TEMPLATES[0]);
  let layers = $state<NetworkLayer[]>([]);
  let popoversOpen = $state<boolean[]>([]);
  let activeStrategy = $state<string>('clifford_gnc');
  let activeSequence = $state<string>('pouring');
  let activeDroneSequence = $state<string>('vortex_escape');

  const TARGET_TO_DOMAIN: Record<string, DomainType> = {
    'DroneSwarm': 'DRONES',
    'WindTurbine': 'WIND_TURBINES',
    'MetaMaterial': 'GEOMETRIC_NC',
    'KukaArm': 'ROBOTICS'
  };

  function applyTaskTemplate(template: TaskTemplate, syncDomain: boolean = true) {
    selectedTask = template.id;
    layers = template.layers.map(l => ({ ...l, id: crypto.randomUUID() }));
    popoversOpen = new Array(layers.length).fill(false);
    if (syncDomain) {
      const targetDomain = TARGET_TO_DOMAIN[template.targetObject];
      if (targetDomain) {
        domainState.setActiveDomain(targetDomain);
      }
    }
    onModelChange(layers);
  }

  onMount(() => {
    if (activeTemplate) {
      applyTaskTemplate(activeTemplate, false);
    }
  });

  function addLayer() {
    const newLayer: NetworkLayer = {
      id: crypto.randomUUID(),
      type: 'clifford_hidden',
      label: 'Clifford Layer',
      nodes: 8,
      grades: { scalar: true, vector: true, bivector: true, trivector: false },
      tau: 1.0,
      activation: 'geometric_sigmoid',
      initialization: 'he_normal',
      normalization: true,
      dropout: 0.1
    };
    // Insert before output
    const outputIdx = layers.length - 1;
    layers.splice(outputIdx, 0, newLayer);
    layers = [...layers];
    popoversOpen = new Array(layers.length).fill(false);
    onModelChange(layers);
  }

  function removeLayer(idx: number) {
    if (layers.length <= 2) return;
    layers.splice(idx, 1);
    layers = [...layers];
    popoversOpen = new Array(layers.length).fill(false);
    onModelChange(layers);
  }

  $effect(() => {
    if (layers.length === 0) {
      applyTaskTemplate(TASK_TEMPLATES[0]);
    }
  });

  function setStrategy(strategy: string) {
    activeStrategy = strategy;
    window.dispatchEvent(new CustomEvent('gnc:strategy-change', { detail: { strategy } }));
  }

  function setSequence(sequence: string) {
    activeSequence = sequence;
    window.dispatchEvent(new CustomEvent('gnc:sequence-change', { detail: { sequence } }));
  }

  function setDroneSequence(sequence: string) {
    activeDroneSequence = sequence;
    window.dispatchEvent(new CustomEvent('gnc:sequence-change', { detail: { sequence } }));
  }
</script>

<div class="model-builder-hud">
  <!-- Article-Style Physical Context Header (Compact Laptop/Desktop Design) -->
  <div class="article-header">
    <div class="task-selector-bar">
      <span class="hud-label">Physical Context:</span>
      <div class="task-pills">
        {#each TASK_TEMPLATES as task}
          <button 
            class="task-pill" 
            class:selected={selectedTask === task.id}
            onclick={() => applyTaskTemplate(task)}
          >
            {task.title}
          </button>
        {/each}
      </div>
    </div>

    <!-- Baseline Strategy Bar -->
    <div class="task-selector-bar" style="margin-top: 10px;">
      <span class="hud-label">Control Strategy:</span>
      <div class="task-pills">
        <button class="task-pill" class:selected={activeStrategy === 'naive_pid'} onclick={() => setStrategy('naive_pid')}>
          Naive PID
        </button>
        <button class="task-pill" class:selected={activeStrategy === 'standard_mlp'} onclick={() => setStrategy('standard_mlp')}>
          Standard MLP
        </button>
        <button class="task-pill" class:selected={activeStrategy === 'clifford_gnc'} onclick={() => setStrategy('clifford_gnc')}>
          Clifford-Liquid GNC
        </button>
      </div>
    </div>

    <!-- Movement Sequence Bar for Drone Swarm Choreography -->
    {#if selectedTask === 'drone_flocking'}
    <div class="task-selector-bar" style="margin-top: 10px;">
      <span class="hud-label">Swarm Choreography:</span>
      <div class="task-pills">
        <button class="task-pill" class:selected={activeDroneSequence === 'vortex_escape'} onclick={() => setDroneSequence('vortex_escape')}>
          Vortex Breakout
        </button>
        <button class="task-pill" class:selected={activeDroneSequence === 'figure_eight'} onclick={() => setDroneSequence('figure_eight')}>
          Figure-8 Loop
        </button>
        <button class="task-pill" class:selected={activeDroneSequence === 'heart_pulse'} onclick={() => setDroneSequence('heart_pulse')}>
          Heart Pulse
        </button>
        <button class="task-pill" class:selected={activeDroneSequence === 'double_helix'} onclick={() => setDroneSequence('double_helix')}>
          Double Helix
        </button>
      </div>
    </div>
    {/if}

    <!-- Movement Sequence Bar for Robotic Manipulators -->
    {#if selectedTask === 'kuka_iiwa_manipulation'}
    <div class="task-selector-bar" style="margin-top: 10px;">
      <span class="hud-label">Movement Sequence:</span>
      <div class="task-pills">
        <button class="task-pill" class:selected={activeSequence === 'pouring'} onclick={() => setSequence('pouring')}>
          Pouring Sequence
        </button>
        <button class="task-pill" class:selected={activeSequence === 'swirl'} onclick={() => setSequence('swirl')}>
          Orbital Swirl
        </button>
        <button class="task-pill" class:selected={activeSequence === 'spiral'} onclick={() => setSequence('spiral')}>
          Spiral Path
        </button>
        <button class="task-pill" class:selected={activeSequence === 'agitation'} onclick={() => setSequence('agitation')}>
          Torsional Agitation
        </button>
      </div>
    </div>
    {/if}

    <div class="article-body-row">
      <div class="article-image-thumb" style="background-image: url('{activeTemplate.imageUrl}')"></div>
      
      <div class="article-text-pane">
        <div class="article-title-block">
          <h2 class="article-title">{activeTemplate.title}</h2>
          <span class="article-subtitle">{activeTemplate.subtitle}</span>
        </div>
        
        <div class="article-story">
          <p><RichText text={activeTemplate.story} /></p>
        </div>

        <div class="article-why-works">
          <span class="highlight">Why it works:</span> 
          <p><RichText text={activeTemplate.whyItWorks} /></p>
        </div>
      </div>
    </div>
  </div>

  <!-- Visual Pipeline -->
  <div class="pipeline-container">
    {#each layers as layer, idx}
      <div class="node-wrapper">
        <Popover bind:isOpen={popoversOpen[idx]} title="Layer Configuration" wide={true}>
          {#snippet trigger()}
            <div class="pipeline-node" class:active={popoversOpen[idx]}>
              <div class="node-icon">
                {#if layer.type === 'input'} 
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                {:else if layer.type === 'output'} 
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                {:else if layer.type === 'ltc_recurrent'} 
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h4l2-9 4 18 2-9h4"></path></svg>
                {:else} 
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                {/if}
              </div>
              <div class="node-info">
                <span class="node-label"><RichText text={layer.label} /></span>
                <span class="node-meta">{layer.nodes} nodes</span>
              </div>
            </div>
          {/snippet}

          <!-- Expansive Model Card Editor -->
          <div class="editor-form wide-card">
            
            <div class="card-section">
              <span class="section-title">Architecture Setup</span>
              <div class="settings-grid">
                <div class="ed-row flex-col">
                  <label for="nodes-{idx}" class="ed-heading">Nodes (Width)</label>
                  <input id="nodes-{idx}" type="number" min="1" max="512" bind:value={layer.nodes} onchange={() => onModelChange(layers)} />
                </div>
                <div class="ed-row flex-col">
                  <label for="act-{idx}" class="ed-heading">Activation</label>
                  <select id="act-{idx}" bind:value={layer.activation} onchange={() => onModelChange(layers)}>
                    <option value="identity">Identity (Linear)</option>
                    <option value="geometric_sigmoid">Geometric Sigmoid</option>
                    <option value="geometric_relu">Geometric ReLU</option>
                    <option value="swish">Swish</option>
                  </select>
                </div>
                <div class="ed-row flex-col">
                  <label for="init-{idx}" class="ed-heading">Initialization</label>
                  <select id="init-{idx}" bind:value={layer.initialization} onchange={() => onModelChange(layers)}>
                    <option value="glorot_uniform">Glorot Uniform</option>
                    <option value="he_normal">He Normal</option>
                    <option value="dirac">Dirac (Identity)</option>
                  </select>
                </div>
                <div class="ed-row flex-col">
                  <label for="drop-{idx}" class="ed-heading">Dropout ({layer.dropout.toFixed(2)})</label>
                  <input id="drop-{idx}" type="range" min="0.0" max="0.5" step="0.05" bind:value={layer.dropout} onchange={() => onModelChange(layers)} />
                </div>
              </div>
            </div>

            <div class="card-section">
              <span class="section-title">Geometric Subspaces (Grades)</span>
              <p class="section-desc">Select which Cl(3,0) multivector grades this layer can actively process.</p>
              <div class="grade-selector">
                {#each Object.entries(GRADE_PHYSICAL_MAP) as [key, g]}
                  <Tooltip text={g.physicalMeaning} position="top">
                    <label class="grade-choice" class:active={(layer.grades as any)[key]} style="--g-color: {g.color}">
                      <input type="checkbox" bind:checked={(layer.grades as any)[key]} onchange={() => onModelChange(layers)} />
                      <span class="gc-sym"><Katex math={g.symbol} /></span>
                    </label>
                  </Tooltip>
                {/each}
              </div>
            </div>

            <div class="card-section flex-row">
              <div class="flex-1">
                <span class="section-title">Regularization</span>
                <label class="toggle-row">
                  <input type="checkbox" bind:checked={layer.normalization} onchange={() => onModelChange(layers)} />
                  <span class="ed-heading">Geometric LayerNorm</span>
                </label>
              </div>
              
              {#if layer.type === 'ltc_recurrent'}
                <div class="flex-1">
                  <span class="section-title">Liquid Dynamics</span>
                  <div class="ed-row flex-col">
                    <span class="ed-heading">Base Time-Constant ($\tau$):</span>
                    <div class="slider-group">
                      <input type="range" min="0.1" max="5.0" step="0.1" bind:value={layer.tau} onchange={() => onModelChange(layers)} />
                      <span class="val-badge">{layer.tau.toFixed(1)}s</span>
                    </div>
                  </div>
                </div>
              {/if}
            </div>
            
            {#if layer.type !== 'input' && layer.type !== 'output'}
              <div class="card-actions">
                <button class="delete-btn" onclick={() => removeLayer(idx)}>Remove Layer</button>
              </div>
            {/if}
          </div>
        </Popover>
      </div>

      {#if idx < layers.length - 1}
        <div class="pipeline-edge">
          <svg width="24" height="2" viewBox="0 0 24 2"><line x1="0" y1="1" x2="24" y2="1" stroke="rgba(16, 185, 129, 0.5)" stroke-width="2" stroke-dasharray="4 2"/></svg>
        </div>
      {/if}
      
      {#if idx === layers.length - 2}
        <button class="add-node-btn" onclick={addLayer} title="Add Hidden Layer">+</button>
        <div class="pipeline-edge">
          <svg width="24" height="2" viewBox="0 0 24 2"><line x1="0" y1="1" x2="24" y2="1" stroke="rgba(16, 185, 129, 0.5)" stroke-width="2" stroke-dasharray="4 2"/></svg>
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .model-builder-hud {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    padding: 24px 16px;
    margin-top: 20px;
    width: 100%;
    max-width: 100vw;
    box-sizing: border-box;
    padding-bottom: 120px; /* Leave space for bottom dock */
  }

  /* ── Article Header (Compact Laptop/Desktop) ── */
  .article-header {
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: var(--panel-bg);
    opacity: 1; /* Completely opaque so 3D background doesn't bleed */
    border-radius: 16px;
    border: 1px solid var(--card-border);
    padding: 16px 20px;
    max-width: 1000px;
    width: 100%;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
    box-sizing: border-box;
  }

  .task-selector-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    border-bottom: 1px solid var(--card-border);
    padding-bottom: 12px;
    flex-wrap: wrap;
    width: 100%;
  }

  .hud-label {
    font-size: 0.7rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 700;
  }

  .task-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .task-pill {
    padding: 5px 12px;
    border-radius: 12px;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    color: var(--text-muted);
    font-size: 0.7rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .task-pill:hover {
    background: var(--card-border);
    color: var(--text-main);
  }
  .task-pill.selected {
    background: rgba(16, 185, 129, 0.15) !important;
    border: 1px solid rgba(16, 185, 129, 0.3) !important;
    color: #10b981 !important;
    font-weight: 700;
    box-shadow: 0 2px 10px rgba(16, 185, 129, 0.1) !important;
  }

  .article-body-row {
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }

  .article-image-thumb {
    width: 160px;
    min-width: 140px;
    height: 120px;
    border-radius: 12px;
    background-size: cover;
    background-position: center;
    border: 1px solid var(--card-border);
    flex-shrink: 0;
  }

  .article-text-pane {
    display: flex;
    flex-direction: column;
    gap: 8px;
    text-align: left;
    flex: 1;
    min-width: 0;
  }

  .article-title-block {
    display: flex;
    align-items: baseline;
    gap: 10px;
    flex-wrap: wrap;
  }

  .article-title {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 800;
    color: var(--text-main);
    letter-spacing: -0.01em;
  }

  .article-subtitle {
    font-size: 0.72rem;
    font-weight: 700;
    color: #10b981;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .article-story p {
    margin: 0;
    font-size: 0.78rem;
    line-height: 1.45;
    color: var(--text-muted);
  }

  .article-why-works {
    background: rgba(16, 185, 129, 0.06);
    border: 1px solid rgba(16, 185, 129, 0.2);
    padding: 10px 14px;
    border-radius: 10px;
  }
  .article-why-works .highlight {
    font-size: 0.65rem;
    font-weight: 800;
    color: #10b981;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: inline-block;
    margin-right: 6px;
  }
  .article-why-works p {
    display: inline;
    margin: 0;
    font-size: 0.75rem;
    line-height: 1.4;
    color: var(--text-main);
  }

  /* ── Visual Pipeline ── */
  .pipeline-container {
    display: inline-flex;
    flex-wrap: nowrap;
    justify-content: center;
    align-items: center;
    gap: 0;
    background: var(--panel-bg);
    opacity: 1;
    padding: 12px 18px;
    border-radius: 20px;
    border: 1px solid var(--card-border);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
    width: fit-content;
    max-width: 100%;
    margin: 0 auto;
    box-sizing: border-box;
    overflow-x: auto;
    transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1), padding 0.3s ease;
    /* Hide scrollbar for cleaner look */
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .pipeline-container::-webkit-scrollbar {
    display: none;
  }

  .node-wrapper {
    display: flex;
    align-items: center;
  }

  .pipeline-node {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 12px;
    transition: all 0.2s;
  }
  .pipeline-node:hover {
    background: var(--card-border);
    border-color: var(--accent-vis);
  }
  .pipeline-node.active {
    background: rgba(16, 185, 129, 0.08);
    border-color: rgba(16, 185, 129, 0.4);
    box-shadow: 0 0 16px rgba(16, 185, 129, 0.12);
  }

  .node-icon { font-size: 1.2rem; }
  .node-info { display: flex; flex-direction: column; text-align: left; }
  .node-label { font-size: 0.75rem; font-weight: 600; color: var(--text-main); white-space: nowrap; }
  .node-sub { font-size: 0.6rem; color: var(--text-muted); font-family: monospace; }

  .pipeline-edge {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    color: rgba(16, 185, 129, 0.5);
    flex-shrink: 0;
  }

  .add-node-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 1px dashed var(--card-border);
    background: transparent;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 1rem;
    margin: 0 4px;
    flex-shrink: 0;
  }
  .add-node-btn:hover {
    border-color: #10b981;
    color: #10b981;
    background: rgba(16, 185, 129, 0.1);
  }

  /* ── Popover Editor ── */
  .editor-form.wide-card {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
  }
  .card-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: rgba(0,0,0,0.15);
    padding: 16px;
    border-radius: 12px;
    border: 1px solid var(--card-border);
  }
  .card-section.flex-row {
    flex-direction: row;
    gap: 24px;
  }
  .flex-1 { flex: 1; display: flex; flex-direction: column; gap: 8px; }
  .section-title {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--accent-vis);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .section-desc {
    font-size: 0.65rem;
    color: var(--text-muted);
    margin: -8px 0 0 0;
  }
  .settings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px 24px;
  }
  .ed-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.68rem;
    color: var(--text-muted);
  }
  .ed-row.flex-col {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  .ed-row input[type="number"], .ed-row select {
    width: 100%;
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    color: var(--text-main);
    border-radius: 6px;
    padding: 6px 8px;
    font-size: 0.7rem;
  }
  
  .ed-heading { font-weight: 600; color: var(--text-main); font-size: 0.7rem; }
  
  .toggle-row {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    background: var(--card-bg);
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid var(--card-border);
  }

  .grade-selector {
    display: flex;
    gap: 6px;
    width: 100%;
  }
  .grade-choice {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 8px 0;
    border-radius: 6px;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    cursor: pointer;
    transition: all 0.15s;
  }
  .grade-choice input { display: none; }
  .grade-choice.active {
    border-color: var(--g-color);
    background: var(--card-border);
  }
  .gc-sym { font-family: monospace; font-size: 0.7rem; font-weight: 700; color: var(--g-color); }

  .slider-group {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
  }
  .slider-group input { flex: 1; accent-color: #10b981; }
  .val-badge { font-family: monospace; font-size: 0.65rem; color: #10b981; }

  .card-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 4px;
  }
  .delete-btn {
    padding: 6px 12px;
    border-radius: 6px;
    border: 1px solid rgba(239, 68, 68, 0.3);
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    font-size: 0.65rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }
  .delete-btn:hover {
    background: rgba(239, 68, 68, 0.2);
  }

  /* ── Responsive Mobile ── */
  @media (max-width: 768px) {
    .article-body-row {
      flex-direction: column;
    }
    .article-image-thumb {
      width: 100%;
      height: 140px;
    }
  }

  @media (max-width: 600px) {
    .task-selector-bar {
      flex-direction: column;
      align-items: flex-start;
    }
    .card-section.flex-row {
      flex-direction: column;
      gap: 16px;
    }
    .node-wrapper {
      flex-shrink: 0;
    }
  }
</style>

