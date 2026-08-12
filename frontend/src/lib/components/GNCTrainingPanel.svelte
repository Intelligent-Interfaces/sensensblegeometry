<script lang="ts">
  /**
   * GNCTrainingPanel.svelte (Redesigned - Collapsible HUD)
   * Floats over the 3D canvas and collapses to save space.
   */
  import { JSMultivector as Multivector } from '../physics/CliffordLiquidNetwork';
  import { CliffordLiquidNetwork } from '../physics/CliffordLiquidNetwork';
  import Tooltip from './ui/Tooltip.svelte';
  import Katex from './ui/Katex.svelte';

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
  let isMinimized = $state(false);
  let mode = $state<'training' | 'inference'>('training');
  let epoch = $state(0);
  let lr = $state(0.01);
  let dtStep = $state(0.016);

  let currentLoss = $state(0);
  let currentVecError = $state(0);
  let currentStrainError = $state(0);

  let network = new CliffordLiquidNetwork(4, 2);
  const sampleInputs = [
    Multivector.vector(4.0, 2.0, 0.5),
    Multivector.vector(1.0, -1.0, 2.0)
  ];
  const targetVector = Multivector.vector(0.0, 1.0, 0.0);

  const HISTORY_LEN = 100;
  let lossHistory = $state<number[]>([]);
  let equivHistory = $state<number[]>([]);
  let strainHistory = $state<number[]>([]);

  let intervalId: ReturnType<typeof setInterval> | null = null;
  let canvas: HTMLCanvasElement;

  function tick() {
    epoch++;
    let loss, equivError, strain;

    if (mode === 'training') {
      const res = network.trainStep(sampleInputs, targetVector, lr, dtStep, 0.1);
      loss = res.loss; equivError = res.vecError; strain = res.strainError;
    } else {
      const res = network.computeLoss(sampleInputs, targetVector, 0.1, dtStep);
      loss = res.loss; equivError = res.vecError; strain = res.strainError;
    }

    currentLoss = loss; currentVecError = equivError; currentStrainError = strain;

    if (lossHistory.length >= HISTORY_LEN) lossHistory.shift();
    if (equivHistory.length >= HISTORY_LEN) equivHistory.shift();
    if (strainHistory.length >= HISTORY_LEN) strainHistory.shift();

    lossHistory = [...lossHistory, loss];
    equivHistory = [...equivHistory, equivError];
    strainHistory = [...strainHistory, strain];

    onTrainingTick({ isRunning, mode, epoch, loss, equivError, strain, lr, dtStep });
    if (!isMinimized) drawChart();
  }

  function drawChart() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const y = (H / 3) * i;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    function plotLine(data: number[], color: string, maxVal: number) {
      if (data.length < 2) return;
      ctx!.beginPath(); ctx!.strokeStyle = color; ctx!.lineWidth = 2;
      data.forEach((v, i) => {
        const x = (i / HISTORY_LEN) * W;
        const y = H - (v / maxVal) * H * 0.9;
        i === 0 ? ctx!.moveTo(x, y) : ctx!.lineTo(x, y);
      });
      ctx!.stroke();
    }

    plotLine(lossHistory, '#ef4444', 1.2);
    plotLine(equivHistory, '#8b5cf6', 0.5);
    plotLine(strainHistory, '#10b981', 1.0);
  }

  function togglePlay() {
    if (isRunning) {
      isRunning = false;
      if (intervalId) clearInterval(intervalId);
      intervalId = null;
    } else {
      isRunning = true;
      intervalId = setInterval(tick, 100);
    }
  }

  function resetTraining() {
    if (isRunning) togglePlay();
    epoch = 0; currentLoss = 0; currentVecError = 0; currentStrainError = 0;
    network = new CliffordLiquidNetwork(4, 2);
    lossHistory = []; equivHistory = []; strainHistory = [];
    if (!isMinimized) drawChart();
  }

  $effect(() => {
    if (!isMinimized && canvas) {
      drawChart();
    }
  });
</script>

