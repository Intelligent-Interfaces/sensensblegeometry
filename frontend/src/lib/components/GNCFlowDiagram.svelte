<script lang="ts">
  /**
   * GNCFlowDiagram.svelte
   * Visual multivector flow diagram showing how geometric grades
   * transform layer-by-layer through the Clifford-LTC network.
   */
  import { GRADE_PHYSICAL_MAP } from '../physics/CliffordPresets';

  interface NetworkLayer {
    id: string;
    type: string;
    label: string;
    nodes: number;
    grades: { scalar: boolean; vector: boolean; bivector: boolean; trivector: boolean };
    tau: number;
  }

  let { layers = [] as NetworkLayer[] } = $props();

  function activeGrades(layer: NetworkLayer) {
    return Object.entries(layer.grades)
      .filter(([_, active]) => active)
      .map(([key]) => GRADE_PHYSICAL_MAP[key]);
  }

  function totalDim(layer: NetworkLayer): number {
    return activeGrades(layer).reduce((sum, g) => sum + g.dim, 0);
  }
</script>

<div class="flow-diagram">
  <div class="flow-title">Multivector Transformation Flow</div>
  <div class="flow-nodes">
    {#each layers as layer, i}
      <div class="flow-card">
        <div class="flow-card-header">
          <span class="layer-num">L{i}</span>
          <span class="layer-name">{layer.label}</span>
          <span class="layer-dim">{layer.nodes} × {totalDim(layer)}D</span>
        </div>
        <div class="grade-badges">
          {#each activeGrades(layer) as g}
            <div class="grade-badge" style="--badge-color: {g.color}" title={g.physicalMeaning}>
              <span class="g-symbol">{g.symbol}</span>
              <span class="g-meaning">{g.physicalMeaning}</span>
            </div>
          {/each}
        </div>
      </div>

      {#if i < layers.length - 1}
        <div class="flow-arrow">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
          <span class="flow-op">Geometric Product</span>
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .flow-diagram {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: rgba(0,0,0,0.25);
    border-radius: 8px;
    padding: 10px 12px;
    border: 1px solid rgba(255,255,255,0.06);
  }

  .flow-title {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #94a3b8;
  }

  .flow-nodes {
    display: flex;
    align-items: center;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 4px;
  }

  .flow-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 6px;
    padding: 8px 10px;
    min-width: 140px;
    flex-shrink: 0;
  }

  .flow-card-header {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .layer-num {
    font-size: 0.6rem;
    font-weight: 800;
    color: var(--accent-fuse);
    font-family: monospace;
  }

  .layer-name {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-main);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .layer-dim {
    font-size: 0.6rem;
    color: var(--text-muted);
    font-family: monospace;
    margin-left: auto;
  }

  .grade-badges {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .grade-badge {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--panel-bg);
    border-left: 3px solid var(--badge-color);
  }

  .g-symbol {
    font-size: 0.6rem;
    font-family: monospace;
    color: var(--badge-color);
    font-weight: 700;
  }

  .g-meaning {
    font-size: 0.58rem;
    color: var(--text-muted);
  }

  .flow-arrow {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .flow-op {
    font-size: 0.52rem;
    font-family: monospace;
    white-space: nowrap;
    color: var(--text-muted);
  }
</style>
