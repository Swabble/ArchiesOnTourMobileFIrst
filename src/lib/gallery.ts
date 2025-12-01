type GalleryImage = {
  url: string;
  thumbnail?: string;
  alt?: string;
};

type GalleryState = {
  images: GalleryImage[];
  currentIndex: number;
  lightboxIndex: number;
};

const state: GalleryState = {
  images: [],
  currentIndex: 0,
  lightboxIndex: -1,
};

async function fetchDriveImages(): Promise<GalleryImage[]> {
  const folderId = import.meta.env.PUBLIC_GALLERY_FOLDER_ID;
  const apiKey = import.meta.env.PUBLIC_DRIVE_API_KEY;
  if (!folderId || !apiKey) throw new Error('Drive nicht konfiguriert');
  const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType+contains+'image/'and+trashed=false&fields=files(id,name,thumbnailLink,webContentLink)&supportsAllDrives=true&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Drive Anfrage fehlgeschlagen');
  const data = await res.json();
  return (data.files || []).map((file: any) => {
    const fullImage = file.thumbnailLink
      ? `${file.thumbnailLink.replace(/=s\d+-c/, '')}=s1600`
      : file.webContentLink;
    return {
      url: fullImage || file.webContentLink,
      thumbnail: `${file.thumbnailLink ?? file.webContentLink}?sz=w400`,
      alt: file.name,
    };
  });
}

async function loadFallback(): Promise<GalleryImage[]> {
  const res = await fetch('/data/gallery.json');
  const json = await res.json();
  return json;
}

function setStatus(loading: boolean, error = false) {
  const loadingEl = document.getElementById('gallery-loading');
  const errorEl = document.getElementById('gallery-error');
  loadingEl?.classList.toggle('is-hidden', !loading);
  errorEl?.classList.toggle('is-hidden', !error);
}

function renderCarousel() {
  const track = document.getElementById('carousel-track');
  const dots = document.getElementById('carousel-dots');
  if (!track || !dots) return;
  track.innerHTML = '';
  dots.innerHTML = '';
  state.images.forEach((image, index) => {
    const item = document.createElement('div');
    item.className = `carousel-item ${index === state.currentIndex ? 'center' : ''}`;
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.src = image.thumbnail || image.url;
    img.alt = image.alt ?? '';
    item.append(img);
    item.addEventListener('click', () => openLightbox(index));
    track.append(item);

    const dot = document.createElement('button');
    dot.className = `carousel-dot ${index === state.currentIndex ? 'active' : ''}`;
    dot.setAttribute('aria-label', `Bild ${index + 1} von ${state.images.length}`);
    dot.addEventListener('click', () => goToSlide(index));
    dots.append(dot);
  });
  const offset = state.currentIndex * -100;
  (track as HTMLElement).style.transform = `translateX(${offset}%)`;
}

function goToSlide(index: number) {
  state.currentIndex = (index + state.images.length) % state.images.length;
  renderCarousel();
}

function goToNextSlide() {
  goToSlide(state.currentIndex + 1);
}

function goToPrevSlide() {
  goToSlide(state.currentIndex - 1);
}

function openLightbox(index: number) {
  state.lightboxIndex = index;
  const overlay = document.getElementById('lightbox-overlay');
  const image = document.getElementById('lightbox-image') as HTMLImageElement | null;
  const caption = document.getElementById('lightbox-caption');
  const counter = document.getElementById('lightbox-counter');
  if (!overlay || !image || !caption || !counter) return;
  const current = state.images[index];
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');
  image.src = current.url;
  image.alt = current.alt ?? '';
  caption.textContent = current.alt ?? 'Foodtruck Impression';
  counter.textContent = `${index + 1} / ${state.images.length}`;
}

function closeLightbox() {
  const overlay = document.getElementById('lightbox-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('no-scroll');
  state.lightboxIndex = -1;
}

function initLightboxControls() {
  const overlay = document.getElementById('lightbox-overlay');
  const closeBtn = overlay?.querySelector('.lightbox-close');
  const prevBtn = overlay?.querySelector('.lightbox-nav.prev');
  const nextBtn = overlay?.querySelector('.lightbox-nav.next');

  overlay?.addEventListener('click', (event) => {
    if (event.target === overlay) closeLightbox();
  });
  closeBtn?.addEventListener('click', closeLightbox);
  prevBtn?.addEventListener('click', () => goLightbox(-1));
  nextBtn?.addEventListener('click', () => goLightbox(1));
  document.addEventListener('keydown', (event) => {
    if (state.lightboxIndex < 0) return;
    if (event.key === 'Escape') closeLightbox();
    if (event.key === 'ArrowRight') goLightbox(1);
    if (event.key === 'ArrowLeft') goLightbox(-1);
  });
}

function goLightbox(delta: number) {
  const nextIndex = (state.lightboxIndex + delta + state.images.length) % state.images.length;
  openLightbox(nextIndex);
}

async function loadImages() {
  setStatus(true, false);
  try {
    const driveImages = await fetchDriveImages();
    state.images = driveImages;
  } catch (error) {
    console.warn('Drive Bilder nicht geladen', error);
    state.images = await loadFallback();
    setStatus(false, true);
    return;
  }
  setStatus(false, false);
}

export async function initGallery() {
  await loadImages();
  renderCarousel();
  initLightboxControls();
  document.querySelector('.carousel-nav-next')?.addEventListener('click', goToNextSlide);
  document.querySelector('.carousel-nav-prev')?.addEventListener('click', goToPrevSlide);
  window.addEventListener('resize', () => renderCarousel());
}
