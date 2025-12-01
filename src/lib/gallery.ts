import type { } from './menuTypes';

const overlay = document.getElementById('lightbox-overlay') as HTMLElement | null;
const track = document.getElementById('carousel-track');
const dots = document.getElementById('carousel-dots');
const loadingBox = document.getElementById('gallery-loading');
const errorBox = document.getElementById('gallery-error');

const lightboxImage = document.getElementById('lightbox-image') as HTMLImageElement | null;
const lightboxCaption = document.getElementById('lightbox-caption');
const lightboxCounter = document.getElementById('lightbox-counter');

let state = {
  images: [] as { url: string; thumbnail: string; alt: string }[],
  currentIndex: 0
};

function setBodyScroll(disable: boolean) {
  if (!document.body) return;
  document.body.classList.toggle('no-scroll', disable);
}

function renderCarousel() {
  if (!track || !dots) return;
  track.innerHTML = '';
  dots.innerHTML = '';
  state.images.forEach((img, index) => {
    const item = document.createElement('button');
    item.className = 'carousel-item';
    if (index === state.currentIndex) item.classList.add('center');
    item.innerHTML = `<img src="${img.thumbnail}" alt="${img.alt}" loading="lazy" />`;
    item.addEventListener('click', () => openLightbox(index));
    track.appendChild(item);

    const dot = document.createElement('button');
    dot.className = 'carousel-dot' + (index === state.currentIndex ? ' active' : '');
    dot.setAttribute('aria-label', `Bild ${index + 1} von ${state.images.length}`);
    dot.addEventListener('click', () => goTo(index));
    dots.appendChild(dot);
  });
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
  const total = state.images.length;
  state.currentIndex = (next + total) % total;
  renderCarousel();
}

async function loadImages() {
  loadingBox?.classList.remove('is-hidden');
  try {
    const apiKey = import.meta.env.PUBLIC_DRIVE_API_KEY;
    const folderId = import.meta.env.PUBLIC_GALLERY_FOLDER_ID;
    if (apiKey && folderId) {
      const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType+contains+'image/'and+trashed=false&fields=files(id,name,thumbnailLink,webContentLink)&supportsAllDrives=true&key=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Drive request failed');
      const data = await res.json();
      state.images = (data.files || []).map((file: any) => ({
        url: `${file.thumbnailLink?.split('=')[0]}=s1600`,
        thumbnail: `${file.thumbnailLink?.split('=')[0]}=s600`,
        alt: file.name || 'Galeriebild'
      }));
    }

    if (!state.images.length) {
      const fallback = await fetch('/data/gallery.json');
      state.images = await fallback.json();
    }
    renderCarousel();
  } catch (error) {
    console.warn('Gallery fallback', error);
    errorBox?.classList.remove('is-hidden');
    const fallback = await fetch('/data/gallery.json');
    state.images = await fallback.json();
    renderCarousel();
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
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', async () => {
    bindControls();
    await loadImages();
  });
}
