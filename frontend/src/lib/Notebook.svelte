<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { basicSetup } from 'codemirror';
  import { EditorView } from '@codemirror/view';
  import { EditorState, Compartment } from '@codemirror/state';
  import { python } from '@codemirror/lang-python';
  import { StreamLanguage } from '@codemirror/language';
  import { r } from '@codemirror/legacy-modes/mode/r';
  import { oneDark } from '@codemirror/theme-one-dark';
  import katex from 'katex';
  import 'katex/dist/katex.min.css';
  import { tourState } from './tourState.svelte';
  import { canvasUI } from './canvasState.svelte';

  let { activeStage = 1, stages = [], onSwitchStage = () => {}, katexEq = '', caption = '', canvasComponent = null, isDarkMode = false } = $props();

  const bladeLabels = [
    { key: 'e1', label: 'e₁' },
    { key: 'e2', label: 'e₂' },
    { key: 'e3', label: 'e₃' },
    { key: 'e12', label: 'e₁₂' },
    { key: 'e23', label: 'e₂₃' },
    { key: 'e31', label: 'e₃₁' },
    { key: 'e123', label: 'e₁₂₃' },
  ];

  function toggleBlade(key: string) {
    canvasUI.blades[key as keyof typeof canvasUI.blades] = !canvasUI.blades[key as keyof typeof canvasUI.blades];
  }

  let editorElement: HTMLDivElement;
  let mathFooterEl = $state<HTMLDivElement>();
  let view: EditorView;
  let isGenerating = $state(false);
  let isOpen = $state(false); // Default to closed so you just see the math footer
  let showMath = $state(true);
  
  let drawerHeight = $state(45);
  let isDragging = $state(false);
  let hasDragged = false;

  function startDrag(e: MouseEvent) {
    isDragging = true;
    hasDragged = false;
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
    if (!isOpen) isOpen = true;
    e.stopPropagation();
  }

  function onDrag(e: MouseEvent) {
    if (!isDragging) return;
    hasDragged = true;
    let newHeight = ((window.innerHeight - e.clientY) / window.innerHeight) * 100;
    if (newHeight < 20) newHeight = 20;
    if (newHeight > 85) newHeight = 85;
    drawerHeight = newHeight;
  }

  function stopDrag() {
    isDragging = false;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
    // Reset hasDragged after a tiny delay so the click handler can still read it
    setTimeout(() => { hasDragged = false; }, 50);
  }

  function toggleDrawer() {
    if (!hasDragged) {
      isOpen = !isOpen;
    }
  }
  
  let languageConf = new Compartment();
  let themeConf = new Compartment();
  let currentLang = $state<'r' | 'python'>('r');

  let codeGA = `# Example 01: GA Basics\n# Define two vectors in Cl(3,0)\nv1 <- 5 * e1\nv2 <- 3 * e2\n\n# Compute their Wedge Product (Bivector)\nB <- v1 %^% v2`;
  let codeED = `# Example 02: Electrodynamics\n# Electromagnetic field F = E + I*B\nE <- 3 * e1 + 1 * e2\nB <- 2 * e2 - 4 * e3`;
  let codeOE = `# Example 03: Optoelectronics\n# Polarization state\nE_x <- 2 * e1\nE_y <- 2 * e2\nphase <- E_x %^% E_y`;

  let codePythonGA = `# Example 01: GA Basics (Python)\nimport versor as vr\n\n# Define two vectors in Cl(3,0)\nv1 = 5 * vr.e1\nv2 = 3 * vr.e2\n\n# Compute their Wedge Product (Bivector)\nB = v1 ^ v2`;
  let codePythonED = `# Example 02: Electrodynamics (Python)\nimport versor as vr\n\n# Electromagnetic field F = E + I*B\nE = 3 * vr.e1 + 1 * vr.e2\nB = 2 * vr.e2 - 4 * vr.e3`;
  let codePythonOE = `# Example 03: Optoelectronics (Python)\nimport versor as vr\n\n# Polarization state\nE_x = 2 * vr.e1\nE_y = 2 * vr.e2\nphase = E_x ^ E_y`;

  let currentExample = $state('01');
  let codeR = $state(codeGA);
  let codePython = $state(codePythonGA);

  let currentCode = $derived(currentLang === 'r' ? codeR : codePython);

  function loadExample(ex: string) {
    currentExample = ex;
    if (ex === '01') { codeR = codeGA; codePython = codePythonGA; }
    if (ex === '02') { codeR = codeED; codePython = codePythonED; }
    if (ex === '03') { codeR = codeOE; codePython = codePythonOE; }
    if (view) {
      const newCode = currentLang === 'r' ? codeR : codePython;
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: newCode } });
    }
  }

  $effect(() => {
    if (showMath && katexEq && mathFooterEl) {
      katex.render(katexEq, mathFooterEl, { throwOnError: false, displayMode: true });
    }
  });

  $effect(() => {
    if (isOpen) {
      tourState.reportAction('console_opened');
    }
  });

  $effect(() => {
    if (view) {
      view.dispatch({
        effects: themeConf.reconfigure(isDarkMode ? oneDark : [])
      });
    }
  });

  const setLanguage = (lang: 'r' | 'python') => {
    if (!view) return;
    currentLang = lang;
    
    const newCode = lang === 'r' ? codeR : codePython;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: newCode },
      effects: languageConf.reconfigure(lang === 'r' ? StreamLanguage.define(r) : python())
    });
  };

  const runCode = () => {
    isGenerating = true;
    try {
      if (canvasComponent) {
        canvasComponent.clearCanvas();
        const code = view.state.doc.toString();
        const lines = code.split('\n');
        
        lines.forEach(line => {
          const isAssignment = line.includes('<-') || line.includes('=');
          if (isAssignment) {
             let x=0, y=0, z=0;
             const terms = line.match(/[-+]?\s*[0-9.]*\s*\*?\s*(?:vr\.)?e[123]/g);
             if (terms) {
               terms.forEach(term => {
                  let str = term.replace(/\s/g, '').replace('*', '').replace('vr.', '');
                  let val = parseFloat(str);
                  if (isNaN(val)) val = str.startsWith('-') ? -1 : 1;
                  
                  if (term.includes('e1')) x += val;
                  if (term.includes('e2')) y += val;
                  if (term.includes('e3')) z += val;
               });
               if (x !== 0 || y !== 0 || z !== 0) {
                 canvasComponent.addExplicitVector(x, y, z);
               }
             }
             
             // Detect wedge product
             if (line.includes('%^%') || line.includes('^')) {
               canvasComponent.computeProduct('wedge');
             }
          }
        });
      }
    } catch (e) {
      console.error("Parse error:", e);
    } finally {
      setTimeout(() => isGenerating = false, 300);
    }
  };

  onMount(() => {
    let startState = EditorState.create({
      doc: currentCode,
      extensions: [
        basicSetup,
        languageConf.of(StreamLanguage.define(r)),
        themeConf.of(isDarkMode ? oneDark : []),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const txt = update.state.doc.toString();
            if (currentLang === 'r') codeR = txt;
            else codePython = txt;
          }
        })
      ]
    });

    view = new EditorView({
      state: startState,
      parent: editorElement
    });
  });

  onDestroy(() => {
    if (view) view.destroy();
  });
