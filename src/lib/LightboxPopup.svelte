<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { fade } from 'svelte/transition';
  import { portal, expandFrom, clamp } from './utils.js';
  import { DEFAULT_OPTIONS, type LightboxImage, type LightboxOptions } from './types.js';
  import type { OriginRect } from './context.svelte.js';

  let {
    images = [],
    initialIndex = 0,
    originRect = null,
    options = {},
    z = 1,
    active = true,
    onclose,
    onchange,
    onfocus
  }: {
    images?: LightboxImage[];
    initialIndex?: number;
    originRect?: OriginRect | null;
    options?: LightboxOptions;
    /** Stacking order within the manager. */
    z?: number;
    /** Whether this popup currently has keyboard focus (front-most). */
    active?: boolean;
    onclose?: () => void;
    onchange?: (index: number) => void;
    /** Asked to be brought to the front (e.g. on pointer down). */
    onfocus?: () => void;
  } = $props();

  // snapshot the starting index; the popup owns its own index from here on
  let index = $state(untrack(() => initialIndex));

  const opts = $derived({ ...DEFAULT_OPTIONS, ...options });

  // Theme + accent are exposed as CSS variables on the root, so consumers can
  // also override --lb-accent / --lb-bg / --lb-fg / --lb-radius / --lb-font in CSS.
  const themeVars = $derived(
    opts.theme === 'light'
      ? '--lb-bg: rgba(249, 247, 244, 0.94); --lb-fg: #1c1813; --lb-track: rgba(0, 0, 0, 0.16);'
      : '--lb-bg: rgba(20, 20, 20, 0.84); --lb-fg: #ffffff; --lb-track: rgba(255, 255, 255, 0.3);'
  );

  const current = $derived<LightboxImage | undefined>(images[index]);
  const isGallery = $derived(images.length > 1);
  const hasPrev = $derived(opts.loop || index > 0);
  const hasNext = $derived(opts.loop || index < images.length - 1);

  // --- image loading -------------------------------------------------------
  let loading = $state(true);
  let errored = $state(false);
  let natural = $state({ w: 0, h: 0 });
  let popupVisible = $state(false); // true once the first image has loaded
  let fullExpand = $state(false);

  // --- popup geometry / drag ----------------------------------------------
  let pos = $state({ x: 0, y: 0 });
  let dragging = $state(false);
  let viewport = $state({ w: 1280, h: 800 });

  const fitSize = $derived.by(() => {
    if (!natural.w || !natural.h) return { w: 0, h: 0 };
    const chromeH =
      (opts.showThumbnails && isGallery ? 92 : 0) + (opts.showCaption && current?.caption ? 48 : 0);
    const maxW = viewport.w * 0.92;
    const maxH = viewport.h * 0.92 - chromeH;
    const ratio = Math.min(maxW / natural.w, maxH / natural.h, 1);
    return { w: Math.round(natural.w * ratio), h: Math.round(natural.h * ratio) };
  });
  const imgSize = $derived(fullExpand ? natural : fitSize);

  // --- slideshow -----------------------------------------------------------
  let playing = $state(false);
  // controls fade out when the pointer leaves the image (like the original Highslide)
  let hovering = $state(true);
  // true while the close animation plays, before we actually unmount
  let closing = $state(false);

  const CLOSE_MS = 280; // keep in sync with the expandFrom transition duration

  onMount(() => {
    playing = opts.autoPlay;
  });

  // load the current image whenever it changes (and on mount)
  $effect(() => {
    const src = current?.src;
    if (!src) return;
    untrack(() => loadImage(src));
  });

  function loadImage(src: string) {
    loading = true;
    errored = false;
    const img = new Image();
    img.onload = () => {
      natural = { w: img.naturalWidth, h: img.naturalHeight };
      loading = false;
      if (!popupVisible) {
        popupVisible = true;
        center();
      }
      preloadNeighbours();
    };
    img.onerror = () => {
      loading = false;
      errored = true;
      if (!popupVisible) {
        popupVisible = true;
        center();
      }
    };
    img.src = src;
  }

  function preloadNeighbours() {
    const n = opts.preloadCount;
    for (let d = 1; d <= n; d++) {
      for (const i of [index + d, index - d]) {
        const img = images[(i + images.length) % images.length];
        if (img) new Image().src = img.src;
      }
    }
  }

  function center() {
    const s = fullExpand ? natural : fitSize;
    pos = { x: Math.round((viewport.w - s.w) / 2), y: Math.round((viewport.h - s.h) / 2) };
  }

  // track the viewport
  $effect(() => {
    const update = () => (viewport = { w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  });

  // keyboard control — only the front-most (active) popup responds
  $effect(() => {
    if (!active || !opts.enableKeyboard) return;
    const onkey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          close();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          prev();
          break;
        case 'ArrowRight':
          e.preventDefault();
          next();
          break;
        case ' ':
          if (isGallery) {
            e.preventDefault();
            toggleSlideshow();
          }
          break;
        case 'f':
        case 'F':
          toggleExpand();
          break;
      }
    };
    window.addEventListener('keydown', onkey);
    return () => window.removeEventListener('keydown', onkey);
  });

  // single slideshow timer, restarted whenever `playing` or `index` changes
  $effect(() => {
    if (!playing || !isGallery) return;
    index; // track so the timer restarts on each slide
    const id = setTimeout(() => {
      if (!opts.loop && index >= images.length - 1) {
        playing = false;
        return;
      }
      next();
    }, opts.autoPlayInterval);
    return () => clearTimeout(id);
  });

  // === actions ============================================================
  function goTo(i: number) {
    if (images.length === 0) return;
    const n = opts.loop ? (i + images.length) % images.length : clamp(i, 0, images.length - 1);
    if (n === index) return;
    index = n;
    fullExpand = false;
    onchange?.(n);
  }
  const next = () => hasNext && goTo(index + 1);
  const prev = () => hasPrev && goTo(index - 1);
  // Two-phase close: play the shrink-back-to-thumbnail outro while still mounted
  // (so the portal stays attached), then unmount via onclose.
  export function close() {
    if (closing) return;
    closing = true;
    popupVisible = false;
    setTimeout(() => onclose?.(), CLOSE_MS);
  }
  function toggleSlideshow() {
    playing = !playing;
  }
  function toggleExpand() {
    fullExpand = !fullExpand;
    center();
  }

  // === drag (and click-to-close) ==========================================
  let dragMoved = false;
  let dragStart = { px: 0, py: 0, x: 0, y: 0 };

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    dragging = true;
    dragMoved = false;
    dragStart = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: PointerEvent) {
    if (!dragging) return;
    const dx = e.clientX - dragStart.px;
    const dy = e.clientY - dragStart.py;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragMoved = true;
    if (opts.draggable) pos = { x: dragStart.x + dx, y: dragStart.y + dy };
  }
  function onPointerUp(e: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    if (!dragMoved) close(); // a clean click on the image closes it, like Highslide
  }

  const RING_C = 2 * Math.PI * 18; // circumference of the slideshow progress ring
