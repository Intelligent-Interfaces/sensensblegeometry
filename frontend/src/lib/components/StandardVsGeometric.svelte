<script lang="ts">
  /**
   * StandardVsGeometric.svelte
   * Equivariance Cost & Parameter Efficiency Benchmark Panel.
   * Compares standard Dense MLPs vs Clifford Cl(3,0) Geometric Networks on 3D tasks.
   */

  let inputDim = $state(3);
  let outputDim = $state(8);
  let rotAugmentationFactor = $state(36); // Rotated copies required for standard MLP

  // Standard MLP Calculations
  let standardParams = $derived(inputDim * outputDim + outputDim);
  let standardEffectiveTrainingSamples = $derived(1000 * rotAugmentationFactor);

  // Clifford Network Calculations (Rotor Sandwich RxR~ using 4 rotor params)
  let cliffordParams = $derived(4 + 8); // 4 rotor params + 8 multivector bias params
  let cliffordEffectiveTrainingSamples = $derived(1000); // 0 augmentation needed

  let paramEfficiencyGain = $derived(
    ((1 - cliffordParams / Math.max(1, standardParams)) * 100).toFixed(1)
  );

  let computeCostRatio = $derived(
    (rotAugmentationFactor / 1.0).toFixed(1)
  );
</script>

