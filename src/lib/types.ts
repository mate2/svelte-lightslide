/** A single image shown in the lightbox. */
export interface LightboxImage {
  /** Full-size image URL. */
  src: string;
  /** Optional thumbnail URL (falls back to `src`). */
  thumbnail?: string;
  /** Optional caption shown under the image. */
  caption?: string;
  /** Optional alt text (falls back to `caption`). */
  alt?: string;
}

/** Visual + behavioural options shared by the Lightbox and the Manager. */
export interface LightboxOptions {
  /** Show the thumbnail strip when a group has more than one image. */
  showThumbnails?: boolean;
  /** Show the caption bar under the image. */
  showCaption?: boolean;
  /** Show the "n / total" counter. */
  showCounter?: boolean;
  /** Let arrow keys / Esc / Space drive the lightbox. */
  enableKeyboard?: boolean;
  /** Start an automatic slideshow as soon as the lightbox opens. */
  autoPlay?: boolean;
  /** Slideshow interval in milliseconds. */
  autoPlayInterval?: number;
  /** Wrap around at the ends (next on last → first). */
  loop?: boolean;
  /** Dim the page behind the popup. */
  dimBackground?: boolean;
  /** Opacity of the dimming layer (0–1). */
  overlayOpacity?: number;
  /** Allow dragging the popup around the page (the Highslide signature). */
  draggable?: boolean;
  /**
   * Allow several popups open at once — non-modal, no dim layer, each draggable
   * with its own slideshow (the original Highslide multi-image behaviour).
   * When false (default), the lightbox is modal: one popup, dimmed background.
   */
  multiple?: boolean;
  /** Light or dark chrome (controls, caption, thumbnails). Default `dark`. */
  theme?: 'dark' | 'light';
  /** Accent colour — slideshow progress ring/bar + active thumbnail. Also settable via the `--lb-accent` CSS variable. */
  accentColor?: string;
  /** How many neighbours to preload around the current image. */
  preloadCount?: number;
}

export const DEFAULT_OPTIONS: Required<LightboxOptions> = {
  showThumbnails: true,
  showCaption: true,
  showCounter: true,
  enableKeyboard: true,
  autoPlay: false,
  autoPlayInterval: 4000,
  loop: true,
  dimBackground: true,
  overlayOpacity: 0.7,
  draggable: true,
  multiple: false,
  theme: 'dark',
  accentColor: '#ffffff',
  preloadCount: 1
};
