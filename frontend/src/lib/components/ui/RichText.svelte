<script lang="ts">
  import Katex from './Katex.svelte';

  let { text = '' } = $props();

  // Split text by $...$ for inline math
  let segments = $derived.by(() => {
    const parts = text.split(/(\$[^$]+\$)/g);
    return parts.map(part => {
      if (part.startsWith('$') && part.endsWith('$')) {
        return { type: 'math', content: part.slice(1, -1) };
      }
      return { type: 'text', content: part };
    });
  });
</script>

<span class="rich-text">
  {#each segments as segment}
    {#if segment.type === 'math'}
      <Katex math={segment.content} />
    {:else}
      {segment.content}
    {/if}
  {/each}
</span>
