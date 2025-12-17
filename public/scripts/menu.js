// Simple menu script following the working gallery.js pattern
const LOG_PREFIX = '[menu]';

function resolvePublicPath(relativePath) {
  const trimmed = relativePath.replace(/^\/+/, '');
  try {
    return new URL(trimmed, window.location.href).toString();
  } catch (error) {
    console.warn('Konnte Pfad nicht relativ zum aktuellen Dokument auflösen, fallback auf Basis-URL', error);
  }
  return `/${trimmed}`;
}

function formatPrice(price) {
  const numeric = Number(String(price).replace(/[^0-9,.-]/g, '').replace(',', '.'));
  if (Number.isNaN(numeric)) return 'auf Anfrage';
  return `${numeric.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`;
}

function renderMenuItems(items) {
  const container = document.getElementById('menu-categories-container');
  const loading = document.getElementById('menu-loading');
  const error = document.getElementById('menu-error');

  if (!container || !loading || !error) return;

  loading.classList.add('is-hidden');
  error.classList.add('is-hidden');
  container.innerHTML = '';

  console.info(LOG_PREFIX, `Rendering ${items.length} menu items`);

  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'menu-empty';
    empty.textContent = 'Keine Produkte gefunden.';
    container.appendChild(empty);
    return;
  }

  // Group by category
  const grouped = {};
  items.forEach((item) => {
    const categoryName = item.category?.trim() || 'Weitere Highlights';
    if (!grouped[categoryName]) {
      grouped[categoryName] = [];
    }
    grouped[categoryName].push(item);
  });

  // Render each category
  Object.entries(grouped).forEach(([categoryName, categoryItems]) => {
    const categorySection = document.createElement('section');
    categorySection.className = 'menu-category-block';

    const categoryHeader = document.createElement('header');
    categoryHeader.className = 'menu-category-section__header';
    categoryHeader.innerHTML = `<h3>${categoryName}</h3>`;
    categorySection.appendChild(categoryHeader);

    const grid = document.createElement('div');
    grid.className = 'menu-grid';

    categoryItems.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'menu-card';
      card.innerHTML = `
        <div class="menu-card__header">
          <h4 class="menu-card__title">${item.title}</h4>
          <span class="price-pill" aria-label="Preis">${formatPrice(item.price)}</span>
        </div>
        <p class="menu-card__description">${item.description || ''}</p>
        <div class="menu-card__meta">
          ${item.unit ? `<span class="menu-pill menu-pill--muted">${item.unit}</span>` : ''}
          ${item.notes ? `<span class="menu-pill menu-pill--highlight" role="note">${item.notes}</span>` : ''}
        </div>
      `;
      grid.appendChild(card);
    });

    categorySection.appendChild(grid);
    container.appendChild(categorySection);
  });
}

async function loadMenu() {
  const menuDataUrl = '/data/menu.json';  // Direct absolute path - no resolvePublicPath needed
  const loading = document.getElementById('menu-loading');
  const error = document.getElementById('menu-error');

  loading?.classList.remove('is-hidden');

  try {
    console.info(LOG_PREFIX, 'Fetching menu from', menuDataUrl);
    const res = await fetch(menuDataUrl);
    const payload = await res.json();

    const items = Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload)
        ? payload
        : [];

    if (!items.length) {
      throw new Error('Keine Menü-Daten gefunden');
    }

    loading.classList.add('is-hidden');
    renderMenuItems(items);
  } catch {
    // Second fetch attempt like gallery.js does
    const fallback = await fetch(menuDataUrl);
    const fallbackPayload = await fallback.json();
    const fallbackItems = Array.isArray(fallbackPayload?.items)
      ? fallbackPayload.items
      : Array.isArray(fallbackPayload)
        ? fallbackPayload
        : [];

    loading.classList.add('is-hidden');
    if (fallbackItems.length) {
      renderMenuItems(fallbackItems);
    } else {
      error?.classList.remove('is-hidden');
    }
  }
}

// Initialize on DOMContentLoaded
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', async () => {
    await loadMenu();
  });
}