<div class="benchmark-panel">
  <div class="bm-header">
    <div class="bm-title-group">
      <span class="bm-title">Equivariance Cost Analysis</span>
      <span class="bm-subtitle">Standard Dense MLP vs. Clifford $\text{"{"}Cl{"}"}(3,0)$ Geometric Layer</span>
    </div>
  </div>

  <!-- Interactive Controls -->
  <div class="bm-controls">
    <div class="ctrl-group">
      <label for="bm-input-dim">Input Dimensions</label>
      <input id="bm-input-dim" type="number" min={1} max={16} bind:value={inputDim} />
    </div>
    <div class="ctrl-group">
      <label for="bm-output-dim">Output Multivector Dim</label>
      <input id="bm-output-dim" type="number" min={1} max={16} bind:value={outputDim} />
    </div>
    <div class="ctrl-group">
      <label for="bm-rot-factor">Rotational Augmentation Factor</label>
      <input id="bm-rot-factor" type="range" min={4} max={72} step={4} bind:value={rotAugmentationFactor} />
      <span class="val">{rotAugmentationFactor}×</span>
    </div>
  </div>

  <!-- Side-by-Side Comparison Cards -->
  <div class="bm-cards-grid">
    <!-- Left: Standard MLP Card -->
    <div class="bm-card standard-card">
      <div class="card-header">
        <span class="badge standard-badge">Standard Approach</span>
        <h3>Dense MLP Layer</h3>
      </div>

      <div class="metric-row">
        <span class="metric-label">Layer Parameters</span>
        <span class="metric-val">{standardParams}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Augmentation Cost</span>
        <span class="metric-val warn">{rotAugmentationFactor}× Dataset Expansion</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Effective Training Passes</span>
        <span class="metric-val">{standardEffectiveTrainingSamples.toLocaleString()} samples</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Rotational Equivariance</span>
        <span class="metric-val approx">Approximate (Learned)</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">State Interpretability</span>
        <span class="metric-val low">Uninterpretable Floats</span>
      </div>
    </div>

    <!-- Right: Clifford Network Card -->
    <div class="bm-card clifford-card">
      <div class="card-header">
        <span class="badge clifford-badge">Geometric Approach</span>
        <h3>Clifford $\text{"{"}Cl{"}"}(3,0)$ Layer</h3>
      </div>

      <div class="metric-row">
        <span class="metric-label">Layer Parameters</span>
        <span class="metric-val highlight">{cliffordParams}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Augmentation Cost</span>
        <span class="metric-val success">0× (Zero Augmentation Needed)</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Effective Training Passes</span>
        <span class="metric-val">{cliffordEffectiveTrainingSamples.toLocaleString()} samples</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Rotational Equivariance</span>
        <span class="metric-val exact">Exact E(3) Equivariant by Construction</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">State Interpretability</span>
        <span class="metric-val high">Grade-Mapped Physical Invariants</span>
      </div>
    </div>
  </div>

  <!-- Summary Banner -->
  <div class="bm-summary-banner">
    <div class="stat-box">
      <span class="stat-num">{paramEfficiencyGain}%</span>
      <span class="stat-label">Parameter Reduction</span>
    </div>
    <div class="stat-box">
      <span class="stat-num">{computeCostRatio}×</span>
      <span class="stat-label">Training Efficiency Advantage</span>
    </div>
    <div class="stat-box">
      <span class="stat-num">E(3)</span>
      <span class="stat-label">Exact Symmetry Group</span>
    </div>
  </div>

  <!-- Detailed Comparison Table -->
  <div class="bm-table-container">
    <table class="bm-table">
      <thead>
        <tr>
          <th>Evaluation Metric</th>
          <th>Standard Dense MLP</th>
          <th>Clifford $\text{"{"}Cl{"}"}(3,0)$ Network</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Equivariance Source</strong></td>
          <td>Data augmentation over SO(3) rotations</td>
          <td>Geometric Product $u \cdot v + u \wedge v$ built into nodes</td>
        </tr>
        <tr>
          <td><strong>FLOP Scaling Advantage</strong></td>
          <td>Standard dense matrix multiplication</td>
          <td>Structured multivector sparsity (64 mults/multivector)</td>
        </tr>
        <tr>
          <td><strong>Physical Grade Structure</strong></td>
          <td>None (homogeneous float vectors)</td>
          <td>Scalars (Energy), Vectors (Velocity), Bivectors (Torque)</td>
        </tr>
        <tr>
          <td><strong>Continuous-Time Coupling</strong></td>
          <td>Fixed discrete step ($\Delta t$)</td>
          <td>Liquid Time-Constant ODE ($\tau(x, I)$)</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<style>
  .benchmark-panel {
    display: flex;
    flex-direction: column;
    gap: 14px;
    background: var(--panel-bg);
    border-radius: 10px;
    border: 1px solid var(--card-border);
    padding: 16px;
  }

  .bm-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .bm-title-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .bm-title {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-main);
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .bm-subtitle {
    font-size: 0.68rem;
    color: var(--text-muted);
  }

  .bm-controls {
    display: flex;
    gap: 16px;
    background: var(--bg-chassis);
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid var(--card-border);
  }

  .ctrl-group {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.68rem;
    color: var(--text-muted);
  }

  .ctrl-group input[type='number'] {
    width: 48px;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid var(--card-border);
    background: var(--panel-bg);
    color: var(--text-main);
    font-family: monospace;
    font-size: 0.7rem;
  }

  .ctrl-group input[type='range'] {
    accent-color: var(--accent-fuse, #8b5cf6);
  }

  .ctrl-group .val {
    font-family: monospace;
    color: var(--accent-fuse, #8b5cf6);
    font-weight: 600;
  }

  .bm-cards-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .bm-card {
    background: var(--bg-chassis);
    border-radius: 8px;
    border: 1px solid var(--card-border);
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .card-header {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 4px;
  }

  .card-header h3 {
    font-size: 0.8rem;
    margin: 0;
    color: var(--text-main);
  }

  .badge {
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 2px 6px;
    border-radius: 4px;
    width: fit-content;
  }

  .standard-badge {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
  }

  .clifford-badge {
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
  }

  .metric-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.68rem;
    padding-bottom: 4px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }

  .metric-label {
    color: var(--text-muted);
  }

  .metric-val {
    font-family: monospace;
    font-weight: 600;
    color: var(--text-main);
  }

  .metric-val.warn { color: #ef4444; }
  .metric-val.success { color: #10b981; }
  .metric-val.approx { color: #f59e0b; }
  .metric-val.exact { color: #10b981; }
  .metric-val.low { color: #94a3b8; }
  .metric-val.high { color: #8b5cf6; }
  .metric-val.highlight { color: #8b5cf6; font-size: 0.8rem; }

  .bm-summary-banner {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    background: rgba(139, 92, 246, 0.08);
    border: 1px solid rgba(139, 92, 246, 0.2);
    border-radius: 8px;
    padding: 10px;
    text-align: center;
  }

  .stat-box {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .stat-num {
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--accent-fuse, #8b5cf6);
    font-family: monospace;
  }

  .stat-label {
    font-size: 0.62rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .bm-table-container {
    overflow-x: auto;
  }

  .bm-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.68rem;
    text-align: left;
  }

  .bm-table th, .bm-table td {
    padding: 8px 10px;
    border-bottom: 1px solid var(--card-border);
  }

  .bm-table th {
    background: var(--bg-chassis);
    color: var(--text-muted);
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.62rem;
    letter-spacing: 0.05em;
  }

  .bm-table td {
    color: var(--text-main);
  }
</style>
