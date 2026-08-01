<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { basicSetup } from 'codemirror';
  import { EditorView } from '@codemirror/view';
  import { EditorState } from '@codemirror/state';
  import { python } from '@codemirror/lang-python';
  import { oneDark } from '@codemirror/theme-one-dark';

  let editorElement: HTMLDivElement;
  let view: EditorView;

  // The code state (which will eventually sync with the ML copilot)
  let code = `import "engine"\n\n# Analytical copilot environment\ndef analyze_geometry(node):\n    return node.calculate_flux()`;

  let isGenerating = false;

  const generateAnalysis = async () => {
    isGenerating = true;
    try {
      // We will send a mock payload representing canvas state for now
      // In a full implementation, this state would be lifted to App.svelte and passed down
      const payload = {
        context: "Canvas",
        objects: [
          { id: "vecX", data: [0, 2.0, 0, 0, 0, 0, 0, 0] },
          { id: "vecY", data: [0, 0, 3.0, 0, 0, 0, 0, 0] }
        ]
      };

      const res = await fetch("http://127.0.0.1:8000/generate/code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      
      if (data.status === "success" && view) {
        // Update CodeMirror with the generated code
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: data.code }
        });
      }
    } catch (e) {
      console.error("Failed to connect to ML Copilot:", e);
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: "# Error connecting to ML Copilot on port 8000\n# Please ensure the FastAPI backend is running." }
      });
    } finally {
      isGenerating = false;
    }
  };

  onMount(() => {
    let startState = EditorState.create({
      doc: code,
      extensions: [
        basicSetup,
        python(),
        oneDark,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            code = update.state.doc.toString();
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
    if (view) {
      view.destroy();
    }
  });
</script>

<div class="notebook-container">
  <div class="header">
    <h2>Analytical Notebook</h2>
    <button onclick={generateAnalysis} disabled={isGenerating}>
      {isGenerating ? 'Generating...' : '✨ Generate ML Analysis'}
    </button>
  </div>
  <div class="editor-host" bind:this={editorElement}></div>
</div>

<style>
  .notebook-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: #282c34; /* One Dark background */
  }
  .header {
    padding: 15px 20px;
    background-color: #21252b;
    border-bottom: 1px solid #181a1f;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .header button {
    background: #61afef;
    color: #282c34;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.85rem;
  }
  .header button:hover {
    background: #4d93d3;
  }
  .header button:disabled {
    background: #5c6370;
    cursor: not-allowed;
  }
  h2 {
    margin: 0;
    color: #abb2bf;
    font-family: system-ui, sans-serif;
    font-size: 1rem;
    font-weight: 500;
  }
  .editor-host {
    flex-grow: 1;
    overflow-y: auto;
    font-size: 14px;
  }
  /* CodeMirror creates its own scrolling container, we want it to fill the height */
  :global(.cm-editor) {
    height: 100%;
  }
</style>
