<script lang="ts">
  /**
   * StandardVsGeometric.svelte (Redesigned - Concise Benchmark Modal)
   * A clean, centered modal focusing on high-level equivariance costs,
   * with progressive disclosure for deep-dive tables.
   */
  import Tooltip from './ui/Tooltip.svelte';
  import RichText from './ui/RichText.svelte';
  import Katex from './ui/Katex.svelte';
  import { domainState } from '../domainState.svelte';

  let trackingError = $derived(domainState.liveMetrics ? domainState.liveMetrics.trackingError.toFixed(2) : '0.00');
  let cumulativeDrift = $derived(domainState.liveMetrics ? domainState.liveMetrics.cumulativeDeviation.toFixed(1) : '0.0');
  let responseTime = $derived(domainState.liveMetrics ? (domainState.liveMetrics.responseTime * 1000).toFixed(0) : '0');
  let currentParams = $derived(domainState.liveMetrics ? domainState.liveMetrics.parameterCount : 0);

  let inputDim = $state(3);
  let outputDim = $state(8);
  let rotAugmentationFactor = $state(36);

  let standardParams = $derived(inputDim * outputDim + outputDim);
  let standardEffectiveTrainingSamples = $derived(1000 * rotAugmentationFactor);

  let cliffordParams = $derived(4 + 8);
  let cliffordEffectiveTrainingSamples = $derived(1000);

  let paramEfficiencyGain = $derived(
    ((1 - cliffordParams / Math.max(1, standardParams)) * 100).toFixed(1)
  );
  let computeCostRatio = $derived((rotAugmentationFactor / 1.0).toFixed(1));

  let showDetails = $state(false);
</script>

