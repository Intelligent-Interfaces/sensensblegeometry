<script lang="ts">
  import katex from 'katex';
  import 'katex/dist/katex.min.css';

  let { math = '', displayMode = false } = $props();

  let html = $derived(
    katex.renderToString(math, {
      throwOnError: false,
      displayMode,
    })
  );
</script>

<span class="katex-wrapper" class:display={displayMode}>
  {@html html}
</span>

<style>
  .katex-wrapper {
    display: inline-block;
  }
  .katex-wrapper.display {
    display: block;
    text-align: center;
    margin: 1em 0;
  }
</style>
