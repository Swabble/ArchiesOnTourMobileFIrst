import type { } from './menuTypes';

const overlay = document.getElementById('lightbox-overlay') as HTMLElement | null;
const track = document.getElementById('carousel-track') as HTMLElement | null;
const dots = document.getElementById('carousel-dots');
const loadingBox = document.getElementById('gallery-loading');
const errorBox = document.getElementById('gallery-error');

const lightboxImage = document.getElementById('lightbox-image') as HTMLImageElement | null;
const lightboxCounter = document.getElementById('lightbox-counter');

const EAGER_THUMBNAIL_COUNT = 2;

let state = {
  images: [] as { url: string; thumbnail: string; alt: string }[],
  currentIndex: 0
};

function setBodyScroll(disable: boolean) {
  if (!document.body) return;
  document.body.classList.toggle('no-scroll', disable);
}

function getVisibleDotRange(currentIndex: number, totalImages: number): { start: number; end: number } {
  const windowSize = 5;

  if (totalImages <= windowSize) {
    return { start: 0, end: totalImages - 1 };
  }

  // First 3 images: show first 5 dots
  if (currentIndex < 3) {
    return { start: 0, end: windowSize - 1 };
  }

  // Last 3 images: show last 5 dots
  if (currentIndex >= totalImages - 3) {
    return { start: totalImages - windowSize, end: totalImages - 1 };
  }

  // Middle images: show windowed dots (current in center)
  return { start: currentIndex - 2, end: currentIndex + 2 };
}

function renderWindowedDots() {
  if (!dots) return;
  const total = state.images.length;
  const range = getVisibleDotRange(state.currentIndex, total);

  dots.innerHTML = '';

  for (let i = range.start; i <= range.end; i++) {
    const dot = document.createElement('button');
    dot.className = 'carousel-dot';
    dot.dataset.realIndex = String(i);
    dot.classList.toggle('active', i === state.currentIndex);
    dot.setAttribute('aria-label', `Bild ${i + 1} von ${total}`);
    dot.addEventListener('click', () => setActiveIndex(i));
    dots.appendChild(dot);
  }
}

function highlightActive(index: number) {
  if (!track || !dots) return;
  const items = Array.from(track.querySelectorAll('.carousel-item')) as HTMLElement[];
  items.forEach((item, itemIndex) => {
    item.classList.toggle('center', itemIndex === index);
  });

  // Update windowed dots
  renderWindowedDots();
}

function scrollToItem(index: number, smooth = true) {
  if (!track) return;
  const target = track.querySelector(`[data-index="${index}"]`) as HTMLElement | null;
  if (!target) return;
  const offset = target.offsetLeft - track.offsetLeft;
  track.scrollTo({ left: offset, behavior: smooth ? 'smooth' : 'auto' });
}

function setActiveIndex(next: number, smooth = true) {
  const total = state.images.length;
  if (!total) return;
  const normalized = ((next % total) + total) % total;
  state.currentIndex = normalized;
  highlightActive(normalized);
  scrollToItem(normalized, smooth);
}

