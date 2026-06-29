# Roadmap

`svelte-lightslide` v1 is intentionally focused on **images** — the experience I most missed from Highslide, done well. A few directions I'd like to explore next:

## Content types beyond images

Support video, iframes/YouTube embeds, and arbitrary HTML in a popup (Highslide's `htmlExpand` equivalent). Sketch:

- add a `type: 'image' | 'video' | 'iframe' | 'html'` field on each item (or infer it from the URL)
- render conditionally in the popup (`<img>` / `<video>` / `<iframe>` / a snippet)
- size differently — non-images have no `naturalWidth/Height`, so the caller provides a size or aspect ratio (or a default)
- adapt preloading (no `new Image()` for an iframe)

The popup shell — expand-from-thumbnail, drag, control bar, manager, multiple mode — would stay as-is.

## Smaller polish

- Reserve a fixed caption height when *any* image in a group has a caption, so the popup doesn't resize as you navigate between captioned and uncaptioned images.
- Optional focus trap + scroll lock in modal mode.
- A few unit tests around the group/registration logic.
