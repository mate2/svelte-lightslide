<script lang="ts">
  import type { Snippet } from 'svelte';
  import { fade } from 'svelte/transition';
  import LightboxPopup from './LightboxPopup.svelte';
  import { portal } from './utils.js';
  import { LightboxStore, setLightboxStore, type OriginRect } from './context.svelte.js';
  import { DEFAULT_OPTIONS, type LightboxImage, type LightboxOptions } from './types.js';

  let {
    options = {},
    accentColor,
    children,
    onopen,
    onclose,
    onchange
  }: {
    /** Visual + behavioural options forwarded to the lightbox. */
    options?: LightboxOptions;
    /** Convenience shortcut for `options.accentColor`. */
    accentColor?: string;
    /** Wrap your `<LightboxImage>` triggers here so they share this manager's store. */
    children?: Snippet;
    onopen?: (index: number) => void;
    onclose?: () => void;
    onchange?: (index: number) => void;
  } = $props();

  // One store per manager → descendant <LightboxImage> triggers find it via context,
  // and several managers can coexist on a page as fully independent galleries.
  const store = setLightboxStore(new LightboxStore());

  const mergedOptions = $derived({
    ...DEFAULT_OPTIONS,
    ...options,
    ...(accentColor ? { accentColor } : {})
  });

  // keep the store's mode in sync with the resolved option
  $effect(() => {
    store.multiple = mergedOptions.multiple;
  });

  // a modal dim layer only makes sense for a single popup
  const showOverlay = $derived(
    !mergedOptions.multiple && mergedOptions.dimBackground && store.popups.length > 0
  );

  // refs to mounted popups, so a backdrop click can trigger the same animated close
  let popupRefs = $state<Record<number, { close: () => void }>>({});
  function closeActive() {
    const id = store.activeId;
    if (id != null && popupRefs[id]) {
      popupRefs[id].close();
    } else {
      store.closeAll();
      onclose?.();
    }
  }

  // --- public API (call through `bind:this`) ------------------------------
  /** Replace a group's images. */
  export function registerImages(group: string, images: LightboxImage[]) {
    store.registerImages(group, images);
  }
  /** Open a group at `index`, optionally animating from an origin rect. */
  export function openGroup(group: string, index = 0, originRect: OriginRect | null = null) {
    store.open(group, index, originRect);
    onopen?.(index);
  }
  /** Remove a group. */
  export function removeGroup(group: string) {
    store.removeGroup(group);
  }
  /** Close every open popup. */
  export function close() {
    store.closeAll();
    onclose?.();
  }
  /** Snapshot of all registered groups. */
  export function getGroups() {
    return store.groups;
  }
</script>

{@render children?.()}

{#if showOverlay}
  <button
    use:portal
    class="lb-manager-overlay"
    style="--lb-overlay-opacity: {mergedOptions.overlayOpacity}"
    transition:fade={{ duration: 200 }}
    onclick={closeActive}
    aria-label="Close lightbox"
  ></button>
{/if}

{#each store.popups as popup (popup.id)}
  <LightboxPopup
    bind:this={popupRefs[popup.id]}
    images={store.imagesOf(popup.group)}
    initialIndex={popup.index}
    originRect={popup.originRect}
    z={popup.z}
    active={popup.id === store.activeId}
    options={mergedOptions}
    onfocus={() => store.raise(popup.id)}
    onchange={(i) => onchange?.(i)}
    onclose={() => {
      delete popupRefs[popup.id];
      store.closeId(popup.id);
      onclose?.();
    }}
  />
{/each}

<style>
  .lb-manager-overlay {
    position: fixed;
    inset: 0;
    z-index: 99999;
    border: none;
    padding: 0;
    cursor: default;
    background: rgba(0, 0, 0, var(--lb-overlay-opacity, 0.7));
    backdrop-filter: blur(2px);
  }
</style>
