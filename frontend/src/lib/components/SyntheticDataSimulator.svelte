<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { SyntheticDataStream, PRESET_CONFIGS, type PresetScenario, type SyntheticSample } from '../physics/SyntheticDataStream';
  import type { StrategyType } from '../controllers/DroneController';
  import { aeroAudio } from '../physics/AeroAudioSynth';

  let { 
    dataStream = new SyntheticDataStream('DRYDEN_GUST'),
    activeStrategy = 'clifford_gnc' as StrategyType,
    onStrategyChange = (_strat: StrategyType) => {},
    onSampleUpdate = (_sample: SyntheticSample) => {}
  } = $props();

  let isPlaying = $state(false);
  let isLooping = $state(true);
  let isAudioMuted = $state(true);
  let playbackSpeed = $state(1.0);
  let currentPreset = $state<PresetScenario>(dataStream.activePreset);
  let currentSample = $state<SyntheticSample>(dataStream.getSampleAt(0));
  let currentTime = $state(0.0);
  let duration = $derived(dataStream.duration);
  let scopeExpanded = $state(false);

  let canvasElem: HTMLCanvasElement;
  let animId: number;
  let lastTimestamp = performance.now();

  // History buffer for oscilloscope
  const SCOPE_LEN = 120;
  let windSpeedHistory: number[] = [];
  let bivectorHistory: number[] = [];
  let divergenceHistory: number[] = [];

  const presets: { id: PresetScenario; label: string; short: string }[] = [
    { id: 'ERA5_CALM', label: 'ERA5 Quiet', short: 'ERA5' },
    { id: 'DRYDEN_GUST', label: 'Dryden Gust (P-Bif)', short: 'Dryden' },
    { id: 'CYCLONIC_SHEAR', label: 'Cyclonic Storm (D-Bif)', short: 'Cyclonic' },
    { id: 'ALLEY_TORNADO', label: 'Alley Tornado', short: 'Tornado' }
  ];

  const strategies: { id: StrategyType; label: string; params: string }[] = [
    { id: 'clifford_gnc', label: 'Clifford GNC', params: '112p' },
    { id: 'standard_mlp', label: 'Std MLP', params: '1.4k' },
    { id: 'naive_pid', label: 'PID', params: '14p' }
  ];

  function setPreset(p: PresetScenario) {
    currentPreset = p;
    dataStream.setPreset(p);
    currentTime = 0;
    currentSample = dataStream.getSampleAt(0);
    onSampleUpdate(currentSample);
    aeroAudio.playClickSound();
  }

  function togglePlay() {
    isPlaying = !isPlaying;
    if (isPlaying) dataStream.play();
    else dataStream.pause();
    aeroAudio.playClickSound();
  }

  function reset() {
    dataStream.reset();
    currentTime = 0;
    currentSample = dataStream.getSampleAt(0);
    onSampleUpdate(currentSample);
    aeroAudio.playClickSound();
  }

  function toggleLoop() {
    isLooping = !isLooping;
    dataStream.isLooping = isLooping;
    aeroAudio.playClickSound();
  }

  function toggleAudioMute() {
    isAudioMuted = aeroAudio.toggleMute();
    aeroAudio.playClickSound();
  }

  function handleScrub(e: Event) {
    const input = e.target as HTMLInputElement;
    const timeSec = parseFloat(input.value);
    dataStream.seek(timeSec);
    currentTime = timeSec;
    currentSample = dataStream.getSampleAt(timeSec);
    onSampleUpdate(currentSample);
  }

  function selectStrategy(strat: StrategyType) {
    activeStrategy = strat;
    onStrategyChange(strat);
    aeroAudio.playClickSound();
  }

  function drawScope() {
    if (!canvasElem) return;
    const ctx = canvasElem.getContext('2d');
    if (!ctx) return;

    const W = canvasElem.width;
    const H = canvasElem.height;

    ctx.clearRect(0, 0, W, H);

    // Subtle background grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();

    for (let x = 0; x <= W; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }

    // Draw line helper
    function plotWave(data: number[], color: string, scale: number, offset = 0) {
      if (data.length < 2) return;
      ctx!.strokeStyle = color;
      ctx!.lineWidth = 1.6;
      ctx!.beginPath();
      for (let i = 0; i < data.length; i++) {
        const x = (i / (SCOPE_LEN - 1)) * W;
        const val = data[i];
        const y = H / 2 - (val * scale) + offset;
        if (i === 0) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
      }
      ctx!.stroke();
    }

    // 1. Wind speed wave (Cyan)
    plotWave(windSpeedHistory, '#06b6d4', 2.8, 10);
    // 2. Bivector vorticity magnitude wave (Emerald Green)
    plotWave(bivectorHistory, '#10b981', 12.0, 10);
    // 3. Divergence / Storm surge wave (Violet)
    plotWave(divergenceHistory, '#a855f7', 15.0, 10);
  }

  function loop() {
    const now = performance.now();
    const dt = Math.min((now - lastTimestamp) / 1000, 0.1);
    lastTimestamp = now;

    if (isPlaying) {
      currentSample = dataStream.update(dt);
      currentTime = dataStream.currentTime;
      onSampleUpdate(currentSample);

      const speed = currentSample.wind.length();
      const bivec = currentSample.bivectorNorm;
      const div = currentSample.divergence;

      windSpeedHistory.push(speed);
      bivectorHistory.push(bivec);
      divergenceHistory.push(div);

      if (windSpeedHistory.length > SCOPE_LEN) windSpeedHistory.shift();
      if (bivectorHistory.length > SCOPE_LEN) bivectorHistory.shift();
      if (divergenceHistory.length > SCOPE_LEN) divergenceHistory.shift();

      drawScope();

      // Audio sonification update
      aeroAudio.update(speed, bivec, div, currentSample.label);
    }

    animId = requestAnimationFrame(loop);
  }

  onMount(() => {
    dataStream.setPreset(currentPreset);
    dataStream.isLooping = isLooping;
    lastTimestamp = performance.now();
    animId = requestAnimationFrame(loop);
  });

  onDestroy(() => {
    if (animId) cancelAnimationFrame(animId);
  });
