<!--
  ViewportCard.svelte
  A soft-shadow, rounded card wrapper inspired by the Clifford Lab viewport cards.
  Provides: title, icon, slots for content and embedded controls, and a drag-resize handle.
-->
<script lang="ts">
  interface Props {
    title: string;
    accentColor?: string;
    children?: import('svelte').Snippet;
    controls?: import('svelte').Snippet;
  }

  let { title, accentColor = 'var(--accent-vis)', children, controls }: Props = $props();

  let cardEl: HTMLDivElement;
  let isResizing = false;
  let startY = 0;
  let startHeight = 0;

  function onResizeStart(e: MouseEvent) {
    isResizing = true;
    startY = e.clientY;
    startHeight = cardEl.getBoundingClientRect().height;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ns-resize';
    e.preventDefault();
  }

  function onMouseMove(e: MouseEvent) {
    if (!isResizing) return;
    const dy = e.clientY - startY;
    cardEl.style.height = `${Math.max(220, startHeight + dy)}px`;
  }

  function onMouseUp() {
    isResizing = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }
</script>

<svelte:window on:mousemove={onMouseMove} on:mouseup={onMouseUp} />

<div class="viewport-card" bind:this={cardEl}>
  <h3 class="panel-title" style="color: {accentColor}">
    {@render children?.()}
  </h3>

  {#if controls}
    <div class="embedded-controls">
      {@render controls()}
    </div>
  {/if}

  <!-- Bottom drag resize handle -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="card-resizer-bottom" role="separator" aria-label="Resize" onmousedown={onResizeStart}></div>
</div>

<style>
  .viewport-card {
    background: var(--card-bg);
    border-radius: var(--card-radius);
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    position: relative;
    overflow: hidden;
    min-height: 220px;
    box-shadow: var(--card-shadow);
    transition: transform 0.2s cubic-bezier(0.25, 1.5, 0.5, 1);
  }

  .viewport-card:hover {
    transform: translateY(-1px);
  }

  .panel-title {
    font-size: 1rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    pointer-events: none;
  }

  .embedded-controls {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--card-border);
    font-size: 0.75rem;
  }

  .card-resizer-bottom {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 12px;
    cursor: ns-resize;
    background: transparent;
    z-index: 10;
  }
</style>
