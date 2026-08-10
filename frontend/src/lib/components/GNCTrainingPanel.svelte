<script lang="ts">
  /**
   * GNCTrainingPanel.svelte
   * Live training/inference controls and loss curve visualization.
   */

  interface TrainingState {
    isRunning: boolean;
    mode: 'training' | 'inference';
    epoch: number;
    loss: number;
    equivError: number;
    strain: number;
    lr: number;
    dtStep: number;
  }

  let { onTrainingTick = (_state: TrainingState) => {} } = $props();

  let isRunning = $state(false);
  let mode = $state<'training' | 'inference'>('training');
  let epoch = $state(0);
  let lr = $state(0.001);
  let dtStep = $state(0.016);

  // Rolling loss history for plotting
  const HISTORY_LEN = 120;
  let lossHistory = $state<number[]>([]);
  let equivHistory = $state<number[]>([]);
  let strainHistory = $state<number[]>([]);

  let intervalId: ReturnType<typeof setInterval> | null = null;
  let canvas: HTMLCanvasElement;

  function simulateLoss(epoch: number): number {
    // Simulated decaying loss curve with noise
    const base = Math.max(0.01, 1.2 * Math.exp(-epoch * 0.04));
    return base + (Math.random() - 0.5) * base * 0.3;
  }

  function simulateEquivError(epoch: number): number {
    return Math.max(0.001, 0.5 * Math.exp(-epoch * 0.06)) + Math.random() * 0.01;
  }

  function tick() {
    epoch++;
    const loss = simulateLoss(epoch);
    const equivError = simulateEquivError(epoch);
    const strain = 0.3 + Math.sin(epoch * 0.1) * 0.1 + Math.random() * 0.05;

    if (lossHistory.length >= HISTORY_LEN) lossHistory.shift();
    if (equivHistory.length >= HISTORY_LEN) equivHistory.shift();
    if (strainHistory.length >= HISTORY_LEN) strainHistory.shift();

    lossHistory = [...lossHistory, loss];
    equivHistory = [...equivHistory, equivError];
    strainHistory = [...strainHistory, strain];

    onTrainingTick({ isRunning, mode, epoch, loss, equivError, strain, lr, dtStep });

    drawChart();
  }

  function drawChart() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const c = ctx;
    const W = canvas.width;
    const H = canvas.height;
    c.clearRect(0, 0, W, H);

    // Background grid
    c.strokeStyle = 'rgba(255,255,255,0.06)';
    c.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (H / 4) * i;
      c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
    }

    function plotLine(data: number[], color: string, maxVal: number) {
      if (data.length < 2) return;
      c.beginPath();
      c.strokeStyle = color;
      c.lineWidth = 1.5;
      data.forEach((v, i) => {
        const x = (i / HISTORY_LEN) * W;
        const y = H - (v / maxVal) * H * 0.9 - 4;
        i === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
      });
      c.stroke();
    }

    plotLine(lossHistory,   '#ef4444', 1.2);
    plotLine(equivHistory,  '#8b5cf6', 0.5);
    plotLine(strainHistory, '#10b981', 1.0);
  }

  function startTraining() {
    if (isRunning) return;
    isRunning = true;
    intervalId = setInterval(tick, 120);
  }

  function pauseTraining() {
    isRunning = false;
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
  }

  function stepOnce() {
    if (!isRunning) tick();
  }

  function resetTraining() {
    pauseTraining();
    epoch = 0;
    lossHistory = [];
    equivHistory = [];
    strainHistory = [];
    drawChart();
  }
</script>

<div class="training-panel">
  <div class="tp-header">
    <span class="tp-title">Training & Inference</span>
    <div class="mode-toggle">
      <button class="mode-btn" class:active={mode === 'training'} onclick={() => mode = 'training'}>Training</button>
      <button class="mode-btn" class:active={mode === 'inference'} onclick={() => mode = 'inference'}>Inference</button>
    </div>
  </div>

  <!-- Loss Chart -->
  <canvas bind:this={canvas} width={320} height={100} class="loss-canvas"></canvas>

  <!-- Controls -->
  <div class="tp-controls">
    <button class="ctrl-icon-btn play" onclick={startTraining} title="Run" disabled={isRunning}>Run</button>
    <button class="ctrl-icon-btn" onclick={pauseTraining} title="Pause" disabled={!isRunning}>Pause</button>
    <button class="ctrl-icon-btn" onclick={stepOnce} title="Step Once">Step</button>
    <button class="ctrl-icon-btn reset" onclick={resetTraining} title="Reset">Reset</button>
    <span class="epoch-count">Epoch: {epoch}</span>
  </div>

  <!-- Hyperparams -->
  <div class="hyper-row">
    <label for="gnc-lr-slider" class="hyper-label">Learning Rate (α)</label>
    <input id="gnc-lr-slider" type="range" class="hyper-slider" min={0.0001} max={0.1} step={0.0001} bind:value={lr} />
    <span class="hyper-val">{lr.toFixed(4)}</span>
  </div>
  <div class="hyper-row">
    <label for="gnc-dt-slider" class="hyper-label">ODE Step (Δt)</label>
    <input id="gnc-dt-slider" type="range" class="hyper-slider" min={0.001} max={0.1} step={0.001} bind:value={dtStep} />
    <span class="hyper-val">{dtStep.toFixed(3)}</span>
  </div>
</div>

<style>
  .training-panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .tp-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .tp-title {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-muted, #94a3b8);
  }

  .mode-toggle {
    display: flex;
    background: var(--card-border);
    border-radius: 6px;
    padding: 2px;
    gap: 2px;
  }

  .mode-btn {
    padding: 4px 10px;
    border-radius: 5px;
    border: none;
    background: transparent;
    font-size: 0.68rem;
    color: var(--text-muted);
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
  }
  .mode-btn.active {
    background: var(--panel-bg);
    color: var(--text-main);
  }

  .loss-canvas {
    width: 100%;
    height: 100px;
    border-radius: 8px;
    background: var(--panel-bg);
    border: 1px solid var(--card-border);
  }

  .tp-controls {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .ctrl-icon-btn {
    padding: 5px 10px;
    border-radius: 6px;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    color: var(--text-main);
    font-size: 0.68rem;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
  }
  .ctrl-icon-btn:hover:not(:disabled) { background: var(--panel-bg); }
  .ctrl-icon-btn:disabled { opacity: 0.35; cursor: default; }
  .ctrl-icon-btn.play { background: rgba(16,185,129,0.15); border-color: var(--accent-green); color: var(--accent-green); }
  .ctrl-icon-btn.play:hover:not(:disabled) { background: rgba(16,185,129,0.3); }
  .ctrl-icon-btn.reset { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); color: #ef4444; }

  .epoch-count {
    font-size: 0.68rem;
    color: var(--text-muted);
    font-family: monospace;
    margin-left: auto;
  }

  .hyper-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .hyper-label {
    font-size: 0.65rem;
    color: var(--text-muted);
    width: 110px;
    flex-shrink: 0;
  }
  .hyper-slider {
    flex: 1;
    accent-color: var(--accent-fuse);
  }
  .hyper-val {
    font-size: 0.65rem;
    color: var(--accent-fuse);
    font-family: monospace;
    width: 50px;
    text-align: right;
    flex-shrink: 0;
  }
</style>
