<script lang="ts">
  let { isOpen = $bindable(false), title = '', wide = false, children, trigger } = $props();
  
  function handleBackdropClick() {
    isOpen = false;
  }
</script>

<div class="popover-wrapper">
  <div class="trigger" onclick={() => isOpen = !isOpen} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && (isOpen = !isOpen)}>
    {@render trigger()}
  </div>
  
  {#if isOpen}
    <div class="popover-backdrop" onclick={handleBackdropClick} role="button" tabindex="-1" onkeydown={(e) => e.key === 'Escape' && handleBackdropClick()}></div>
    <div class="popover-content" class:wide>
      {#if title}
        <div class="popover-header">
          <span class="popover-title">{title}</span>
        </div>
      {/if}
      <div class="popover-body">
        {@render children()}
      </div>
    </div>
  {/if}
</div>

<style>
  .popover-wrapper {
    position: relative;
    display: inline-block;
  }
  .trigger {
    cursor: pointer;
    display: inline-flex;
  }
  .popover-backdrop {
    position: fixed;
    inset: 0;
    z-index: 90;
    /* Invisible backdrop to catch clicks */
  }
  .popover-content {
    position: absolute;
    top: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    width: max-content;
    min-width: 200px;
    background: var(--panel-bg);
    opacity: 0.95;
    backdrop-filter: blur(12px);
    border: 1px solid var(--accent-vis);
    border-radius: 10px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5), 0 0 15px rgba(16, 185, 129, 0.1);
    z-index: 100;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .popover-content.wide {
    width: 600px;
    max-width: 90vw;
  }
  .popover-header {
    padding: 8px 12px;
    border-bottom: 1px solid var(--card-border);
    background: var(--card-bg);
  }
  .popover-title {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #10b981;
  }
  .popover-body {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
</style>
