const overlay = document.getElementById('lightbox-overlay') as HTMLElement | null;
const track = document.getElementById('carousel-track') as HTMLElement | null;

const lightboxImage = document.getElementById('lightbox-image') as HTMLImageElement | null;
const lightboxCounter = document.getElementById('lightbox-counter');

const EAGER_THUMBNAIL_COUNT = 2;
const AUTO_SCROLL_SPEED = 0.5; // pixels per frame

let state = {
  images: [] as { url: string; thumbnail: string; alt: string }[],
  currentIndex: 0
};

let scrollPosition = 0;
let animationFrameId: number | null = null;

function setBodyScroll(disable: boolean) {
  if (!document.body) return;
  document.body.classList.toggle('no-scroll', disable);
}

function autoScroll() {
  if (!track) return;

  scrollPosition += AUTO_SCROLL_SPEED;

  // Get total width of all items including gaps
  const trackWidth = track.scrollWidth;
  const containerWidth = track.clientWidth;

  // Reset scroll when reaching the end (seamless loop)
  if (scrollPosition >= trackWidth / 2) {
    scrollPosition = 0;
  }

  track.scrollLeft = scrollPosition;

  animationFrameId = requestAnimationFrame(autoScroll);
}

function startAutoScroll() {
  if (animationFrameId) return;
  autoScroll();
}

function stopAutoScroll() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

function renderCarousel() {
  if (!track) return;
  track.innerHTML = '';

  // Duplicate images for seamless infinite scroll
  const duplicatedImages = [...state.images, ...state.images];

  duplicatedImages.forEach((img, index) => {
    const item = document.createElement('div');
    item.className = 'carousel-item';
    item.dataset.index = String(index);
    const loading = index < EAGER_THUMBNAIL_COUNT ? 'eager' : 'lazy';
    item.innerHTML = `<img src="${img.thumbnail}" alt="${img.alt}" loading="${loading}" />`;
    track.appendChild(item);
  });

  // Start auto-scroll after images are loaded
  setTimeout(() => {
    startAutoScroll();
  }, 500);
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
    renderCarousel();
    schedulePreload();
  } catch {
    const fallback = await fetch('/data/gallery.json');
    state.images = await fallback.json();
    renderCarousel();
    schedulePreload();
  }
}

function bindControls() {
  document.getElementById('lightbox-close')?.addEventListener('click', closeLightbox);
  overlay?.addEventListener('click', (event) => {
    if (event.target === overlay) closeLightbox();
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeLightbox();
  });

  // Pause auto-scroll on hover (optional)
  track?.addEventListener('mouseenter', () => {
    stopAutoScroll();
  });

  track?.addEventListener('mouseleave', () => {
    startAutoScroll();
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', async () => {
    bindControls();
    await loadImages();
  });
}
