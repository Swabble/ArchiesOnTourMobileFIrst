import { resolvePublicPath } from './publicPath';

const overlay = document.getElementById('lightbox-overlay') as HTMLElement | null;
const track = document.getElementById('carousel-track') as HTMLElement | null;

const lightboxImage = document.getElementById('lightbox-image') as HTMLImageElement | null;
const lightboxCounter = document.getElementById('lightbox-counter');

const EAGER_THUMBNAIL_COUNT = 4; // Load first 4 thumbnails immediately
const AUTO_SCROLL_SPEED = 0.5; // pixels per frame
const INITIAL_LOAD_DELAY = 100; // Small delay to prioritize animation

let state = {
  images: [] as { url: string; thumbnail: string; alt: string }[],
  currentIndex: 0,
  autoplayInterval: null as ReturnType<typeof setInterval> | null,
  isAutoplayPaused: false
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

  // Get total width of one set of images
  const firstItem = track.querySelector('.carousel-item') as HTMLElement;
  if (!firstItem) return;

  const itemWidth = firstItem.offsetWidth;
  const gap = parseInt(getComputedStyle(track).gap) || 0;
  const totalItemWidth = itemWidth + gap;
  const imageCount = state.images.length;
  const oneSetWidth = totalItemWidth * imageCount;

  // Reset position for seamless loop (we have 3 copies, so reset after 1 set)
  if (scrollPosition >= oneSetWidth) {
    scrollPosition = 0;
  }

  track.style.transform = `translateX(-${scrollPosition}px)`;

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

  // Triple images for seamless infinite scroll
  const duplicatedImages = [...state.images, ...state.images, ...state.images];

  duplicatedImages.forEach((img, index) => {
    const item = document.createElement('div');
    item.className = 'carousel-item';
    item.dataset.index = String(index);

    // Only load first 4 eagerly, rest use native lazy loading
    const loading = index < EAGER_THUMBNAIL_COUNT ? 'eager' : 'lazy';

    // Add fetchpriority for first few images
    const fetchPriority = index < EAGER_THUMBNAIL_COUNT ? 'fetchpriority="high"' : '';

    item.innerHTML = `<img src="${img.thumbnail}" alt="${img.alt}" loading="${loading}" ${fetchPriority} />`;
    track.appendChild(item);
  });

  // Start auto-scroll after first images are loaded
  setTimeout(() => {
    startAutoScroll();
  }, 1000);
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
    // Progressive loading strategy:
    // 1. Remaining thumbnails (after first 4)
    const remainingThumbnails = state.images
      .slice(EAGER_THUMBNAIL_COUNT)
      .map((image) => image.thumbnail);

    // 2. First 4 full-size images (priority for lightbox)
    const priorityFullImages = state.images
      .slice(0, EAGER_THUMBNAIL_COUNT)
      .map((image) => image.url);

    // 3. Remaining full-size images
    const remainingFullImages = state.images
      .slice(EAGER_THUMBNAIL_COUNT)
      .map((image) => image.url);

    // Load in stages: thumbnails first, then priority full images, then rest
    preloadSequential([
      ...remainingThumbnails,
      ...priorityFullImages,
      ...remainingFullImages
    ]);
  };

  // Use requestIdleCallback to not interfere with critical rendering
  const requestIdle = (window as typeof window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
  if (typeof requestIdle === 'function') {
    requestIdle(startPreload);
  } else {
    // Fallback with longer delay to ensure animation starts smoothly
    setTimeout(startPreload, 500);
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

function goTo(index: number) {
  const wrappedIndex = ((index % state.images.length) + state.images.length) % state.images.length;
  state.currentIndex = wrappedIndex;
  updateLightboxDisplay();
}

function startAutoplay() {
  if (state.autoplayInterval !== null) return;
  if (state.isAutoplayPaused) return;

  state.autoplayInterval = setInterval(() => {
    if (!state.isAutoplayPaused) {
      goTo(state.currentIndex + 1);
    }
  }, 4000); // Auto-advance every 4 seconds
}

function pauseAutoplay() {
  state.isAutoplayPaused = true;
  if (state.autoplayInterval !== null) {
    clearInterval(state.autoplayInterval);
    state.autoplayInterval = null;
  }
}

function resumeAutoplayAfterDelay() {
  pauseAutoplay();
  setTimeout(() => {
    state.isAutoplayPaused = false;
    startAutoplay();
  }, 8000); // Resume after 8 seconds of inactivity
}

async function loadImages() {
  const galleryDataUrl = resolvePublicPath('data/gallery.json');
  try {
    const staticRes = await fetch(galleryDataUrl, { priority: 'low' } as RequestInit);
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
    const fallback = await fetch(galleryDataUrl, { priority: 'low' } as RequestInit);
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
    if (event.key === 'Escape') {
      closeLightbox();
    } else if (event.key === 'ArrowLeft') {
      goTo(state.currentIndex - 1);
      resumeAutoplayAfterDelay();
    } else if (event.key === 'ArrowRight') {
      goTo(state.currentIndex + 1);
      resumeAutoplayAfterDelay();
    }
  });

  // Pause auto-scroll on hover (optional)
  track?.addEventListener('mouseenter', () => {
    stopAutoScroll();
  });

  track?.addEventListener('mouseleave', () => {
    startAutoScroll();
  });

  // Pause autoplay when hovering over carousel
  const carouselContainer = document.querySelector('.carousel-container');
  carouselContainer?.addEventListener('mouseenter', () => pauseAutoplay());
  carouselContainer?.addEventListener('mouseleave', () => {
    state.isAutoplayPaused = false;
    startAutoplay();
  });
}

if (typeof window !== 'undefined') {
  // Delay gallery initialization to prioritize animation
  window.addEventListener('DOMContentLoaded', () => {
    // Bind controls immediately for interactivity
    bindControls();

    // Use Intersection Observer to only load gallery when it's near viewport
    const gallerySection = document.getElementById('galerie');
    if (!gallerySection) {
      // Fallback: load after delay if section not found
      setTimeout(async () => {
        await loadImages();
        startAutoplay();
      }, INITIAL_LOAD_DELAY);
      return;
    }

    // Check if IntersectionObserver is supported
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              // Gallery is visible or near viewport, start loading
              observer.disconnect();
              setTimeout(async () => {
                await loadImages();
                startAutoplay();
              }, INITIAL_LOAD_DELAY);
            }
          });
        },
        {
          // Start loading when gallery is 200px before entering viewport
          rootMargin: '200px'
        }
      );

      observer.observe(gallerySection);
    } else {
      // Fallback for browsers without IntersectionObserver
      setTimeout(async () => {
        await loadImages();
        startAutoplay();
      }, INITIAL_LOAD_DELAY);
    }
  });
}