</script>

<!-- Status line: tag + bifurcation pill on same row -->
<div class="sim-status-row">
  <span class="sim-tag">SYNTH ATMO</span>
  <div 
    class="status-pill"
    class:normal={currentSample.label === 0}
    class:pbif={currentSample.label === 1}
    class:dbif={currentSample.label === 2}
  >
    <span class="status-dot"></span>
    <span class="status-text">
      {#if currentSample.label === 0}NORMAL{:else if currentSample.label === 1}P-BIF{:else}D-BIF{/if}
    </span>
  </div>
</div>

<!-- Scenario presets: compact single row -->
<div class="preset-row">
  {#each presets as p}
    <button 
      class="preset-chip"
      class:active={currentPreset === p.id}
      onclick={() => setPreset(p.id)}
      title={PRESET_CONFIGS[p.id].description}
    >{p.short}</button>
  {/each}
</div>

<!-- Transport + timeline: compact bar -->
<div class="transport-bar">
  <div class="transport-btns">
    <button class="t-btn" class:active={isPlaying} onclick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
      {#if isPlaying}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
      {:else}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      {/if}
    </button>
    <button class="t-btn" onclick={reset} title="Reset">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><polyline points="3 3 3 8 8 8"></polyline></svg>
    </button>
    <button class="t-btn" class:active={isLooping} onclick={toggleLoop} title="Loop">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>
    </button>
    <button class="t-btn" class:active={!isAudioMuted} onclick={toggleAudioMute} title={isAudioMuted ? 'Unmute Aero Sonification' : 'Mute Aero Sonification'}>
      {#if isAudioMuted}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
      {:else}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
      {/if}
    </button>
  </div>
  <div class="timeline-track">
    {#each PRESET_CONFIGS[currentPreset].events as ev}
      <div 
        class="ev-zone"
        class:ev-pbif={ev.type === 1}
        class:ev-dbif={ev.type === 2}
        style="left: {ev.startFrac * 100}%; width: {(ev.endFrac - ev.startFrac) * 100}%;"
      ></div>
    {/each}
    <div class="tl-progress" style="width: {(currentTime / Math.max(0.1, duration)) * 100}%;"></div>
    <input type="range" class="tl-scrub" min={0} max={duration} step={0.05} value={currentTime} oninput={handleScrub} />
  </div>
  <span class="tl-time">{currentTime.toFixed(1)}s</span>
</div>

<!-- Speed selector row -->
<div class="speed-row">
  {#each [0.5, 1.0, 2.0] as spd}
    <button 
      class="spd-chip" 
      class:active={playbackSpeed === spd} 
      onclick={() => { playbackSpeed = spd; dataStream.playbackSpeed = spd; }}
    >{spd}x</button>
  {/each}
</div>

<!-- Collapsible Oscilloscope -->
<button class="scope-toggle" onclick={() => scopeExpanded = !scopeExpanded}>
  <span>Oscilloscope</span>
  <svg class="chevron" class:open={scopeExpanded} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
</button>
{#if scopeExpanded}
  <div class="scope-wrap">
    <div class="scope-legend">
      <span class="leg cyan">|u| {currentSample.wind.length().toFixed(1)}</span>
      <span class="leg green">||w|| {currentSample.bivectorNorm.toFixed(2)}</span>
      <span class="leg purple">div {currentSample.divergence.toFixed(2)}</span>
    </div>
    <canvas bind:this={canvasElem} width={220} height={48}></canvas>
  </div>
{/if}

<!-- Multivector readout: compact inline -->
<div class="mv-row">
  <span class="mv-item"><span class="mv-g">G0</span> {currentSample.energyScalar.toFixed(1)}</span>
  <span class="mv-item"><span class="mv-g">G1</span> ({currentSample.wind.x.toFixed(1)},{currentSample.wind.y.toFixed(1)},{currentSample.wind.z.toFixed(1)})</span>
  <span class="mv-item"><span class="mv-g">G2</span> {currentSample.bivectorNorm.toFixed(2)}</span>
</div>

<!-- Controller strategy: compact row -->
<div class="strat-row">
  {#each strategies as s}
    <button 
      class="strat-chip"
      class:active={activeStrategy === s.id}
      onclick={() => selectStrategy(s.id)}
    >
      <span class="strat-name">{s.label}</span>
      <span class="strat-p">{s.params}</span>
    </button>
  {/each}
</div>

<style>
  /* ── Status Row ── */
  .sim-status-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
  }

  .sim-tag {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: #38bdf8;
    text-transform: uppercase;
  }

  .status-pill {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 7px;
    border-radius: 10px;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.03em;
  }
  .status-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
  }
  .status-pill.normal {
    background: rgba(16, 185, 129, 0.12);
    border: 1px solid rgba(16, 185, 129, 0.35);
    color: #34d399;
  }
  .status-pill.normal .status-dot {
    background: #10b981;
    box-shadow: 0 0 4px #10b981;
  }
  .status-pill.pbif {
    background: rgba(245, 158, 11, 0.15);
    border: 1px solid rgba(245, 158, 11, 0.4);
    color: #fbbf24;
    animation: pulse 1.5s infinite;
  }
  .status-pill.pbif .status-dot {
    background: #f59e0b;
    box-shadow: 0 0 6px #f59e0b;
  }
  .status-pill.dbif {
    background: rgba(239, 68, 68, 0.18);
    border: 1px solid rgba(239, 68, 68, 0.5);
    color: #f87171;
    animation: alertFlash 0.8s infinite;
  }
  .status-pill.dbif .status-dot {
    background: #ef4444;
    box-shadow: 0 0 6px #ef4444;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  @keyframes alertFlash {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.03); }
  }

  /* ── Preset Row ── */
  .preset-row {
    display: flex;
    gap: 4px;
    margin-bottom: 8px;
  }
  .preset-chip {
    flex: 1;
    padding: 4px 0;
    font-size: 9px;
    font-weight: 600;
    text-align: center;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 5px;
    color: #94a3b8;
    cursor: pointer;
    transition: all 0.15s;
  }
  .preset-chip:hover {
    background: rgba(56, 189, 248, 0.08);
    color: #e2e8f0;
  }
  .preset-chip.active {
    background: rgba(56, 189, 248, 0.18);
    border-color: #38bdf8;
    color: #38bdf8;
  }

  /* ── Transport Bar ── */
  .transport-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }
  .transport-btns {
    display: flex;
    gap: 3px;
    flex-shrink: 0;
  }
  .t-btn {
    width: 22px;
    height: 22px;
    border-radius: 5px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #94a3b8;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.12s;
  }
  .t-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
  }
  .t-btn.active {
    background: rgba(56, 189, 248, 0.2);
    border-color: rgba(56, 189, 248, 0.5);
    color: #38bdf8;
  }

  .timeline-track {
    position: relative;
    flex: 1;
    height: 14px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    overflow: hidden;
  }
  .ev-zone {
    position: absolute;
    top: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 1;
  }
  .ev-zone.ev-pbif {
    background: rgba(245, 158, 11, 0.2);
    border-left: 1px solid rgba(245, 158, 11, 0.5);
    border-right: 1px solid rgba(245, 158, 11, 0.5);
  }
  .ev-zone.ev-dbif {
    background: rgba(239, 68, 68, 0.2);
    border-left: 1px solid rgba(239, 68, 68, 0.5);
    border-right: 1px solid rgba(239, 68, 68, 0.5);
  }
  .tl-progress {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    background: rgba(56, 189, 248, 0.2);
    pointer-events: none;
    z-index: 2;
  }
  .tl-scrub {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
    z-index: 3;
    margin: 0;
  }

  .tl-time {
    font-size: 9px;
    font-family: monospace;
    font-weight: 700;
    color: #38bdf8;
    flex-shrink: 0;
    min-width: 28px;
    text-align: right;
  }

  /* ── Speed Row ── */
  .speed-row {
    display: flex;
    gap: 3px;
    margin-bottom: 8px;
  }
  .spd-chip {
    padding: 2px 8px;
    font-size: 9px;
    font-weight: 700;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 4px;
    color: #64748b;
    cursor: pointer;
    transition: all 0.12s;
  }
  .spd-chip.active {
    background: rgba(56, 189, 248, 0.15);
    border-color: rgba(56, 189, 248, 0.4);
    color: #38bdf8;
  }

  /* ── Scope Toggle ── */
  .scope-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 5px 0;
    background: none;
    border: none;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    color: #64748b;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    transition: color 0.12s;
  }
  .scope-toggle:hover {
    color: #94a3b8;
  }
  .chevron {
    transition: transform 0.2s ease;
  }
  .chevron.open {
    transform: rotate(180deg);
  }

  /* ── Scope ── */
  .scope-wrap {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 6px;
    padding: 6px;
    margin-bottom: 6px;
  }
  .scope-legend {
    display: flex;
    gap: 6px;
    margin-bottom: 4px;
  }
  .leg {
    font-size: 8px;
    font-weight: 700;
    font-family: monospace;
  }
  .leg.cyan { color: #06b6d4; }
  .leg.green { color: #10b981; }
  .leg.purple { color: #a855f7; }

  canvas {
    width: 100%;
    height: 48px;
    display: block;
  }

  /* ── Multivector Row ── */
  .mv-row {
    display: flex;
    gap: 4px;
    margin-bottom: 8px;
    flex-wrap: wrap;
  }
  .mv-item {
    font-size: 9px;
    font-family: monospace;
    color: #94a3b8;
    background: rgba(0, 0, 0, 0.2);
    padding: 2px 5px;
    border-radius: 3px;
    border: 1px solid rgba(255, 255, 255, 0.04);
    white-space: nowrap;
  }
  .mv-g {
    color: #64748b;
    font-weight: 700;
    margin-right: 2px;
  }

  /* ── Strategy Row ── */
  .strat-row {
    display: flex;
    gap: 4px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding-top: 8px;
  }
  .strat-chip {
    flex: 1;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 5px;
    padding: 5px 4px;
    text-align: center;
    cursor: pointer;
    transition: all 0.12s;
  }
  .strat-chip:hover {
    background: rgba(255, 255, 255, 0.06);
  }
  .strat-chip.active {
    background: rgba(16, 185, 129, 0.12);
    border-color: rgba(16, 185, 129, 0.5);
  }
  .strat-name {
    display: block;
    font-size: 9px;
    font-weight: 700;
    color: #e2e8f0;
  }
  .strat-chip.active .strat-name {
    color: #10b981;
  }
  .strat-p {
    display: block;
    font-size: 8px;
    color: #64748b;
    margin-top: 1px;
  }
</style>
