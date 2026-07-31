<script lang="ts">
  let canvasElement: HTMLCanvasElement;
  
  // Future: Hook up WebGPU or WebGL here via Rust WASM
</script>

<div class="canvas-container">
  <canvas bind:this={canvasElement}></canvas>
  <div class="overlay">
    <h2>Geometric Canvas</h2>
    <p>Visual composition and physics engine rendering</p>
  </div>
</div>

<style>
  .canvas-container {
    width: 100%;
    height: 100%;
    position: relative;
    background-color: #1a1a2e;
    overflow: hidden;
  }
  canvas {
    width: 100%;
    height: 100%;
    display: block;
  }
  .overlay {
    position: absolute;
    top: 20px;
    left: 20px;
    color: #fff;
    pointer-events: none;
  }
  h2 {
    margin: 0 0 5px 0;
    font-family: system-ui, sans-serif;
    font-size: 1.2rem;
  }
  p {
    margin: 0;
    opacity: 0.7;
    font-family: system-ui, sans-serif;
    font-size: 0.9rem;
  }
</style>
