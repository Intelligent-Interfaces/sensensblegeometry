<script lang="ts">
  let { isOpen = $bindable(false), title = 'Math & Physics Guide', children } = $props();
</script>

<div class="docsbar-container" class:open={isOpen}>
  {#if isOpen}
    <div class="docsbar-backdrop" onclick={() => isOpen = false} role="button" tabindex="-1" onkeydown={(e) => e.key === 'Escape' && (isOpen = false)}></div>
  {/if}
  
  <div class="docsbar">
    <div class="docsbar-header">
      <span class="title">{title}</span>
      <button class="close-btn" onclick={() => isOpen = false} title="Close Docs">×</button>
    </div>
    <div class="docsbar-content">
      {@render children()}
    </div>
  </div>
</div>

<style>
  .docsbar-container {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 200;
  }
  .docsbar-container.open {
    pointer-events: auto;
  }
  .docsbar-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.4);
    backdrop-filter: blur(2px);
    z-index: 201;
    opacity: 0;
    animation: fadeIn 0.2s forwards;
  }
  .docsbar {
    position: absolute;
    top: 0;
    right: -360px;
    width: 360px;
    height: 100%;
    background: var(--panel-bg);
    opacity: 0.95;
    backdrop-filter: blur(20px);
    border-left: 1px solid var(--accent-vis);
    box-shadow: -10px 0 30px rgba(0,0,0,0.4);
    z-index: 202;
    display: flex;
    flex-direction: column;
    transition: right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .docsbar-container.open .docsbar {
    right: 0;
  }
  .docsbar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--card-border);
    background: var(--card-bg);
  }
  .title {
    font-size: 0.8rem;
    font-weight: 700;
    color: #10b981;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  .close-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 1.4rem;
    cursor: pointer;
    line-height: 1;
    padding: 0 6px;
    border-radius: 4px;
    transition: all 0.15s;
  }
  .close-btn:hover {
    color: var(--text-main);
    background: var(--card-border);
  }
  .docsbar-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  @keyframes fadeIn {
    to { opacity: 1; }
  }
</style>
