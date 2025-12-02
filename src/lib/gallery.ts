import type { } from './menuTypes';

const overlay = document.getElementById('lightbox-overlay') as HTMLElement | null;
const track = document.getElementById('carousel-track') as HTMLElement | null;
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
    item.innerHTML = `<img src="${img.thumbnail}" alt="${img.alt}" loading="lazy" />`;
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
  const debugBox = document.getElementById('gallery-debug');

  try {
    const apiKey = import.meta.env.PUBLIC_DRIVE_API_KEY;
    const folderId = import.meta.env.PUBLIC_GALLERY_FOLDER_ID;

    console.log('[GALLERY DEBUG] API Key:', apiKey ? 'Present ✓' : 'Missing ✗');
    console.log('[GALLERY DEBUG] Folder ID:', folderId ? 'Present ✓' : 'Missing ✗');

    if (debugBox) {
      debugBox.innerHTML = `
        <strong>Gallery Debug Info:</strong><br>
        API Key: ${apiKey ? '✓ Configured' : '✗ Missing'}<br>
        Folder ID: ${folderId || '✗ Missing'}<br>
      `;
    }

    if (apiKey && folderId) {
      const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType+contains+'image/'and+trashed=false&fields=files(id,name,thumbnailLink,webContentLink)&supportsAllDrives=true&key=${apiKey}`;
      console.log('[GALLERY DEBUG] Fetching from Drive API...');

      const res = await fetch(url);
      console.log('[GALLERY DEBUG] Response status:', res.status);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[GALLERY DEBUG] Drive API error:', errorText);
        if (debugBox) {
          debugBox.innerHTML += `Status: ${res.status} - ${res.statusText}<br>Error: ${errorText.substring(0, 200)}<br>`;
        }
        throw new Error(`Drive request failed: ${res.status}`);
      }

      const data = await res.json();
      console.log('[GALLERY DEBUG] Files found:', data.files?.length || 0);
      console.log('[GALLERY DEBUG] Files:', data.files);

      if (debugBox) {
        debugBox.innerHTML += `Status: ${res.status} OK<br>Files found: ${data.files?.length || 0}<br>`;
      }

      state.images = (data.files || []).map((file: any) => {
        const thumbnailLink = file.thumbnailLink;
        const webContentLink = file.webContentLink;
        console.log('[GALLERY DEBUG] Processing file:', file.name);
        console.log('[GALLERY DEBUG] - thumbnailLink:', thumbnailLink);
        console.log('[GALLERY DEBUG] - webContentLink:', webContentLink);

        // Better URL handling with fallback
        let url = webContentLink;
        let thumbUrl = webContentLink;

        if (thumbnailLink) {
          const baseUrl = thumbnailLink.split('=')[0];
          url = `${baseUrl}=s1600`;
          thumbUrl = `${baseUrl}=s600`;
        } else if (webContentLink) {
          // If no thumbnailLink, try to construct from webContentLink
          // Google Drive direct links format: https://drive.google.com/uc?id=FILE_ID
          const fileId = file.id;
          url = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
          thumbUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w600`;
        }

        console.log('[GALLERY DEBUG] - Final URL:', url);
        console.log('[GALLERY DEBUG] - Final Thumbnail:', thumbUrl);

        return {
          url,
          thumbnail: thumbUrl,
          alt: file.name || 'Galeriebild'
        };
      });

      if (debugBox && state.images.length > 0) {
        debugBox.innerHTML += `<br><strong>Sample URLs:</strong><br>${state.images[0].thumbnail}<br>`;
      }
    }

    if (!state.images.length) {
      console.log('[GALLERY DEBUG] No images from API, using fallback');
      if (debugBox) {
        debugBox.innerHTML += 'Using fallback images from /data/gallery.json<br>';
      }
      const fallback = await fetch('/data/gallery.json');
      state.images = await fallback.json();
    }
    renderCarousel();
  } catch (error) {
    console.error('[GALLERY DEBUG] Error:', error);
    errorBox?.classList.remove('is-hidden');
    const debugBox = document.getElementById('gallery-debug');
    if (debugBox) {
      debugBox.innerHTML += `<br><strong>Error:</strong> ${(error as Error).message}<br>Using fallback images.<br>`;
    }
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
