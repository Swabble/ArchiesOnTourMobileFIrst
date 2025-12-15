const overlay = document.getElementById('lightbox-overlay');
const track = document.getElementById('carousel-track');
const dots = document.getElementById('carousel-dots');
const lightboxImage = document.getElementById('lightbox-image');
const lightboxCounter = document.getElementById('lightbox-counter');
const EAGER_THUMBNAIL_COUNT = 2;
let state = {
    images: [],
    currentIndex: 0
};
function setBodyScroll(disable) {
    if (!document.body)
        return;
    document.body.classList.toggle('no-scroll', disable);
}
function getVisibleDotRange(currentIndex, totalImages) {
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
    if (!dots)
        return;
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
function highlightActive(index) {
    if (!track || !dots)
        return;
    const items = Array.from(track.querySelectorAll('.carousel-item'));
    items.forEach((item, itemIndex) => {
        item.classList.toggle('center', itemIndex === index);
    });
    // Update windowed dots
    renderWindowedDots();
}
function scrollToItem(index, smooth = true) {
    if (!track)
        return;
    const target = track.querySelector(`[data-index="${index}"]`);
    if (!target)
        return;
    const offset = target.offsetLeft - track.offsetLeft;
    track.scrollTo({ left: offset, behavior: smooth ? 'smooth' : 'auto' });
}
function setActiveIndex(next, smooth = true) {
    const total = state.images.length;
    if (!total)
        return;
    const normalized = ((next % total) + total) % total;
    state.currentIndex = normalized;
    highlightActive(normalized);
    scrollToItem(normalized, smooth);
}
function renderCarousel() {
    if (!track || !dots)
        return;
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
function preloadSequential(urls) {
    let index = 0;
    const loadNext = () => {
        if (index >= urls.length)
            return;
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
    if (!state.images.length)
        return;
    const startPreload = () => {
        const remainingThumbnails = state.images
            .slice(EAGER_THUMBNAIL_COUNT)
            .map((image) => image.thumbnail);
        const fullImages = state.images.map((image) => image.url);
        preloadSequential([...remainingThumbnails, ...fullImages]);
    };
    const requestIdle = window.requestIdleCallback;
    if (typeof requestIdle === 'function') {
        requestIdle(startPreload);
    }
    else {
        setTimeout(startPreload, 0);
    }
}
function updateLightboxDisplay() {
    if (!overlay || !lightboxImage || !lightboxCounter)
        return;
    if (!overlay.classList.contains('active'))
        return;
    const image = state.images[state.currentIndex];
    if (!image)
        return;
    lightboxImage.src = image.url;
    lightboxImage.alt = image.alt;
    lightboxCounter.textContent = `${state.currentIndex + 1} / ${state.images.length}`;
}
function openLightbox(index) {
    if (!overlay || !lightboxImage || !lightboxCounter)
        return;
    state.currentIndex = index;
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    updateLightboxDisplay();
    setBodyScroll(true);
}
function closeLightbox() {
    overlay === null || overlay === void 0 ? void 0 : overlay.classList.remove('active');
    overlay === null || overlay === void 0 ? void 0 : overlay.setAttribute('aria-hidden', 'true');
    setBodyScroll(false);
}
function goTo(next) {
    setActiveIndex(next);
    if (overlay === null || overlay === void 0 ? void 0 : overlay.classList.contains('active')) {
        updateLightboxDisplay();
    }
}
async function loadImages() {
    try {
        const staticRes = await fetch('/data/gallery.json');
        const staticPayload = await staticRes.json();
        const staticItems = Array.isArray(staticPayload === null || staticPayload === void 0 ? void 0 : staticPayload.items)
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
    }
    catch {
        const fallback = await fetch('/data/gallery.json');
        state.images = await fallback.json();
        renderCarousel();
        schedulePreload();
    }
}
function bindControls() {
    var _a, _b, _c, _d, _e;
    (_a = document.querySelector('.carousel-nav-prev')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => goTo(state.currentIndex - 1));
    (_b = document.querySelector('.carousel-nav-next')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', () => goTo(state.currentIndex + 1));
    (_c = document.getElementById('lightbox-close')) === null || _c === void 0 ? void 0 : _c.addEventListener('click', closeLightbox);
    (_d = document.getElementById('lightbox-prev')) === null || _d === void 0 ? void 0 : _d.addEventListener('click', () => goTo(state.currentIndex - 1));
    (_e = document.getElementById('lightbox-next')) === null || _e === void 0 ? void 0 : _e.addEventListener('click', () => goTo(state.currentIndex + 1));
    overlay === null || overlay === void 0 ? void 0 : overlay.addEventListener('click', (event) => {
        if (event.target === overlay)
            closeLightbox();
    });
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape')
            closeLightbox();
    });
    track === null || track === void 0 ? void 0 : track.addEventListener('scroll', () => {
        if (!track)
            return;
        const items = Array.from(track.querySelectorAll('.carousel-item'));
        if (!items.length)
            return;
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