</script>

<!-- Root never blocks the page: only the popup box itself is interactive, so other
     popups (and the page) stay clickable in multiple mode. -->
<div use:portal class="lb-root" style="z-index: {100000 + z}; --lb-accent: {opts.accentColor}; {themeVars}">
  {#if !popupVisible && !closing}
    <div class="lb-loading-chip" transition:fade={{ duration: 150 }}>
      <span class="lb-spinner"></span> Loading…
    </div>
  {/if}

  {#if popupVisible}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="lb-popup"
      class:lb-dragging={dragging}
      style="left: {pos.x}px; top: {pos.y}px;"
      in:expandFrom={{ rect: originRect, duration: CLOSE_MS }}
      out:expandFrom={{ rect: originRect, duration: CLOSE_MS }}
      onpointerdowncapture={() => onfocus?.()}
    >
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="lb-stage"
        style="width: {imgSize.w}px;"
        onpointerenter={() => (hovering = true)}
        onpointerleave={() => (hovering = false)}
      >
        {#if errored}
          <div class="lb-error" style="width: {imgSize.w || 320}px; height: 200px;">
            Failed to load image
          </div>
        {:else if current}
          <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
          <img
            class="lb-image"
            src={current.src}
            alt={current.alt || current.caption || ''}
            width={imgSize.w}
            height={imgSize.h}
            draggable="false"
            onpointerdown={onPointerDown}
            onpointermove={onPointerMove}
            onpointerup={onPointerUp}
            title="Click to close · drag to move · arrow keys to navigate"
          />
          {#if loading}
            <div class="lb-reloading"><span class="lb-spinner"></span></div>
          {/if}
        {/if}

        {#if opts.showCounter && isGallery}
          <div class="lb-counter" class:lb-hidden={!hovering}>{index + 1} / {images.length}</div>
        {/if}

        <!-- Highslide-style control bar, anchored to the bottom of the image -->
        <div class="lb-controlbar" class:lb-hidden={!hovering}>
          {#if isGallery}
            <button class="lb-btn" onclick={prev} disabled={!hasPrev} title="Previous (←)" aria-label="Previous image">
              <svg viewBox="0 0 24 24"><path d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z" /></svg>
            </button>

            <button class="lb-btn lb-play" onclick={toggleSlideshow} title={playing ? 'Pause slideshow (Space)' : 'Play slideshow (Space)'} aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}>
              {#if playing}
                <svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
              {:else}
                <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              {/if}
              {#if playing}
                {#key index}
                  <svg class="lb-ring" width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
                    <circle class="lb-ring-track" cx="20" cy="20" r="18" />
                    <circle
                      class="lb-ring-progress"
                      cx="20"
                      cy="20"
                      r="18"
                      transform="rotate(-90 20 20)"
                      style="stroke-dasharray: {RING_C}; stroke-dashoffset: {RING_C}; animation-duration: {opts.autoPlayInterval}ms;"
                    />
                  </svg>
                {/key}
              {/if}
            </button>

            <button class="lb-btn" onclick={next} disabled={!hasNext} title="Next (→)" aria-label="Next image">
              <svg viewBox="0 0 24 24"><path d="M10 6 8.6 7.4 13.2 12l-4.6 4.6L10 18l6-6z" /></svg>
            </button>

            <span class="lb-sep"></span>
          {/if}

          <button class="lb-btn" class:lb-active={fullExpand} onclick={toggleExpand} title={fullExpand ? 'Fit to screen (F)' : 'Full size (F)'} aria-label="Toggle full size">
            {#if fullExpand}
              <svg viewBox="0 0 24 24"><path d="M14 14h3v2h-5v-5h2zM10 10H7V8h5v5h-2zM5 5h6V3H3v8h2zM19 19h-6v2h8v-8h-2z" /></svg>
            {:else}
              <svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7zm-2-4h2V7h3V5H5zm12 7h-3v2h5v-5h-2zM14 5v2h3v3h2V5z" /></svg>
            {/if}
          </button>

          <button class="lb-btn lb-close" onclick={close} title="Close (Esc)" aria-label="Close">
            <svg viewBox="0 0 24 24"><path d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z" /></svg>
          </button>
        </div>
      </div>

      {#if opts.showCaption && current?.caption}
        <div class="lb-caption" style="max-width: {imgSize.w}px;">{current.caption}</div>
      {/if}

      {#if opts.showThumbnails && isGallery}
        <div class="lb-thumbs" style="max-width: {Math.max(imgSize.w, 320)}px;">
          {#each images as image, i (image.src + i)}
            <button
              class="lb-thumb"
              class:lb-thumb-active={i === index}
              onclick={() => goTo(i)}
              aria-label="Go to image {i + 1}"
            >
              <img src={image.thumbnail || image.src} alt={image.alt || ''} loading="lazy" />
              {#if playing && i === index}
                {#key index}
                  <span class="lb-thumb-progress" style="animation-duration: {opts.autoPlayInterval}ms;"></span>
                {/key}
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .lb-root {
    position: fixed;
    inset: 0;
    pointer-events: none; /* transparent areas never block other popups or the page */
    /* --lb-accent / --lb-bg / --lb-fg / --lb-track are set inline from the
       accentColor + theme options. --lb-font / --lb-radius are left to inherit,
       so a consumer can override them from any ancestor's CSS. */
    font-family: var(
      --lb-font,
      ui-sans-serif,
      system-ui,
      -apple-system,
      'Segoe UI',
      Roboto,
      Helvetica,
      Arial,
      sans-serif
    );
  }

  .lb-loading-chip {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.6rem 1rem;
    border-radius: 8px;
    background: var(--lb-bg, rgba(20, 20, 20, 0.9));
    color: var(--lb-fg, #fff);
    font-size: 0.9rem;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.45);
  }

  .lb-popup {
    position: fixed;
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.6rem;
    transition:
      width 0.25s ease,
      height 0.25s ease;
  }

  .lb-stage {
    position: relative;
    display: flex;
    line-height: 0;
  }

  .lb-image {
    display: block;
    max-width: none;
    border-radius: var(--lb-radius, 6px);
    background: #111;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.55);
    user-select: none;
    -webkit-user-drag: none;
    transition:
      width 0.25s ease,
      height 0.25s ease;
    /* magnifying glass with a "−" — "click to close", like the original Highslide */
    cursor:
      url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%3E%3Cg%20fill='none'%20stroke='%23000'%20stroke-opacity='.5'%20stroke-width='3.5'%3E%3Ccircle%20cx='10'%20cy='10'%20r='6.5'/%3E%3Cpath%20d='M15%2015l6%206'%20stroke-linecap='round'/%3E%3C/g%3E%3Cg%20fill='none'%20stroke='%23fff'%20stroke-width='1.8'%3E%3Ccircle%20cx='10'%20cy='10'%20r='6.5'/%3E%3Cpath%20d='M15%2015l6%206'%20stroke-linecap='round'/%3E%3Cpath%20d='M7%2010h6'/%3E%3C/g%3E%3C/svg%3E")
        10 10,
      zoom-out;
  }
  .lb-dragging .lb-image {
    cursor: move;
  }

  .lb-error {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--lb-radius, 6px);
    background: var(--lb-bg, #1a1a1a);
    color: #e66;
    font-size: 0.95rem;
  }

  .lb-reloading {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 6px;
  }

  .lb-spinner {
    width: 22px;
    height: 22px;
    border: 3px solid color-mix(in srgb, var(--lb-fg, #fff) 28%, transparent);
    border-top-color: var(--lb-fg, #fff);
    border-radius: 50%;
    animation: lb-spin 0.8s linear infinite;
    display: inline-block;
  }
  @keyframes lb-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .lb-counter {
    position: absolute;
    top: 0.6rem;
    left: 0.6rem;
    padding: 0.25rem 0.6rem;
    border-radius: 6px;
    background: var(--lb-bg, rgba(0, 0, 0, 0.65));
    color: var(--lb-fg, #fff);
    font-size: 0.8rem;
    font-weight: 600;
    pointer-events: none;
    transition: opacity 0.2s ease;
  }

  .lb-controlbar {
    position: absolute;
    bottom: 0.7rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 0.15rem;
    padding: 0.25rem 0.35rem;
    border-radius: 10px;
    background: var(--lb-bg, rgba(20, 20, 20, 0.82));
    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    opacity: 1;
    transition: opacity 0.2s ease;
  }

  /* controls + counter fade out when the pointer leaves the image */
  .lb-hidden {
    opacity: 0;
    pointer-events: none;
  }

  .lb-btn {
    position: relative;
    width: 34px;
    height: 34px;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: var(--lb-fg, #fff);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s ease;
  }
  .lb-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--lb-fg, #fff) 16%, transparent);
  }
  .lb-btn:disabled {
    opacity: 0.35;
    cursor: default;
  }
  .lb-btn.lb-active {
    background: color-mix(in srgb, var(--lb-fg, #fff) 22%, transparent);
  }
  .lb-btn svg:not(.lb-ring) {
    width: 19px;
    height: 19px;
    fill: currentColor;
  }
  .lb-close:hover {
    background: rgba(220, 60, 60, 0.85) !important;
  }
  .lb-play {
    overflow: visible;
  }
  .lb-sep {
    width: 1px;
    height: 20px;
    margin: 0 0.2rem;
    background: color-mix(in srgb, var(--lb-fg, #fff) 20%, transparent);
  }

  /* slideshow progress ring around the play button */
  .lb-ring {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 30px;
    height: 30px;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }
  .lb-ring-track {
    fill: none;
    stroke: var(--lb-track, rgba(255, 255, 255, 0.3));
    stroke-width: 3;
  }
  .lb-ring-progress {
    fill: none;
    stroke: var(--lb-accent, #fff);
    stroke-width: 3;
    stroke-linecap: round;
    /* rotation is applied via the SVG `transform` attribute (rotate -90 16 16)
       so the dash starts at 12 o'clock — robust across browsers, unlike a CSS
       transform which depends on transform-box/transform-origin */
    animation: lb-ring-fill linear forwards;
  }
  @keyframes lb-ring-fill {
    to {
      stroke-dashoffset: 0;
    }
  }

  .lb-caption {
    pointer-events: auto;
    padding: 0.5rem 0.9rem;
    border-radius: 7px;
    background: var(--lb-bg, rgba(20, 20, 20, 0.82));
    color: var(--lb-fg, #fff);
    font-size: 0.9rem;
    line-height: 1.4;
    text-align: center;
  }

  .lb-thumbs {
    pointer-events: auto;
    display: flex;
    gap: 0.4rem;
    padding: 0.5rem;
    overflow-x: auto;
    border-radius: 8px;
    background: var(--lb-bg, rgba(20, 20, 20, 0.65));
    scrollbar-width: thin;
  }
  .lb-thumb {
    position: relative;
    flex: 0 0 auto;
    width: 56px;
    height: 40px;
    padding: 0;
    border: 2px solid transparent;
    border-radius: 5px;
    overflow: hidden;
    background: none;
    cursor: pointer;
    opacity: 0.6;
    transition:
      opacity 0.15s ease,
      border-color 0.15s ease;
  }
  .lb-thumb:hover {
    opacity: 0.9;
  }
  .lb-thumb-active {
    opacity: 1;
    border-color: var(--lb-accent, #fff);
  }
  .lb-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .lb-thumb-progress {
    position: absolute;
    left: 0;
    bottom: 0;
    height: 3px;
    width: 0;
    background: var(--lb-accent, #fff);
    animation: lb-bar linear forwards;
  }
  @keyframes lb-bar {
    to {
      width: 100%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .lb-popup,
    .lb-image {
      transition: none;
    }
  }
</style>
