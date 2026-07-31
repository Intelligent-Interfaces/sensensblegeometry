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