<div class="training-hud" class:minimized={isMinimized}>
  <!-- HUD Header & Mini Player -->
  <div class="hud-header">
    <button class="play-btn" onclick={togglePlay} class:active={isRunning}>
      {#if isRunning}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
      {:else}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      {/if}
    </button>
    
    <div class="mini-stats">
      <span class="hud-title">Training {mode === 'training' ? 'SGD' : 'Inference'}</span>
      <span class="hud-epoch">Epoch {epoch} | Loss: {currentLoss.toFixed(3)}</span>
    </div>

    <div class="header-actions">
      <button class="icon-btn" onclick={resetTraining} title="Reset">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline></svg>
      </button>
      <button class="icon-btn" onclick={() => isMinimized = !isMinimized} title="Toggle Size">
        {#if isMinimized}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
        {:else}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
        {/if}
      </button>
    </div>
  </div>

  {#if !isMinimized}
    <div class="hud-body">
      <!-- Key Metrics -->
      <div class="metrics-grid">
        <div class="stat-card">
          <span class="stat-lbl">Total Loss</span>
          <span class="stat-val loss-c">{currentLoss.toFixed(4)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-lbl">Vector Err</span>
          <span class="stat-val eq-c">{currentVecError.toFixed(4)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-lbl">Strain</span>
          <span class="stat-val str-c">{currentStrainError.toFixed(4)}</span>
        </div>
      </div>

      <!-- Chart -->
      <div class="chart-container">
        <div class="chart-legend">
          <span class="leg loss-c">● Loss</span>
          <span class="leg eq-c">● Vector</span>
          <span class="leg str-c">● Strain</span>
        </div>
        <canvas bind:this={canvas} width={300} height={80}></canvas>
      </div>

      <!-- Hyperparameters -->
      <div class="hyper-grid">
        <Tooltip text="Learning Rate" position="top">
          <div class="h-input">
            <span class="h-lbl"><Katex math="\alpha" /></span>
            <input type="number" step="0.001" bind:value={lr} />
          </div>
        </Tooltip>
        <Tooltip text="ODE Timestep" position="top">
          <div class="h-input">
            <span class="h-lbl"><Katex math="\Delta t" /></span>
            <input type="number" step="0.001" bind:value={dtStep} />
          </div>
        </Tooltip>
      </div>
    </div>
  {/if}
</div>

<style>
  .training-hud {
    position: absolute;
    top: 40px;
    right: 24px;
    width: 340px;
    background: var(--panel-bg);
    opacity: 0.95;
    backdrop-filter: blur(16px);
    border: 1px solid var(--accent-vis);
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    overflow: hidden;
    transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .training-hud.minimized {
    width: 240px;
  }

  .hud-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: var(--card-bg);
  }
  
  .play-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: none;
    background: var(--card-bg);
    color: var(--text-main);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
  }
  .play-btn.active {
    background: rgba(16, 185, 129, 0.2);
    color: #10b981;
    box-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
  }

  .mini-stats {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .hud-title { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-main); }
  .hud-epoch { font-size: 0.6rem; color: #10b981; font-family: monospace; font-weight: 600; white-space: nowrap; }

  .header-actions {
    display: flex;
    gap: 4px;
  }
  .icon-btn {
    background: transparent;
    border: 1px solid var(--card-border);
    border-radius: 6px;
    color: var(--text-muted);
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 0.75rem;
  }
  .icon-btn:hover { background: var(--card-border); color: var(--text-main); }

  .hud-body {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
  }
  .stat-card {
    display: flex;
    flex-direction: column;
    background: var(--card-bg);
    padding: 8px;
    border-radius: 8px;
    border: 1px solid var(--card-border);
  }
  .stat-lbl { font-size: 0.55rem; color: var(--text-muted); text-transform: uppercase; }
  .stat-val { font-size: 0.8rem; font-weight: 700; font-family: monospace; }
  .loss-c { color: #ef4444; }
  .eq-c { color: #8b5cf6; }
  .str-c { color: #10b981; }

  .chart-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: var(--card-bg);
    border-radius: 8px;
    padding: 8px;
  }
  .chart-legend {
    display: flex;
    gap: 12px;
    font-size: 0.55rem;
    font-weight: 700;
  }
  canvas {
    width: 100%;
    height: 80px;
  }

  .hyper-grid {
    display: flex;
    gap: 12px;
  }
  .h-input {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--card-bg);
    padding: 4px 8px;
    border-radius: 6px;
    border: 1px solid var(--card-border);
  }
  .h-lbl { font-size: 0.65rem; color: var(--text-muted); font-family: monospace; }
  .h-input input {
    width: 50px;
    background: transparent;
    border: none;
    color: #10b981;
    font-family: monospace;
    font-size: 0.7rem;
    outline: none;
  }
</style>
