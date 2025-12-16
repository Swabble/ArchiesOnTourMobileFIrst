const overlay = document.getElementById('lightbox-overlay') as HTMLElement | null;
const grid = document.getElementById('gallery-grid') as HTMLElement | null;

const lightboxImage = document.getElementById('lightbox-image') as HTMLImageElement | null;
const lightboxCounter = document.getElementById('lightbox-counter');
const prevButton = document.getElementById('lightbox-prev');
const nextButton = document.getElementById('lightbox-next');

const EAGER_THUMBNAIL_COUNT = 6;

let state = {
  images: [] as { url: string; thumbnail: string; alt: string }[],
  currentIndex: 0
};

function setBodyScroll(disable: boolean) {
  if (!document.body) return;
  document.body.classList.toggle('no-scroll', disable);
}

function renderGrid() {
  if (!grid) return;
  grid.innerHTML = '';

  state.images.forEach((img, index) => {
    const figure = document.createElement('figure');
    figure.className = 'gallery-card';
    figure.dataset.index = String(index);

    const accent = index % 3 === 0 ? 'feature' : 'story';
    figure.dataset.accent = accent;

    const loading = index < EAGER_THUMBNAIL_COUNT ? 'eager' : 'lazy';
    figure.innerHTML = `
      <div class="gallery-card__image">
        <img src="${img.thumbnail}" alt="${img.alt}" loading="${loading}" />
        <span class="gallery-card__pill">${accent === 'feature' ? 'Signature' : 'Moment'}</span>
      </div>
      <figcaption>${img.alt}</figcaption>
    `;

    figure.addEventListener('click', () => openLightbox(index));
    figure.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openLightbox(index);
      }
    });

    figure.tabIndex = 0;
    grid.appendChild(figure);
  });
}

function preloadSequential(urls: string[]) {
  let index = 0;

  const loadNext = () => {
    if (index >= urls.length) return;
    const img = new Image();
    const handle = () => {
      index += 1;
      loadNext();
    };
    img.onload = handle;
    img.onerror = handle;
    img.src = urls[index];
  };

  loadNext();
}

function schedulePreload() {
  if (!state.images.length) return;

  const startPreload = () => {
    const remainingThumbnails = state.images
      .slice(EAGER_THUMBNAIL_COUNT)
      .map((image) => image.thumbnail);
    const fullImages = state.images.map((image) => image.url);
    preloadSequential([...remainingThumbnails, ...fullImages]);
  };

  const requestIdle = (window as typeof window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
  if (typeof requestIdle === 'function') {
    requestIdle(startPreload);
  } else {
    setTimeout(startPreload, 0);
  }
}

function updateLightboxDisplay() {
  if (!overlay || !lightboxImage || !lightboxCounter) return;
  if (!overlay.classList.contains('active')) return;

  const image = state.images[state.currentIndex];
  if (!image) return;

  lightboxImage.src = image.url;
  lightboxImage.alt = image.alt;
  lightboxCounter.textContent = `${state.currentIndex + 1} / ${state.images.length}`;
}

function goTo(index: number) {
  if (!state.images.length) return;
  const total = state.images.length;
  state.currentIndex = ((index % total) + total) % total;
  updateLightboxDisplay();
}

function openLightbox(index: number) {
  if (!overlay || !lightboxImage || !lightboxCounter) return;
  state.currentIndex = index;
  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden', 'false');
  updateLightboxDisplay();
  setBodyScroll(true);
}

function closeLightbox() {
  overlay?.classList.remove('active');
  overlay?.setAttribute('aria-hidden', 'true');
  setBodyScroll(false);
}

async function loadImages() {
  try {
    const staticRes = await fetch('/data/gallery.json');
    const staticPayload = await staticRes.json();
    const staticItems = Array.isArray(staticPayload?.items)
      ? staticPayload.items
      : Array.isArray(staticPayload)
        ? staticPayload
        : [];

    if (!staticItems.length) {
      throw new Error('Keine statischen Galerie-Daten');
    }

    state.images = staticItems;
    renderGrid();
    schedulePreload();
  } catch {
    const fallback = await fetch('/data/gallery.json');
    state.images = await fallback.json();
    renderGrid();
    schedulePreload();
  }
}

function bindControls() {
  document.getElementById('lightbox-close')?.addEventListener('click', closeLightbox);
  overlay?.addEventListener('click', (event) => {
    if (event.target === overlay) closeLightbox();
  });
  prevButton?.addEventListener('click', () => goTo(state.currentIndex - 1));
  nextButton?.addEventListener('click', () => goTo(state.currentIndex + 1));
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeLightbox();
    } else if (event.key === 'ArrowLeft') {
      goTo(state.currentIndex - 1);
    } else if (event.key === 'ArrowRight') {
      goTo(state.currentIndex + 1);
    }
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', async () => {
    bindControls();
    await loadImages();
  });
}
