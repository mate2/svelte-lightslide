import { getContext, setContext } from "svelte";
import type { LightboxImage } from "./types.js";

const KEY = Symbol("svelte-lightslide");

/** A plain rect we can serialise from `getBoundingClientRect()` (for the FLIP origin). */
export interface OriginRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** One open popup instance. In multiple mode several of these coexist. */
export interface OpenPopup {
  id: number;
  group: string;
  index: number;
  originRect: OriginRect | null;
  /** Stacking order — bumped when the popup is focused so it comes to the front. */
  z: number;
}

/**
 * Reactive store backing a lightbox instance. One store is created per
 * `<LightboxManager>` and shared with descendant triggers through context, so a
 * page can host several independent galleries without a global event bus.
 *
 * It tracks a *list* of open popups: in single (modal) mode the list holds at
 * most one; in `multiple` mode each open() adds another draggable popup, the way
 * the original Highslide let you fan several images across the page.
 */
export class LightboxStore {
  /** Named galleries → their images. */
  groups = $state<Record<string, LightboxImage[]>>({});
  /** Currently open popups. */
  popups = $state<OpenPopup[]>([]);
  /** When true, multiple popups can be open at once (non-modal, no dim layer). */
  multiple = $state(false);

  #nextId = 1;
  #topZ = 0;

  /** Images of a given group. */
  imagesOf(group: string): LightboxImage[] {
    return this.groups[group] ?? [];
  }

  /** Replace a group's images wholesale. */
  registerImages(group: string, images: LightboxImage[]) {
    this.groups[group] = images;
  }

  /** Append one image to a group (creating it if needed) and return its index. */
  registerImage(group: string, image: LightboxImage): number {
    // Always read/mutate through the reactive proxy. Capturing the array from
    // `(this.groups[group] = [])` would push into the raw (non-proxied) array
    // while everyone else reads the proxy — losing the first image of a group.
    if (!this.groups[group]) this.groups[group] = [];
    this.groups[group].push(image);
    return this.groups[group].length - 1;
  }

  /** Remove a group entirely. */
  removeGroup(group: string) {
    delete this.groups[group];
  }

  /** Open a group at a given index, optionally animating from an origin element's rect. */
  open(group: string, index = 0, originRect: OriginRect | null = null) {
    const list = this.groups[group];
    if (!list || list.length === 0) return;
    const safeIndex = Math.max(0, Math.min(index, list.length - 1));
    const popup: OpenPopup = {
      id: this.#nextId++,
      group,
      index: safeIndex,
      originRect,
      z: ++this.#topZ,
    };
    this.popups = this.multiple ? [...this.popups, popup] : [popup];
  }

  /** Close a single popup by id. */
  closeId(id: number) {
    this.popups = this.popups.filter((p) => p.id !== id);
  }

  /** Close every open popup. */
  closeAll() {
    this.popups = [];
  }

  /** Bring a popup to the front (and make it the keyboard-active one). */
  raise(id: number) {
    const popup = this.popups.find((p) => p.id === id);
    if (popup) popup.z = ++this.#topZ;
  }

  /** Id of the front-most popup (the one the keyboard drives), or null. */
  get activeId(): number | null {
    if (this.popups.length === 0) return null;
    return this.popups.reduce((top, p) => (p.z > top.z ? p : top)).id;
  }
}

export function setLightboxStore(store: LightboxStore): LightboxStore {
  return setContext(KEY, store);
}

export function getLightboxStore(): LightboxStore | undefined {
  return getContext<LightboxStore>(KEY);
}
