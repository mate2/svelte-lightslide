<script lang="ts">
  import { LightboxManager, LightboxImage, type LightboxImageData } from '$lib/index.js';

  const ACCENT = '#ff7424';

  // A shared gallery
  const gallery: LightboxImageData[] = [
    { src: '/demo/01.jpg', thumbnail: '/demo/01-thumbnail.png', caption: 'A large image, watch it load' },
    { src: '/demo/03.webp', caption: 'A globular star cluster' },
    { src: '/demo/04.webp', caption: 'A gopher tortoise crossing a path' },
    { src: '/demo/05.webp', caption: 'A stellar nursery' }
  ];

  // Images that should each open independently (e.g. rows in a table)
  const independent: LightboxImageData[] = [
    { src: '/demo/03.webp', caption: 'Opens on its own' },
    { src: '/demo/04.webp', caption: 'Also on its own' },
    { src: '/demo/05.webp', caption: 'And this one too' }
  ];

  // Programmatic gallery
  let progManager = $state<any>();
  function openProgrammatically() {
    progManager?.registerImages('api', gallery);
    progManager?.openGroup('api', 0);
  }
</script>

<main>
  <header>
    <h1>svelte-lightslide</h1>
    <p>
      A draggable, accessible image lightbox &amp; gallery for Svelte 5 — a modern rebuild of the
      Highslide lightbox I loved. <strong>Click an image</strong>, then drag it
      around, use the arrow keys, toggle full size, or run the slideshow.
    </p>
  </header>

  <!-- 1 · Shared gallery -->
  <section>
    <h2>1 · Gallery</h2>
    <p class="hint">Same <code>group</code> → one gallery with thumbnails, slideshow and navigation.</p>
    <LightboxManager accentColor={ACCENT} options={{ autoPlayInterval: 4000 }}>
      <div class="grid">
        {#each gallery as image (image.src)}
          <LightboxImage
            src={image.src}
            thumbnail={image.thumbnail}
            caption={image.caption}
            group="main-gallery"
            class="card"
          />
        {/each}
      </div>
    </LightboxManager>
  </section>

  <!-- 2 · Solo image -->
  <section>
    <h2>2 · Single image <span class="badge">light theme</span></h2>
    <p class="hint">
      One image, its own group — no thumbnails, no navigation. This one uses
      <code>{`{ theme: 'light' }`}</code> for light chrome.
    </p>
    <LightboxManager accentColor={ACCENT} options={{ theme: 'light' }}>
      <div class="grid">
        <LightboxImage src="/demo/02.webp" caption="A standalone image" group="solo" class="card" />
      </div>
    </LightboxManager>
  </section>

  <!-- 3 · Independent galleries on one page -->
  <section>
    <h2>3 · Independent images</h2>
    <p class="hint">
      Each image gets a <code>unique group</code> → they open independently, not as one gallery.
      Common in tables and lists.
    </p>
    <LightboxManager accentColor={ACCENT}>
      <div class="grid">
        {#each independent as image (image.src)}
          <LightboxImage src={image.src} caption={image.caption} group={image.src} class="card" />
        {/each}
      </div>
    </LightboxManager>
  </section>

  <!-- 5 · Multiple open -->
  <section>
    <h2>5 · Multiple open (Highslide-style)</h2>
    <p class="hint">
      <code>{`{ multiple: true }`}</code> → non-modal. Open several images at once, drag them anywhere,
      each with its own slideshow. No dim layer. Click a popup to bring it to the front.
    </p>
    <LightboxManager accentColor={ACCENT} options={{ multiple: true }}>
      <div class="grid">
        {#each gallery as image (image.src)}
          <LightboxImage src={image.src} caption={image.caption} group="multi" class="card" />
        {/each}
      </div>
    </LightboxManager>
  </section>

  <!-- 4 · Programmatic -->
  <section>
    <h2>4 · Programmatic</h2>
    <p class="hint">Register images and open the lightbox from code via the manager API.</p>
    <LightboxManager bind:this={progManager} accentColor={ACCENT} />
    <button class="btn" onclick={openProgrammatically}>Open gallery from code →</button>
  </section>

  <footer>
    <p>svelte-lightslide · Built with Svelte 5. Inspired by Highslide JS (Torstein Hønsi, ~2007).</p>
  </footer>
</main>

<style>
  main {
    max-width: 920px;
    margin: 0 auto;
    padding: 3rem 1.5rem 6rem;
  }
  header h1 {
    font-size: 2.2rem;
    margin: 0 0 0.5rem;
  }
  header p {
    color: #b6b8be;
    line-height: 1.6;
    max-width: 60ch;
  }
  section {
    margin-top: 3rem;
  }
  h2 {
    font-size: 1.2rem;
    margin: 0 0 0.25rem;
  }
  .badge {
    font-size: 0.7rem;
    font-weight: 600;
    vertical-align: middle;
    margin-left: 0.5rem;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    background: #f6f2ec;
    color: #1c1813;
  }
  .hint {
    color: #9a9ca3;
    font-size: 0.9rem;
    margin: 0 0 1rem;
  }
  code {
    background: #1d1f24;
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
    font-size: 0.85em;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 0.85rem;
  }
  :global(.card) {
    width: 100%;
    height: 110px;
    object-fit: cover;
    border-radius: 8px;
    border: 1px solid #23252b;
  }
  .btn {
    background: #ff7424;
    color: #fff;
    border: none;
    padding: 0.7rem 1.1rem;
    border-radius: 8px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
  }
  .btn:hover {
    filter: brightness(1.08);
  }
  footer {
    margin-top: 4rem;
    color: #6f7178;
    font-size: 0.85rem;
    border-top: 1px solid #1d1f24;
    padding-top: 1.5rem;
  }
</style>
