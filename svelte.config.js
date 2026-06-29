import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    // The demo app is fully client-side, so we prerender it to plain static
    // files — deployable to Cloudflare Pages, GitHub Pages, anywhere.
    adapter: adapter()
  }
};

export default config;
