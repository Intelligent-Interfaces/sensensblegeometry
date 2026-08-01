<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { basicSetup } from 'codemirror';
  import { EditorView } from '@codemirror/view';
  import { EditorState, Compartment } from '@codemirror/state';
  import { python } from '@codemirror/lang-python';
  import { StreamLanguage } from '@codemirror/language';
  import { r } from '@codemirror/legacy-modes/mode/r';
  import { oneDark } from '@codemirror/theme-one-dark';

  let editorElement: HTMLDivElement;
  let view: EditorView;
  let isGenerating = $state(false);
  let isOpen = $state(true);
  
  let languageConf = new Compartment();
  let currentLang = $state<'r' | 'python'>('r');

  let codeR = `library(clifford)\n\n# Analytical copilot environment\nanalyze_geometry <- function(state) {\n  # Predict geometric flux\n  return(flux(state))\n}`;
  let codePython = `import torch\nimport versor\n\n# Analytical copilot environment\ndef analyze_geometry(state):\n    # Predict geometric flux\n    return state.calculate_flux()`;

  let currentCode = $derived(currentLang === 'r' ? codeR : codePython);

  const setLanguage = (lang: 'r' | 'python') => {
    if (!view) return;
    currentLang = lang;
    
    // Switch the editor text completely
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: currentCode },
      effects: languageConf.reconfigure(lang === 'r' ? StreamLanguage.define(r) : python())
    });
  };

  const generateAnalysis = async () => {
    isGenerating = true;
    try {
      const payload = {
        context: "Canvas",
        language: currentLang,
        objects: [
          { id: "vecX", data: [0, 2.0, 0, 0, 0, 0, 0, 0] },
          { id: "vecY", data: [0, 0, 3.0, 0, 0, 0, 0, 0] }
        ]
      };

      const res = await fetch("http://127.0.0.1:8000/generate/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      
      if (data.status === "success" && view) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: data.code }
        });
      }
    } catch (e) {
      console.error("Failed to connect to ML Copilot:", e);
      const errTxt = currentLang === 'r' ? "# Error connecting to ML Copilot on port 8000\n# Please ensure FastAPI is running." : "# Error connecting to ML Copilot on port 8000\n# Please ensure FastAPI is running.";
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: errTxt }
      });
    } finally {
      isGenerating = false;
    }
  };

  onMount(() => {
    let startState = EditorState.create({
      doc: currentCode,
      extensions: [
        basicSetup,
        languageConf.of(StreamLanguage.define(r)), // Default to R
        oneDark,
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

<div class="floating-notebook" class:closed={!isOpen}>
  <div class="header">
    <div class="title-row">
      <h2>Analytical Notebook</h2>
      <button class="toggle-btn" onclick={() => isOpen = !isOpen}>
        {isOpen ? '→' : '←'}
      </button>
    </div>
    
    {#if isOpen}
      <div class="toolbar">
        <div class="lang-toggle">
          <button class:active={currentLang === 'r'} onclick={() => setLanguage('r')}>R</button>
          <button class:active={currentLang === 'python'} onclick={() => setLanguage('python')}>Python</button>
        </div>
        <button class="generate-btn" onclick={generateAnalysis} disabled={isGenerating}>
          {isGenerating ? 'Generating...' : '✨ Generate'}
        </button>
      </div>
    {/if}
  </div>
  
  <div class="editor-host" bind:this={editorElement} style:display={isOpen ? 'block' : 'none'}></div>
</div>

<style>
  .floating-notebook {
    position: absolute;
    top: 70px;
    right: 20px;
    width: 400px;
    height: calc(100vh - 170px);
    background: rgba(33, 37, 43, 0.95);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    z-index: 100;
    transition: width 0.3s cubic-bezier(0.25, 1.5, 0.5, 1);
    overflow: hidden;
  }

  .floating-notebook.closed {
    width: 48px;
    height: 48px;
    min-height: 48px;
  }

  .header {
    padding: 12px 16px;
    background: rgba(40, 44, 52, 0.8);
    border-bottom: 1px solid rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  h2 {
    margin: 0;
    color: #abb2bf;
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .toggle-btn {
    background: transparent;
    color: #abb2bf;
    border: none;
    cursor: pointer;
    font-size: 1.2rem;
    padding: 0 4px;
    line-height: 1;
  }
  .toggle-btn:hover { color: #fff; }

  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .lang-toggle {
    display: flex;
    background: #1e2227;
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .lang-toggle button {
    background: transparent;
    color: #6c757d;
    border: none;
    padding: 4px 10px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
  }
  
  .lang-toggle button.active {
    background: #4d93d3;
    color: white;
  }

  .generate-btn {
    background: #61afef;
    color: #282c34;
    border: none;
    padding: 5px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 700;
    font-size: 0.75rem;
  }
  .generate-btn:hover { background: #4d93d3; color: white; }
  .generate-btn:disabled { background: #5c6370; cursor: not-allowed; }

  .editor-host {
    flex-grow: 1;
    overflow-y: auto;
    font-size: 14px;
  }
  
  :global(.cm-editor) { height: 100%; background: transparent !important; }
  :global(.cm-scroller) { background: transparent !important; }
</style>