<div class="benchmark-modal">
  <div class="bm-header">
    <div class="bm-title-group">
      <span class="bm-title">Equivariance Cost Benchmark</span>
      <span class="bm-subtitle"><RichText text="Standard Dense MLP vs. Clifford $Cl(3,0)$ Geometric Layer" /></span>
    </div>
  </div>

  <div class="bm-controls">
    <div class="ctrl-group">
      <label for="bm-input">Input Dim:</label>
      <input id="bm-input" type="number" min="1" max="16" bind:value={inputDim} />
    </div>
    <div class="ctrl-group">
      <label for="bm-out">Output Dim:</label>
      <input id="bm-out" type="number" min="1" max="16" bind:value={outputDim} />
    </div>
    <div class="ctrl-group">
      <label for="bm-aug">SO(3) Augmentations:</label>
      <input id="bm-aug" type="range" min="4" max="72" step="4" bind:value={rotAugmentationFactor} />
      <span class="val">{rotAugmentationFactor}×</span>
    </div>
  </div>

  <!-- High-Level Live Summary -->
  <div class="bm-summary">
    <div class="stat-box">
      <span class="stat-num highlight">{trackingError}m</span>
      <span class="stat-label">Tracking Error</span>
    </div>
    <div class="stat-box">
      <span class="stat-num warn">{cumulativeDrift}m·s</span>
      <span class="stat-label">Cumulative Drift</span>
    </div>
    <div class="stat-box">
      <span class="stat-num exact">{responseTime}ms</span>
      <span class="stat-label">Response Time</span>
    </div>
  </div>

  <div class="card-comparison">
    <div class="comp-card standard">
      <span class="card-tag">Standard MLP</span>
      <div class="c-row"><span>Params:</span> <strong>371</strong></div>
      <div class="c-row"><span>Architecture:</span> <strong>3 &rarr; 16 &rarr; 16 &rarr; 3</strong></div>
    </div>
    <div class="vs-badge">VS</div>
    <div class="comp-card geometric" class:active-card={currentParams === 16}>
      <span class="card-tag">Clifford Layer (Active)</span>
      <div class="c-row"><span>Params:</span> <strong class="highlight">{currentParams}</strong></div>
      <div class="c-row"><span>Architecture:</span> <strong class="highlight">Cl(3,0) &rarr; ODE</strong></div>
    </div>
  </div>

  <!-- Progressive Disclosure for the huge table -->
  <button class="toggle-details-btn" onclick={() => showDetails = !showDetails}>
    {showDetails ? 'Hide Deep Dive Table' : 'View Deep Dive Architecture Table'}
  </button>

  {#if showDetails}
    <div class="details-table-wrapper">
      <table class="bm-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Dense MLP</th>
            <th>Geometric Network</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Equivariance</td>
            <td class="warn">Data augmentation (Approximate)</td>
            <td class="success">Built-in Geometric Product (Exact)</td>
          </tr>
          <tr>
            <td>Topology</td>
            <td>Homogeneous floats</td>
            <td>Grades (Scalar, Vector, Bivector)</td>
          </tr>
          <tr>
            <td>Time Dynamics</td>
            <td>Discrete <Katex math="\Delta t" /></td>
            <td>Liquid ODE (<Katex math="\tau" />)</td>
          </tr>
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .benchmark-modal {
    display: flex;
    flex-direction: column;
    gap: 16px;
    background: var(--panel-bg);
    opacity: 0.95;
    backdrop-filter: blur(24px);
    border-radius: 20px;
    border: 1px solid var(--card-border);
    padding: 24px;
    width: 100%;
    max-width: 600px;
    margin: 40px auto;
    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  }

  .bm-header { text-align: center; }
  .bm-title { font-size: 1rem; font-weight: 700; color: var(--text-main); display: block; margin-bottom: 4px; }
  .bm-subtitle { font-size: 0.7rem; color: var(--text-muted); }

  .bm-controls {
    display: flex;
    justify-content: center;
    gap: 16px;
    background: var(--card-bg);
    padding: 12px;
    border-radius: 12px;
  }
  .ctrl-group { display: flex; align-items: center; gap: 8px; font-size: 0.7rem; color: var(--text-muted); }
  .ctrl-group input[type="number"] { width: 50px; background: transparent; border: 1px solid var(--card-border); color: var(--text-main); padding: 2px 4px; border-radius: 4px; }
  .ctrl-group input[type="range"] { accent-color: #10b981; }
  .val { color: #10b981; font-family: monospace; font-weight: 700; }

  .bm-summary {
    display: flex;
    justify-content: space-between;
    background: rgba(16, 185, 129, 0.05);
    border: 1px solid rgba(16, 185, 129, 0.2);
    border-radius: 12px;
    padding: 16px;
  }
  .stat-box { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; }
  .stat-num { font-size: 1.4rem; font-weight: 800; font-family: monospace; }
  .stat-num.highlight { color: #8b5cf6; }
  .stat-num.exact { color: #10b981; font-size: 1.2rem; }
  .stat-label { font-size: 0.6rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }

  .card-comparison {
    display: flex;
    align-items: stretch;
    gap: 12px;
    position: relative;
  }
  .comp-card {
    flex: 1;
    background: var(--card-bg);
    border-radius: 12px;
    padding: 16px;
    border: 1px solid var(--card-border);
  }
  .comp-card.geometric {
    background: rgba(16, 185, 129, 0.05);
    border-color: rgba(16, 185, 129, 0.3);
  }
  .card-tag { font-size: 0.6rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 12px; letter-spacing: 0.05em; }
  .c-row { display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-main); margin-bottom: 8px; }
  .c-row strong.highlight { color: #10b981; }
  
  .vs-badge {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--card-bg);
    color: var(--text-main);
    font-size: 0.6rem;
    font-weight: 800;
    padding: 6px;
    border-radius: 50%;
    border: 1px solid var(--card-border);
  }

  .toggle-details-btn {
    background: transparent;
    border: 1px dashed var(--card-border);
    color: var(--text-muted);
    padding: 8px;
    border-radius: 8px;
    font-size: 0.7rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  .toggle-details-btn:hover { background: var(--card-border); color: var(--text-main); }

  .details-table-wrapper {
    background: var(--card-bg);
    border-radius: 12px;
    overflow: hidden;
  }
  .bm-table { width: 100%; border-collapse: collapse; font-size: 0.7rem; }
  .bm-table th { background: var(--card-bg); text-align: left; padding: 10px 12px; color: var(--text-muted); font-weight: 600; }
  .bm-table td { padding: 10px 12px; border-top: 1px solid var(--card-border); color: var(--text-main); }
  .warn { color: #f59e0b !important; }
  .success { color: #10b981 !important; }
</style>
