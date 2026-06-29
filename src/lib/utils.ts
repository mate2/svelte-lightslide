import { cubicOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';
import type { OriginRect } from './context.svelte.js';

/**
 * Move a node to `document.body` so a `position: fixed` popup is never clipped
 * by an ancestor's `overflow`/`transform`. Cleans itself up on destroy.
 */
export function portal(node: HTMLElement) {
  document.body.appendChild(node);
  return {
    destroy() {
      node.parentNode?.removeChild(node);
    }
  };
}

/**
 * Svelte transition that grows the popup out of (and shrinks it back into) the
 * thumbnail that opened it — the Highslide "expand from where you clicked" feel.
 * Falls back to a plain scale/fade when no origin rect is available.
 */
export function expandFrom(
  node: HTMLElement,
  { rect, duration = 280 }: { rect: OriginRect | null; duration?: number }
): TransitionConfig {
  const target = node.getBoundingClientRect();

  if (!rect || target.width === 0 || target.height === 0) {
    return {
      duration,
      easing: cubicOut,
      css: (t) => `opacity: ${t}; transform: scale(${0.92 + 0.08 * t});`
    };
  }

  const targetCx = target.left + target.width / 2;
  const targetCy = target.top + target.height / 2;
  const originCx = rect.left + rect.width / 2;
  const originCy = rect.top + rect.height / 2;

  const dx = originCx - targetCx;
  const dy = originCy - targetCy;
  const sx = rect.width / target.width;
  const sy = rect.height / target.height;

  return {
    duration,
    easing: cubicOut,
    css: (t, u) => `
      transform-origin: center center;
      transform: translate(${u * dx}px, ${u * dy}px) scale(${sx + t * (1 - sx)}, ${sy + t * (1 - sy)});
      opacity: ${Math.min(1, t * 2.2)};
    `
  };
}

/** Clamp a value into [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
