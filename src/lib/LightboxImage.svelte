<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import { getLightboxStore } from './context.svelte.js';

  let {
    src,
    thumbnail,
    caption = '',
    alt = '',
    group = 'default',
    class: klass = '',
    style = '',
    loading = 'lazy',
    children
  }: {
    /** Full-size image shown in the lightbox. */
    src: string;
    /** Thumbnail to render (falls back to `src`). */
    thumbnail?: string;
    caption?: string;
    alt?: string;
    /** Gallery group. Same group → one gallery. Unique group → opens on its own. */
    group?: string;
    class?: string;
    style?: string;
    loading?: 'lazy' | 'eager';
    /** Optional custom trigger markup; when omitted a thumbnail `<img>` is rendered. */
    children?: Snippet;
  } = $props();

  const store = getLightboxStore();
  let el = $state<HTMLElement>();
  let myIndex = 0;

  // Register once, in mount order, so indexes line up with DOM order.
  onMount(() => {
    if (!store) {
      console.warn('[svelte-lightslide] <LightboxImage> must be used inside a <LightboxManager>.');
      return;
    }
    myIndex = store.registerImage(group, { src, thumbnail, caption, alt });
  });

  function openMe() {
    if (!store || !el) return;
    const r = el.getBoundingClientRect();
    store.open(group, myIndex, { left: r.left, top: r.top, width: r.width, height: r.height });
  }
  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openMe();
    }
  }
</script>

<button
  bind:this={el}
  type="button"
  class="lb-trigger {klass}"
  {style}
  onclick={openMe}
  {onkeydown}
  aria-label={`Open ${alt || caption || 'image'} in lightbox`}
>
  {#if children}
    {@render children()}
  {:else}
    <img src={thumbnail || src} {alt} {loading} />
  {/if}
</button>

<style>
  .lb-trigger {
    display: block;
    padding: 0;
    border: none;
    background: none;
    /* magnifying glass with a "+" — "click to zoom in", like the original Highslide */
    cursor:
      url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%3E%3Cg%20fill='none'%20stroke='%23000'%20stroke-opacity='.5'%20stroke-width='3.5'%3E%3Ccircle%20cx='10'%20cy='10'%20r='6.5'/%3E%3Cpath%20d='M15%2015l6%206'%20stroke-linecap='round'/%3E%3C/g%3E%3Cg%20fill='none'%20stroke='%23fff'%20stroke-width='1.8'%3E%3Ccircle%20cx='10'%20cy='10'%20r='6.5'/%3E%3Cpath%20d='M15%2015l6%206'%20stroke-linecap='round'/%3E%3Cpath%20d='M7%2010h6M10%207v6'/%3E%3C/g%3E%3C/svg%3E")
        10 10,
      zoom-in;
    overflow: hidden;
    transition: filter 0.15s ease;
  }
  .lb-trigger:hover {
    filter: brightness(1.07);
  }
  .lb-trigger:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
  /* When no custom markup is given, the inner thumbnail fills the trigger box. */
  .lb-trigger > img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
</style>