</script>

<div class="bottom-drawer" class:collapsed={!isOpen}>
  <!-- Math Readout / Drawer Handle -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div id="math-header" class="math-header" class:pulsing={tourState.currentStep?.highlightElement === 'math-header'} onclick={toggleDrawer}>
    <div class="drag-handle-zone" onmousedown={startDrag}>
      <div class="drag-handle"></div>
    </div>
    <div class="header-top">
      <nav class="stage-nav" onclick={(e) => e.stopPropagation()}>
        {#each stages as stage}
          <button
            class="stage-tab"
            class:active={activeStage === stage.id}
            onclick={(e) => { e.stopPropagation(); onSwitchStage(stage.id); }}
          >
            <span class="badge">{stage.id}</span>
            {stage.label}
          </button>
        {/each}
      </nav>
      
      <div class="header-right" onclick={(e) => e.stopPropagation()}>
        <button class="icon-btn" class:active={showMath} onclick={() => showMath = !showMath} title="Toggle Math View">
          {#if showMath}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          {:else}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
          {/if}
        </button>
      </div>
    </div>

    {#if showMath}
      <div class="eq-display">
        <div bind:this={mathFooterEl}></div>
      </div>
      <p class="eq-caption">{caption}</p>
    {/if}
  </div>
  <div class="notebook-content" style="height: {isOpen ? drawerHeight + 'vh' : '0'}; opacity: {isOpen ? '1' : '0'};">
    <div class="notebook-body">
      {#if activeStage === 1}
        <div class="canvas-controls">
          <p class="panel-heading">Add Vectors</p>
          <div class="btn-group">
            <button onclick={() => canvasComponent?.addVectorX()}>+ e₁</button>
            <button onclick={() => canvasComponent?.addVectorY()}>+ e₂</button>
            <button onclick={() => canvasComponent?.addVectorZ()}>+ e₃</button>
          </div>
          <div class="divider"></div>
          <p class="panel-heading">Cl(3,0) Operations</p>
          <div class="op-grid">
            <button class="primary" onclick={() => canvasComponent?.computeProduct('geometric')}>Geometric (ab)</button>
            <button id="btn-wedge" class="primary" class:pulsing={tourState.currentStep?.highlightElement === 'btn-wedge'} onclick={() => canvasComponent?.computeProduct('wedge')}>Wedge (a ∧ b)</button>
            <button class="primary" onclick={() => canvasComponent?.computeProduct('inner')}>Inner (a · b)</button>
            <button id="btn-dual" class="primary" class:pulsing={tourState.currentStep?.highlightElement === 'btn-dual'} onclick={() => canvasComponent?.computeDual()}>Dual (a*)</button>
          </div>
          <button id="clear-btn" class="danger" style="margin-top: 4px;" onclick={() => canvasComponent?.clearCanvas()}>Clear Canvas</button>
          <div class="divider"></div>
          <p class="panel-heading">Blade Visibility</p>
          <div class="blade-grid">
            {#each bladeLabels as b}
              <button class="blade-toggle" class:active={canvasUI.blades[b.key as keyof typeof canvasUI.blades]} onclick={() => toggleBlade(b.key)}>{b.label}</button>
            {/each}
          </div>
        </div>
      {/if}
      
      <div class="code-area">
        <div class="toolbar">
          <div style="display: flex; gap: 8px; align-items: center;">
            <div class="lang-toggle">
              <button class:active={currentLang === 'r'} onclick={() => setLanguage('r')}>R</button>
              <button class:active={currentLang === 'python'} onclick={() => setLanguage('python')}>Python</button>
            </div>
            <select class="example-select" value={currentExample} onchange={(e) => loadExample((e.target as HTMLSelectElement).value)}>
              <option value="01">01: GA Basics</option>
              <option value="02">02: Electrodynamics</option>
              <option value="03">03: Optoelectronics</option>
            </select>
          </div>
          <button class="generate-btn" onclick={runCode} disabled={isGenerating}>
            {#if isGenerating}
              Running...
            {:else}
              <svg style="display:inline-block; vertical-align:text-bottom; margin-right:4px;" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Run Code
            {/if}
          </button>
        </div>
        <div class="editor-host" bind:this={editorElement}></div>
      </div>
    </div>
  </div>
</div>

<style>
  .bottom-drawer {
    width: 100%;
    background: var(--panel-bg);
    backdrop-filter: blur(24px);
    border-top: 1px solid var(--card-border);
    box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    z-index: 100;
  }

  .math-header {
    background: var(--panel-bg);
    border: none;
    border-bottom: 1px solid var(--card-border);
    padding: 12px 32px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    position: relative;
    width: 100%;
    flex-shrink: 0;
    transition: background 0.2s;
  }

  .math-header:hover {
    background: var(--bg-chassis);
  }

  .math-header.pulsing {
    animation: pulse 1.5s infinite;
    box-shadow: inset 0 0 0 2px #c678dd;
  }

  @keyframes pulse {
    0% { transform: scale(1); box-shadow: inset 0 0 0 2px rgba(198, 120, 221, 0.7); }
    70% { transform: scale(1.02); box-shadow: inset 0 0 0 10px rgba(198, 120, 221, 0); }
    100% { transform: scale(1); box-shadow: inset 0 0 0 2px rgba(198, 120, 221, 0); }
  }

  .drag-handle-zone {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 16px;
    cursor: ns-resize;
    z-index: 10;
  }

  .drag-handle {
    width: 40px;
    height: 4px;
    background: var(--text-muted);
    border-radius: 4px;
    opacity: 0.5;
    position: absolute;
    top: 6px;
    left: 50%;
    transform: translateX(-50%);
    transition: opacity 0.2s, background 0.2s;
  }

  .drag-handle-zone:hover .drag-handle {
    opacity: 0.8;
    background: var(--text-main);
  }

  .stage-nav {
    grid-column: 2;
    display: flex;
    gap: 6px;
    background: var(--panel-bg);
    padding: 6px;
    border-radius: 12px;
    border: 1px solid var(--card-border);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    margin-top: 4px;
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
    background: var(--card-border);
  }

  .stage-tab.active {
    color: var(--text-main);
    background: var(--bg-chassis);
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
    background: var(--card-border);
  }

  .stage-tab.active .badge {
    background: var(--accent-vis);
    color: #fff;
  }

  .eq-display {
    background: var(--bg-chassis);
    border-radius: 12px;
    padding: 2px 32px; /* reduced padding to fit nicely */
    width: 100%;
    max-width: 700px;
    text-align: center;
    box-shadow: inset 0 1px 6px rgba(0, 0, 0, 0.04);
    min-height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-main);
  }

  .eq-caption {
    font-size: 0.75rem;
    color: var(--text-muted);
    max-width: 600px;
    text-align: center;
    margin: 0;
  }

  .notebook-content {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    /* Removed transition: height here so dragging is instant. Using CSS var or inline style for height. */
    transition: opacity 0.2s;
  }
  
  .notebook-body {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .canvas-controls {
    width: 250px;
    background: var(--bg-chassis);
    border-right: 1px solid var(--card-border);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
  }

  .code-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* bottom-drawer.collapsed .notebook-content rule removed since we use inline styles */

  .header-top {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    width: 100%;
    max-width: 900px;
  }

  .header-right {
    grid-column: 3;
    justify-self: end;
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
    color: var(--text-muted);
  }
  
  .icon-btn:hover {
    color: var(--text-main);
    background: var(--card-border);
  }
  
  .icon-btn.active {
    background: var(--accent-vis-light);
    border-color: var(--accent-vis);
    color: var(--accent-vis);
  }

  /* Control Panel Styles */
  .panel-heading {
    font-size: 0.68rem;
    font-family: var(--font-mono);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1.2px;
    font-weight: 700;
    margin: 0;
  }
  .btn-group { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; }
  .op-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
  .canvas-controls button {
    background: var(--bg-chassis); color: var(--text-main); border: 1px solid var(--card-border);
    padding: 6px 10px; border-radius: 5px; cursor: pointer; font-family: var(--font-mono);
    font-size: 0.72rem; transition: all 0.15s ease; font-weight: 500;
  }
  .canvas-controls button:hover { background: var(--card-border); }
  .canvas-controls button.primary {
    background: var(--accent-vis-light); color: var(--accent-vis); border-color: var(--accent-vis); font-weight: 700;
  }
  .canvas-controls button.primary:hover { background: var(--accent-vis); color: white; }
  .canvas-controls button.danger { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }
  .canvas-controls button.danger:hover { background: #dc2626; color: white; }
  .blade-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
  .blade-toggle { padding: 5px 4px; font-size: 0.68rem; text-align: center; }
  .blade-toggle.active { background: var(--accent-vis-light); color: var(--accent-vis); border-color: var(--accent-vis); font-weight: 700; }
  .divider { height: 1px; background: var(--card-border); margin: 6px 0; }

  /* Editor Toolbar Styles */
  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
    background: var(--panel-bg);
    border-bottom: 1px solid var(--card-border);
  }

  .lang-toggle {
    display: flex;
    background: var(--bg-chassis);
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid var(--card-border);
  }

  .lang-toggle button {
    background: transparent;
    color: var(--text-muted);
    border: none;
    padding: 4px 10px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
  }
  
  .lang-toggle button.active {
    background: var(--accent-vis);
    color: white;
  }
  
  .example-select {
    background: var(--bg-chassis);
    color: var(--text-main);
    border: 1px solid var(--card-border);
    border-radius: 4px;
    padding: 3px 8px;
    font-size: 0.72rem;
    font-family: var(--font-mono);
    outline: none;
    cursor: pointer;
  }

  .generate-btn {
    background: var(--accent-vis);
    color: white;
    border: none;
    padding: 5px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 700;
    font-size: 0.75rem;
  }
  .generate-btn:hover { background: var(--accent-vis-light); color: var(--accent-vis); }
  .generate-btn:disabled { background: var(--card-border); color: var(--text-muted); cursor: not-allowed; }

  .editor-host {
    flex-grow: 1;
    overflow-y: auto;
    font-size: 14px;
  }
  
  :global(.cm-editor) { height: 100%; background: transparent !important; }
  :global(.cm-scroller) { background: transparent !important; }
</style>
