<script lang="ts">
  import { tourState } from './tourState.svelte';

  const nextStep = () => tourState.nextStep();
  const stopTour = () => tourState.stopTour();
</script>

{#if tourState.isActive && tourState.currentStep}
  <div class="tour-overlay">
    <div class="tour-card">
      <div class="tour-header">
        <h3>{tourState.currentStep.title}</h3>
        <button class="close-btn" onclick={stopTour}>✕</button>
      </div>
      <div class="tour-body">
        <p>{tourState.currentStep.text}</p>
      </div>
      <div class="tour-footer">
        <div class="progress">
          Step {tourState.currentStepIndex + 1} of {tourState.steps.length}
        </div>
        
        {#if !tourState.currentStep.actionRequired}
          <button class="next-btn" onclick={nextStep}>Next →</button>
        {:else}
          <span class="waiting">Waiting for action...</span>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .tour-overlay {
    position: absolute;
    bottom: 120px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    pointer-events: none;
  }

  .tour-card {
    background: var(--panel-bg);
    backdrop-filter: blur(16px);
    border: 1px solid var(--card-border);
    border-radius: 16px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(97, 175, 239, 0.3);
    width: 400px;
    pointer-events: auto;
    overflow: hidden;
    animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  .tour-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 20px;
    background: var(--bg-chassis);
    border-bottom: 1px solid var(--card-border);
  }

  .tour-header h3 {
    margin: 0;
    color: var(--accent-vis);
    font-size: 0.9rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .close-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 1.1rem;
    padding: 0;
  }

  .close-btn:hover {
    color: #e06c75;
  }

  .tour-body {
    padding: 20px;
    color: var(--text-main);
    font-size: 1rem;
    line-height: 1.5;
  }

  .tour-body p {
    margin: 0;
  }

  .tour-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 20px;
    background: var(--bg-chassis);
    border-top: 1px solid var(--card-border);
  }

  .progress {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-weight: 600;
  }

  .next-btn {
    background: var(--accent-vis);
    color: #fff;
    border: none;
    padding: 6px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 700;
    font-size: 0.85rem;
    transition: background 0.2s;
  }

  .next-btn:hover {
    background: var(--accent-vis-light);
    color: var(--accent-vis);
  }

  .waiting {
    font-size: 0.8rem;
    color: #c678dd;
    font-style: italic;
    animation: pulseText 1.5s infinite;
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes pulseText {
    0% { opacity: 0.5; }
    50% { opacity: 1; }
    100% { opacity: 0.5; }
  }
</style>
