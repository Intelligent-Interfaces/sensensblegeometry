<script lang="ts">
  let { text = '', position = 'top', children } = $props();
  let show = $state(false);
</script>

<div 
  class="tooltip-container"
  role="presentation"
  onmouseenter={() => show = true}
  onmouseleave={() => show = false}
>
  {@render children()}
  {#if show}
    <div class="tooltip-box {position}">
      {text}
    </div>
  {/if}
</div>

<style>
  .tooltip-container {
    position: relative;
    display: inline-block;
  }
  .tooltip-box {
    position: absolute;
    background: var(--panel-bg);
    border: 1px solid var(--accent-vis);
    color: var(--text-main);
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 0.65rem;
    font-weight: 500;
    white-space: nowrap;
    z-index: 100;
    pointer-events: none;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    backdrop-filter: blur(4px);
    transition: opacity 0.15s ease-in-out;
  }
  .tooltip-box.top {
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%) translateY(-6px);
  }
  .tooltip-box.bottom {
    top: 100%;
    left: 50%;
    transform: translateX(-50%) translateY(6px);
  }
  .tooltip-box.left {
    right: 100%;
    top: 50%;
    transform: translateY(-50%) translateX(-6px);
  }
  .tooltip-box.right {
    left: 100%;
    top: 50%;
    transform: translateY(-50%) translateX(6px);
  }
</style>
