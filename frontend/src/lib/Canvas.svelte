<script lang="ts">
  import { onMount } from 'svelte';
  import init, { Multivector, SimulationState } from 'engine';

  let canvasElement: HTMLCanvasElement;
  let simState: SimulationState;

  onMount(async () => {
    // Initialize the WebAssembly module
    await init();
    console.log("WASM Engine initialized successfully");

    // Initialize the simulation state
    simState = new SimulationState();
    
    // Create a vector (e.g., in X direction)
    let vecX = Multivector.vector(2.0, 0.0, 0.0);
    // Create another vector (e.g., in Y direction)
    let vecY = Multivector.vector(0.0, 3.0, 0.0);
    
    // Perform Geometric Product (X * Y should produce a bivector XY with magnitude 6.0)
    let result = vecX.geometric_product(vecY);
    
    console.log("Geometric Product of 2.0*e1 and 3.0*e2:");
    console.log(result);
    
    simState.add_object(result);
    console.log(`Simulation objects count: ${simState.object_count()}`);
  });
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
