<script lang="ts">
  /**
   * GNCModelBuilder.svelte (Redesigned)
   * Task-Driven, Educational Clifford-Liquid Network Builder.
   * Includes physical intuition badges, task templates, "Why does this work?" math cards,
   * and live Multivector Sandbox Testers.
   */
  import { Multivector } from 'engine';
  import { onMount } from 'svelte';
  import { GRADE_PHYSICAL_MAP, TASK_TEMPLATES, MATH_EXPLANATIONS, type TaskTemplate } from '../physics/CliffordPresets';
  import GNCFlowDiagram from './GNCFlowDiagram.svelte';
  import { domainState, type DomainType } from '../domainState.svelte';

  interface NetworkLayer {
    id: string;
    type: 'input' | 'clifford_hidden' | 'ltc_recurrent' | 'output';
    label: string;
    nodes: number;
    grades: { scalar: boolean; vector: boolean; bivector: boolean; trivector: boolean };
    tau: number;
    activation: string;
  }

  let { onModelChange = (_layers: NetworkLayer[]) => {} } = $props();

  let selectedTask = $state<string>('drone_flocking');
  let layers = $state<NetworkLayer[]>([]);
  let selectedLayerIdx = $state<number | null>(null);
  let showMathHelp = $state(false);

  // Global Multivector Sandbox Tester State
  let testWindX = $state(4.0);
  let testWindY = $state(2.0);
  let testWindZ = $state(0.5);

  // Output multivector computed live in sandbox
  let testOutputVector = $derived.by(() => {
    try {
      const inputMV = Multivector.vector(testWindX, testWindY, testWindZ);
      // Simulate simple rotor transformation (e12 bivector spin)
      const rotor = new Multivector(0.87, 0, 0, 0, 0.5, 0, 0, 0); // ~30 deg rot
      const result = rotor.geometric_product(inputMV);
      return {
        scalar: result.get_scalar().toFixed(2),
        vx: result.get_vector_x().toFixed(2),
        vy: result.get_vector_y().toFixed(2),
        vz: result.get_vector_z().toFixed(2),
        bxy: result.get_bivector_xy().toFixed(2),
        byz: result.get_bivector_yz().toFixed(2),
        bzx: result.get_bivector_zx().toFixed(2),
      };
    } catch (e) {
      return { scalar: '0.00', vx: testWindX.toFixed(2), vy: testWindY.toFixed(2), vz: testWindZ.toFixed(2), bxy: '0.00', byz: '0.00', bzx: '0.00' };
    }
  });

  const TARGET_TO_DOMAIN: Record<string, DomainType> = {
    'DroneSwarm': 'DRONES',
    'WindTurbine': 'WIND_TURBINES',
    'MetaMaterial': 'GEOMETRIC_NC',
    'KukaArm': 'ROBOTICS'
  };

  function applyTaskTemplate(template: TaskTemplate, syncDomain: boolean = true) {
    selectedTask = template.id;
    layers = template.layers.map(l => ({ ...l, id: crypto.randomUUID() }));
    selectedLayerIdx = null;
    if (syncDomain) {
      const targetDomain = TARGET_TO_DOMAIN[template.targetObject];
      if (targetDomain) {
        domainState.setActiveDomain(targetDomain);
      }
    }
    onModelChange(layers);
  }

  onMount(() => {
    const defaultTemplate = TASK_TEMPLATES.find(t => t.id === selectedTask) || TASK_TEMPLATES[0];
    if (defaultTemplate) {
      applyTaskTemplate(defaultTemplate, false);
    }
  });

  function addLayer() {
    const newLayer: NetworkLayer = {
      id: crypto.randomUUID(),
      type: 'clifford_hidden',
      label: 'Clifford Hidden',
      nodes: 8,
      grades: { scalar: true, vector: true, bivector: true, trivector: false },
      tau: 1.0,
      activation: 'geometric_sigmoid'
    };
    const insertAt = selectedLayerIdx !== null ? selectedLayerIdx + 1 : layers.length - 1;
    layers.splice(insertAt, 0, newLayer);
    layers = [...layers];
    selectedLayerIdx = insertAt;
    onModelChange(layers);
  }

  function removeLayer(idx: number) {
    if (layers.length <= 2) return;
    layers.splice(idx, 1);
    layers = [...layers];
    if (selectedLayerIdx !== null && selectedLayerIdx >= layers.length) {
      selectedLayerIdx = layers.length - 1;
    }
    onModelChange(layers);
  }

  function countParams(layer: NetworkLayer): number {
    const grades = [layer.grades.scalar, layer.grades.vector, layer.grades.bivector, layer.grades.trivector];
    const dims = [1, 3, 3, 1];
    const totalDim = grades.reduce((sum, on, i) => sum + (on ? dims[i] : 0), 0);
    return layer.nodes * totalDim * totalDim;
  }

  function totalParams(): number {
    return layers.reduce((sum, l) => sum + countParams(l), 0);
  }

  // Initialize with first task
  $effect(() => {
    if (layers.length === 0) {
      applyTaskTemplate(TASK_TEMPLATES[0]);
    }
  });
