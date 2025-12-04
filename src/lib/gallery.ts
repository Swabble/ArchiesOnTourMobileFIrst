import type { } from './menuTypes';

const overlay = document.getElementById('lightbox-overlay') as HTMLElement | null;
const track = document.getElementById('carousel-track') as HTMLElement | null;
const dots = document.getElementById('carousel-dots');
const loadingBox = document.getElementById('gallery-loading');
const errorBox = document.getElementById('gallery-error');

const lightboxImage = document.getElementById('lightbox-image') as HTMLImageElement | null;
const lightboxCaption = document.getElementById('lightbox-caption');
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

function highlightActive(index: number) {
  if (!track || !dots) return;
  const items = Array.from(track.querySelectorAll('.carousel-item')) as HTMLElement[];
  items.forEach((item, itemIndex) => {
    item.classList.toggle('center', itemIndex === index);
  });
  Array.from(dots.children).forEach((dot, dotIndex) => {
    dot.classList.toggle('active', dotIndex === index);
  });
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
    item.addEventListener('click', () => openLightbox(index));
    track.appendChild(item);

    const dot = document.createElement('button');
    dot.className = 'carousel-dot';
    dot.setAttribute('aria-label', `Bild ${index + 1} von ${state.images.length}`);
    dot.addEventListener('click', () => setActiveIndex(index));
    dots.appendChild(dot);
  });

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

function openLightbox(index: number) {
  if (!overlay || !lightboxImage || !lightboxCaption || !lightboxCounter) return;
  state.currentIndex = index;
  const image = state.images[index];
  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden', 'false');
  lightboxImage.src = image.url;
  lightboxImage.alt = image.alt;
  lightboxCaption.textContent = image.alt;
  lightboxCounter.textContent = `${index + 1} / ${state.images.length}`;
  setBodyScroll(true);
}

function closeLightbox() {
  overlay?.classList.remove('active');
  overlay?.setAttribute('aria-hidden', 'true');
  setBodyScroll(false);
}

function goTo(next: number) {
  setActiveIndex(next);
}

async function loadImages() {
  loadingBox?.classList.remove('is-hidden');

  try {
    const apiKey = import.meta.env.PUBLIC_DRIVE_API_KEY;
    const folderId = import.meta.env.PUBLIC_GALLERY_FOLDER_ID;

    if (apiKey && folderId) {
      const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType+contains+'image/'and+trashed=false&fields=files(id,name,thumbnailLink,webContentLink)&supportsAllDrives=true&key=${apiKey}`;

      const res = await fetch(url);

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Drive request failed: ${res.status}`);
      }

      const data = await res.json();

      state.images = (data.files || []).map((file: any) => {
        const fileId = file.id;

        // Use Google Drive's public image URLs
        // These work for files in a publicly shared folder
        const url = `https://drive.google.com/uc?export=view&id=${fileId}`;
        const thumbUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w600`;

        return {
          url,
          thumbnail: thumbUrl,
          alt: file.name || 'Galeriebild'
        };
      }).filter((img: { url?: string; thumbnail?: string }) => Boolean(img.url && img.thumbnail));
    }

    if (!state.images.length) {
      const fallback = await fetch('/data/gallery.json');
      state.images = await fallback.json();
    }
    renderCarousel();
    schedulePreload();
  } catch (error) {
    errorBox?.classList.remove('is-hidden');
    const fallback = await fetch('/data/gallery.json');
    state.images = await fallback.json();
    renderCarousel();
    schedulePreload();
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