function renderCarousel() {
  if (!track || !dots) return;
  track.innerHTML = '';
  dots.innerHTML = '';
  state.images.forEach((img, index) => {
    const item = document.createElement('button');
    item.className = 'carousel-item';
    item.dataset.index = String(index);
    const loading = index < EAGER_THUMBNAIL_COUNT ? 'eager' : 'lazy';
    item.innerHTML = `<img src="${img.thumbnail}" alt="${img.alt}" loading="${loading}" />`;
    // Lightbox disabled - click does nothing
    // item.addEventListener('click', () => openLightbox(index));
    track.appendChild(item);
  });

  // Render windowed dots initially
  renderWindowedDots();
  highlightActive(state.currentIndex);
  scrollToItem(state.currentIndex, false);
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

function goTo(next: number) {
  setActiveIndex(next);
  if (overlay?.classList.contains('active')) {
    updateLightboxDisplay();
  }
}

async function loadImages() {
  loadingBox?.classList.remove('is-hidden');

  try {
    // Try to load prerendered images from build time
    const dataElement = document.getElementById('gallery-data');
    if (dataElement?.textContent) {
      const parsed = JSON.parse(dataElement.textContent);
      if (Array.isArray(parsed) && parsed.length > 0) {
        state.images = parsed;
        console.info('[gallery] Loaded', state.images.length, 'prerendered images');
        renderCarousel();
        schedulePreload();
        loadingBox?.classList.add('is-hidden');
        return;
      }
    }

    // Fallback: Try API fetch (for local dev)
    const apiKey = import.meta.env.PUBLIC_DRIVE_API_KEY;
    const folderId = import.meta.env.PUBLIC_GALLERY_FOLDER_ID;

    if (apiKey && folderId) {
      console.warn('[gallery] No prerendered data, falling back to API fetch');
      const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType+contains+'image/'and+trashed=false&fields=files(id,name,thumbnailLink,webContentLink)&supportsAllDrives=true&key=${apiKey}`;

      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`Drive request failed: ${res.status}`);
      }

      const data = await res.json();

      state.images = (data.files || []).map((file: any) => {
        const fileId = file.id;
        return {
          url: `https://drive.google.com/uc?export=view&id=${fileId}`,
          thumbnail: `https://drive.google.com/thumbnail?id=${fileId}&sz=w600`,
          alt: file.name || 'Galeriebild'
        };
      }).filter((img: { url?: string; thumbnail?: string }) => Boolean(img.url && img.thumbnail));
    }

    // Final fallback: static JSON
    if (!state.images.length) {
      const fallback = await fetch('/data/gallery.json');
      state.images = await fallback.json();
    }
    renderCarousel();
    schedulePreload();
  } catch (error) {
    console.warn('[gallery] Error loading images:', error);
    errorBox?.classList.remove('is-hidden');
    try {
      const fallback = await fetch('/data/gallery.json');
      state.images = await fallback.json();
      renderCarousel();
      schedulePreload();
    } catch (fallbackError) {
      console.error('[gallery] Fallback also failed:', fallbackError);
    }
  } finally {
    loadingBox?.classList.add('is-hidden');
  }
}

function bindControls() {
  document.querySelector('.carousel-nav-prev')?.addEventListener('click', () => goTo(state.currentIndex - 1));
  document.querySelector('.carousel-nav-next')?.addEventListener('click', () => goTo(state.currentIndex + 1));
  document.getElementById('lightbox-close')?.addEventListener('click', closeLightbox);
  document.getElementById('lightbox-prev')?.addEventListener('click', () => goTo(state.currentIndex - 1));
  document.getElementById('lightbox-next')?.addEventListener('click', () => goTo(state.currentIndex + 1));
  overlay?.addEventListener('click', (event) => {
    if (event.target === overlay) closeLightbox();
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeLightbox();
  });

  track?.addEventListener('scroll', () => {
    if (!track) return;
    const items = Array.from(track.querySelectorAll('.carousel-item')) as HTMLElement[];
    if (!items.length) return;
    const center = track.scrollLeft + track.clientWidth / 2;
    const nearestIndex = items.reduce((bestIndex, item, currentIndex) => {
      const itemCenter = item.offsetLeft + item.clientWidth / 2;
      const bestItem = items[bestIndex];
      const bestCenter = bestItem.offsetLeft + bestItem.clientWidth / 2;
      return Math.abs(itemCenter - center) < Math.abs(bestCenter - center) ? currentIndex : bestIndex;
    }, 0);

    if (nearestIndex !== state.currentIndex) {
      state.currentIndex = nearestIndex;
      highlightActive(nearestIndex);
    }
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', async () => {
    bindControls();
    await loadImages();
  });
}