</script>

<div class="gnc-builder">
  <!-- Goal-Driven Task Selector -->
  <div class="section-container">
    <div class="section-title">
      <span>Target Physical Task</span>
      <button class="math-help-toggle" onclick={() => showMathHelp = !showMathHelp}>
        {showMathHelp ? 'Hide Math Guide' : 'Why Clifford Nets?'}
      </button>
    </div>

    <div class="task-grid">
      {#each TASK_TEMPLATES as task}
        <button
          type="button"
          class="task-card"
          class:selected={selectedTask === task.id}
          onclick={() => applyTaskTemplate(task)}
        >
          <div class="task-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d={task.icon} />
            </svg>
          </div>
          <div class="task-content">
            <span class="task-title">{task.title}</span>
            <span class="task-sub">{task.subtitle}</span>
          </div>
        </button>
      {/each}
    </div>

    {#if TASK_TEMPLATES.find(t => t.id === selectedTask)}
      {@const activeT = TASK_TEMPLATES.find(t => t.id === selectedTask)!}
      <div class="task-explanation">
        <p class="exp-desc">{activeT.description}</p>
        <p class="exp-why"><strong>Why this works:</strong> {activeT.whyItWorks}</p>
      </div>
    {/if}
  </div>

  <!-- Collapsible Educational Math Cards -->
  {#if showMathHelp}
    <div class="math-guide-panel">
      {#each MATH_EXPLANATIONS as math}
        <div class="math-card">
          <span class="math-card-title">{math.title}</span>
          <p class="math-card-body">{math.content}</p>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Multivector Flow Diagram -->
  <GNCFlowDiagram layers={layers} />

  <!-- Global Multivector Sandbox Tester -->
  <div class="sandbox-box">
    <div class="sandbox-header">
      <span class="sandbox-title">Multivector Transformation Sandbox</span>
      <span class="sandbox-sub">Drag sample wind vector and test transformation live</span>
    </div>

    <div class="sandbox-inputs">
      <div class="slider-row">
        <label for="wind-x">Wind X (e₁):</label>
        <input id="wind-x" type="range" min="-10" max="10" step="0.5" bind:value={testWindX} />
        <span>{testWindX.toFixed(1)}</span>
      </div>
      <div class="slider-row">
        <label for="wind-y">Wind Y (e₂):</label>
        <input id="wind-y" type="range" min="-10" max="10" step="0.5" bind:value={testWindY} />
        <span>{testWindY.toFixed(1)}</span>
      </div>
      <div class="slider-row">
        <label for="wind-z">Wind Z (e₃):</label>
        <input id="wind-z" type="range" min="-10" max="10" step="0.5" bind:value={testWindZ} />
        <span>{testWindZ.toFixed(1)}</span>
      </div>
    </div>

    <div class="sandbox-output">
      <span class="out-label">Output Multivector (Rotor Transformed):</span>
      <div class="out-grid">
        <span class="out-chip scalar">e₀: {testOutputVector.scalar}</span>
        <span class="out-chip vec">Vector: [{testOutputVector.vx}, {testOutputVector.vy}, {testOutputVector.vz}]</span>
        <span class="out-chip biv">Bivector Spin: [{testOutputVector.bxy}, {testOutputVector.byz}, {testOutputVector.bzx}]</span>
      </div>
    </div>
  </div>

  <!-- Layer Stack Builder -->
  <div class="section-container">
    <div class="section-title">
      <span>Layer Configuration</span>
      <span class="params-counter">Total: ~{totalParams().toLocaleString()} Cl(3,0) params</span>
    </div>

    <div class="layer-stack">
      {#each layers as layer, idx}
        <button
          type="button"
          class="layer-card"
          class:selected={selectedLayerIdx === idx}
          onclick={() => selectedLayerIdx = selectedLayerIdx === idx ? null : idx}
        >
          <div class="layer-left">
            <span class="layer-idx">L{idx}</span>
            <div class="layer-info">
              <span class="layer-label">{layer.label}</span>
              <span class="layer-type-tag">{layer.type}</span>
            </div>
          </div>

          <div class="layer-right">
            <span class="node-count">{layer.nodes} nodes</span>
            <span
              class="delete-btn"
              role="button"
              tabindex="0"
              onclick={(e) => { e.stopPropagation(); removeLayer(idx); }}
              onkeydown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); removeLayer(idx); } }}
            >×</span>
          </div>
        </button>

        {#if selectedLayerIdx === idx}
          <div class="layer-editor">
            <div class="ed-row">
              <label for="nodes-layer-{idx}">Nodes:</label>
              <input id="nodes-layer-{idx}" type="number" min="1" max="128" bind:value={layer.nodes}
                onchange={() => { layers = [...layers]; onModelChange(layers); }} />
            </div>

            <!-- Grade Badges Selector -->
            <div class="ed-row flex-col">
              <span class="ed-heading">Multivector Grades & Physical Meanings:</span>
              <div class="grade-selector">
                {#each Object.entries(GRADE_PHYSICAL_MAP) as [key, g]}
                  <label
                    class="grade-choice"
                    class:active={(layer.grades as any)[key]}
                    style="--g-color: {g.color}"
                  >
                    <input
                      type="checkbox"
                      bind:checked={(layer.grades as any)[key]}
                      onchange={() => { layers = [...layers]; onModelChange(layers); }}
                    />
                    <div class="gc-header">
                      <span class="gc-sym">{g.symbol}</span>
                      <span class="gc-meaning">{g.physicalMeaning}</span>
                    </div>
                    <span class="gc-ex">{g.example}</span>
                  </label>
                {/each}
              </div>
            </div>

            {#if layer.type === 'ltc_recurrent'}
              <div class="ed-row">
                <label for="tau-layer-{idx}">Liquid Tau (τ):</label>
                <input id="tau-layer-{idx}" type="range" min="0.1" max="5.0" step="0.05" bind:value={layer.tau}
                  onchange={() => { layers = [...layers]; onModelChange(layers); }} />
                <span>{layer.tau.toFixed(2)}</span>
              </div>
            {/if}
          </div>
        {/if}
      {/each}
    </div>

    <button class="add-btn" onclick={addLayer}>+ Add Custom Clifford Layer</button>
  </div>
</div>

<style>
  .gnc-builder {
    display: flex;
    flex-direction: column;
    gap: 14px;
    height: 100%;
    overflow-y: auto;
    padding-right: 2px;
  }

  .section-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .section-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .math-help-toggle {
    font-size: 0.65rem;
    color: var(--accent-fuse);
    background: transparent;
    border: 1px solid var(--accent-fuse);
    padding: 2px 8px;
    border-radius: 6px;
    cursor: pointer;
  }
  .math-help-toggle:hover { background: var(--bg-chassis); }

  .task-grid {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .task-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    cursor: pointer;
    transition: all 0.15s;
  }
  .task-card:hover { background: var(--panel-bg); }
  .task-card.selected {
    border-color: var(--accent-fuse);
    box-shadow: 0 0 0 1px var(--accent-fuse);
  }

  .task-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: transparent;
    color: var(--accent-fuse);
    flex-shrink: 0;
  }
  .task-card.selected .task-icon {
    color: var(--accent-fuse);
  }
  .task-content { display: flex; flex-direction: column; }
  .task-title { font-size: 0.78rem; font-weight: 600; color: var(--text-main); }
  .task-sub { font-size: 0.62rem; color: var(--text-muted); }

  .task-explanation {
    padding: 8px 12px;
    border-radius: 6px;
    background: var(--bg-chassis);
    border-left: 3px solid var(--accent-fuse);
    font-size: 0.68rem;
    line-height: 1.4;
    color: var(--text-main);
  }
  .exp-desc { margin: 0 0 4px 0; }
  .exp-why { margin: 0; color: var(--accent-fuse); }

  .math-guide-panel {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px;
    background: var(--bg-chassis);
    border-radius: 8px;
    border: 1px solid rgba(124,58,237,0.2);
  }

  .math-card { display: flex; flex-direction: column; gap: 2px; }
  .math-card-title { font-size: 0.7rem; font-weight: 700; color: var(--accent-fuse); }
  .math-card-body { font-size: 0.65rem; color: var(--text-muted); margin: 0; line-height: 1.4; }

  .sandbox-box {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px;
    background: var(--bg-chassis);
    border: 1px solid rgba(56,189,248,0.2);
    border-radius: 8px;
  }

  .sandbox-header { display: flex; flex-direction: column; }
  .sandbox-title { font-size: 0.7rem; font-weight: 700; color: var(--accent-vis); }
  .sandbox-sub { font-size: 0.6rem; color: var(--text-muted); }

  .sandbox-inputs { display: flex; flex-direction: column; gap: 4px; }
  .slider-row { display: flex; align-items: center; gap: 8px; font-size: 0.65rem; color: var(--text-muted); }
  .slider-row label { width: 90px; }
  .slider-row input { flex: 1; accent-color: var(--accent-vis); }
  .slider-row span { width: 35px; font-family: monospace; text-align: right; color: var(--accent-vis); }

  .sandbox-output { display: flex; flex-direction: column; gap: 4px; border-top: 1px solid var(--card-border); padding-top: 6px; }
  .out-label { font-size: 0.62rem; color: var(--text-muted); }
  .out-grid { display: flex; flex-wrap: wrap; gap: 4px; }
  .out-chip { font-size: 0.6rem; font-family: monospace; padding: 2px 6px; border-radius: 4px; background: var(--card-bg); }
  .out-chip.scalar { color: var(--accent-vis); border: 1px solid rgba(56,189,248,0.3); }
  .out-chip.vec { color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
  .out-chip.biv { color: var(--accent-green); border: 1px solid rgba(16,185,129,0.3); }

  .params-counter { font-size: 0.6rem; color: var(--text-muted); font-family: monospace; }
  .layer-stack { display: flex; flex-direction: column; gap: 6px; }
  .layer-card {
    display: flex; justify-content: space-between; align-items: center;
    padding: 8px 12px; border-radius: 6px;
    background: var(--card-bg); border: 1px solid var(--card-border);
    cursor: pointer;
  }
  .layer-card.selected { border-color: var(--accent-fuse); box-shadow: 0 0 0 1px var(--accent-fuse); }
  .layer-left { display: flex; align-items: center; gap: 8px; }
  .layer-idx { font-size: 0.68rem; font-weight: 700; color: var(--accent-fuse); font-family: monospace; }
  .layer-info { display: flex; flex-direction: column; }
  .layer-label { font-size: 0.75rem; font-weight: 600; color: var(--text-main); }
  .layer-type-tag { font-size: 0.6rem; color: var(--text-muted); font-family: monospace; }
  .layer-right { display: flex; align-items: center; gap: 8px; }
  .node-count { font-size: 0.68rem; color: var(--text-muted); font-family: monospace; }

  .delete-btn {
    border: none; background: rgba(239,68,68,0.15); color: #ef4444;
    border-radius: 4px; width: 18px; height: 18px; font-size: 0.8rem;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
  }

  .layer-editor {
    display: flex; flex-direction: column; gap: 8px;
    padding: 10px 12px; background: var(--bg-chassis);
    border-radius: 6px; border: 1px solid rgba(124,58,237,0.2);
  }
  .ed-row { display: flex; align-items: center; gap: 8px; font-size: 0.68rem; color: var(--text-muted); }
  .ed-row.flex-col { flex-direction: column; align-items: flex-start; }
  .ed-row input[type="number"] { width: 60px; background: var(--card-bg); border: 1px solid var(--card-border); color: var(--text-main); border-radius: 4px; padding: 2px 6px; }

  .grade-selector { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; width: 100%; margin-top: 4px; }
  .grade-choice {
    display: flex; flex-direction: column; gap: 2px;
    padding: 6px 8px; border-radius: 6px;
    border: 1px solid var(--card-border); background: var(--card-bg);
    cursor: pointer; transition: all 0.15s;
  }
  .grade-choice input { display: none; }
  .grade-choice.active { border-color: var(--g-color); background: var(--bg-chassis); }
  .gc-header { display: flex; justify-content: space-between; align-items: center; }
  .gc-sym { font-size: 0.65rem; font-weight: 700; color: var(--g-color); font-family: monospace; }
  .gc-meaning { font-size: 0.6rem; color: var(--text-main); font-weight: 600; }
  .gc-ex { font-size: 0.55rem; color: var(--text-muted); }

  .add-btn {
    padding: 6px; border: 1px dashed var(--card-border);
    background: transparent; color: var(--text-muted);
    border-radius: 6px; font-size: 0.7rem; cursor: pointer;
  }
  .add-btn:hover { border-color: var(--accent-fuse); color: var(--accent-fuse); }
</style>
