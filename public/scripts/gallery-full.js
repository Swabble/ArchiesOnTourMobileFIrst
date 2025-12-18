// Full gallery page with grid layout
const LOG_PREFIX = '[gallery-full]';

const overlay = document.getElementById('lightbox-overlay');
const galleryGrid = document.getElementById('gallery-grid');
const lightboxImage = document.getElementById('lightbox-image');
const lightboxCounter = document.getElementById('lightbox-counter');
const loadingMessage = document.getElementById('gallery-loading');
const errorMessage = document.getElementById('gallery-error');

function resolvePublicPath(relativePath) {
  const trimmed = relativePath.replace(/^\/+/, '');
  try {
    return new URL(trimmed, window.location.href).toString();
  } catch (error) {
    console.warn('Could not resolve path relative to current document, fallback to base URL', error);
  }
  return `/${trimmed}`;
}

let state = {
  images: [],
  currentIndex: 0
};

function setBodyScroll(disable) {
  if (!document.body) return;
  document.body.classList.toggle('no-scroll', disable);
}

function renderGrid() {
  if (!galleryGrid) return;

  galleryGrid.innerHTML = '';
  loadingMessage?.classList.add('is-hidden');

  console.info(LOG_PREFIX, `Rendering ${state.images.length} images in grid`);

  if (!state.images.length) {
    const empty = document.createElement('p');
    empty.className = 'gallery-empty';
    empty.textContent = 'Keine Bilder gefunden.';
    galleryGrid.appendChild(empty);
    return;
  }

  state.images.forEach((img, index) => {
    const item = document.createElement('article');
    item.className = 'gallery-item';
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.dataset.index = String(index);

    const loading = index < 6 ? 'eager' : 'lazy';
    const imgElement = document.createElement('img');
    imgElement.src = img.thumbnail;
    imgElement.alt = img.alt || `Galerie Bild ${index + 1}`;
    imgElement.loading = loading;

    item.appendChild(imgElement);

    // Open lightbox on click
    item.addEventListener('click', () => openLightbox(index));
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLightbox(index);
      }
    });

    galleryGrid.appendChild(item);
  });
}

function updateLightboxDisplay() {
  if (!overlay || !lightboxImage || !lightboxCounter) return;
  if (!overlay.classList.contains('active')) return;

  const image = state.images[state.currentIndex];
  if (!image) return;

  lightboxImage.src = image.url;
  lightboxImage.alt = image.alt || `Galerie Bild ${state.currentIndex + 1}`;
  lightboxCounter.textContent = `${state.currentIndex + 1} / ${state.images.length}`;
}

function openLightbox(index) {
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

function navigateLightbox(direction) {
  const newIndex = state.currentIndex + direction;

  // Loop around
  if (newIndex < 0) {
    state.currentIndex = state.images.length - 1;
  } else if (newIndex >= state.images.length) {
    state.currentIndex = 0;
  } else {
    state.currentIndex = newIndex;
  }

  updateLightboxDisplay();
}

async function loadImages() {
  const galleryDataUrl = '/data/gallery.json';

  try {
    console.info(LOG_PREFIX, 'Fetching gallery images from', galleryDataUrl);
    const res = await fetch(galleryDataUrl);
    const payload = await res.json();

    const items = Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload)
        ? payload
        : [];

    if (!items.length) {
      throw new Error('No gallery data found');
    }

    loadingMessage?.classList.add('is-hidden');
    state.images = items;
    renderGrid();
  } catch (error) {
    console.error(LOG_PREFIX, 'Error loading gallery:', error);
    // Second fetch attempt
    try {
      const fallback = await fetch(galleryDataUrl);
      const fallbackPayload = await fallback.json();
      const fallbackItems = Array.isArray(fallbackPayload?.items)
        ? fallbackPayload.items
        : Array.isArray(fallbackPayload)
          ? fallbackPayload
          : [];

      loadingMessage?.classList.add('is-hidden');
      if (fallbackItems.length) {
        state.images = fallbackItems;
        renderGrid();
      } else {
        errorMessage?.classList.remove('is-hidden');
      }
    } catch {
      loadingMessage?.classList.add('is-hidden');
      errorMessage?.classList.remove('is-hidden');
    }
  }
}

function bindControls() {
  // Close lightbox
  document.getElementById('lightbox-close')?.addEventListener('click', closeLightbox);

  // Close on overlay click
  overlay?.addEventListener('click', (event) => {
    if (event.target === overlay) closeLightbox();
  });

  // Navigation
  document.getElementById('lightbox-prev')?.addEventListener('click', () => {
    navigateLightbox(-1);
  });

  document.getElementById('lightbox-next')?.addEventListener('click', () => {
    navigateLightbox(1);
  });

  // Keyboard controls
  window.addEventListener('keydown', (event) => {
    if (!overlay?.classList.contains('active')) return;

    switch (event.key) {
      case 'Escape':
        closeLightbox();
        break;
      case 'ArrowLeft':
        navigateLightbox(-1);
        break;
      case 'ArrowRight':
        navigateLightbox(1);
        break;
    }
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', async () => {
    bindControls();
    await loadImages();
  });
}
