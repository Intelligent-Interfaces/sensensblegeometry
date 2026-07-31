<script lang="ts">
  import Canvas from './lib/Canvas.svelte';
  import Notebook from './lib/Notebook.svelte';
</script>

<main class="layout">
  <header class="topbar">
    <h1>Sensensble Geometry Lab</h1>
    <div class="controls">
      <button>Connect ML Copilot</button>
      <button>Sync Engine</button>
    </div>
  </header>
  
  <div class="workspace">
    <section class="pane canvas-pane">
      <Canvas />
    </section>
    
    <div class="divider"></div>
    
    <section class="pane notebook-pane">
      <Notebook />
    </section>
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background-color: #0d0d12;
    color: #fff;
    font-family: system-ui, -apple-system, sans-serif;
    height: 100vh;
    overflow: hidden;
  }

  .layout {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }

  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 20px;
    height: 50px;
    background-color: #16161e;
    border-bottom: 1px solid #2a2a35;
  }

  .topbar h1 {
    font-size: 1.1rem;
    margin: 0;
    font-weight: 600;
    letter-spacing: 0.5px;
  }

  .controls button {
    background-color: #2a2a35;
    color: #fff;
    border: none;
    padding: 6px 12px;
    margin-left: 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: background-color 0.2s;
  }

  .controls button:hover {
    background-color: #3b3b4d;
  }

  .workspace {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .pane {
    height: 100%;
    overflow: hidden;
  }

  .canvas-pane {
    flex: 6; /* 60% width */
  }

  .notebook-pane {
    flex: 4; /* 40% width */
  }

  .divider {
    width: 4px;
    background-color: #2a2a35;
    cursor: col-resize;
  }
</style>
