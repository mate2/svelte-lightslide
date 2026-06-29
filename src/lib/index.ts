export { default as LightboxManager } from './LightboxManager.svelte';
export { default as LightboxImage } from './LightboxImage.svelte';

export { LightboxStore, getLightboxStore, setLightboxStore } from './context.svelte.js';
export type { OriginRect } from './context.svelte.js';

export { DEFAULT_OPTIONS } from './types.js';
export type { LightboxImage as LightboxImageData, LightboxOptions } from './types.js';
