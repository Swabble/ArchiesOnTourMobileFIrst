import { FALLBACK_ITEMS } from './menuParser';
import type { MenuItem } from './menuTypes';

const LOG_PREFIX = '[menu-fetch]';

function formatPrice(price: string | number) {
  const numeric = Number(String(price).replace(/[^0-9,.-]/g, '').replace(',', '.'));
  if (Number.isNaN(numeric)) return 'auf Anfrage';
  return `${numeric.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`;
}

function render(items: MenuItem[], keepErrorVisible = false) {
  const container = document.getElementById('menu-categories-container');
  const loading = document.getElementById('menu-loading');
  const error = document.getElementById('menu-error');
  if (!container || !loading || !error) return;

  loading.classList.add('is-hidden');
  if (!keepErrorVisible) {
    error.classList.add('is-hidden');
  }
  container.innerHTML = '';
  console.info(LOG_PREFIX, `Rendering ${items.length} menu items`);

  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'menu-empty';
    empty.textContent = 'Keine Produkte gefunden.';
    container.appendChild(empty);
    return;
  }

  // Group by superCategory first, then by category
  const hierarchy = items.reduce<Record<string, Record<string, MenuItem[]>>>((acc, item) => {
    const superCat = item.superCategory?.trim() || 'Weitere Kategorien';
    const cat = item.category?.trim() || 'Weitere Highlights';

    if (!acc[superCat]) acc[superCat] = {};
    if (!acc[superCat][cat]) acc[superCat][cat] = [];
    acc[superCat][cat].push(item);
    return acc;
  }, {});

  Object.entries(hierarchy).forEach(([superCategoryName, categories]) => {
    const superSection = document.createElement('section');
    superSection.className = 'menu-supercategory-block';

    const superHeader = document.createElement('header');
    superHeader.className = 'menu-supercategory-block__header';
    superHeader.innerHTML = `<h2 class="menu-supercategory-block__title">${superCategoryName}</h2>`;
    superSection.appendChild(superHeader);

    // Create a single card for the entire supercategory
    const superCard = document.createElement('div');
    superCard.className = 'menu-category-block';

    Object.entries(categories).forEach(([categoryName, categoryItems]) => {
      const categorySection = document.createElement('section');
      categorySection.className = 'menu-category-section';
      categorySection.innerHTML = `
        <header class="menu-category-section__header">
          <h3>${categoryName}</h3>
        </header>
        <div class="menu-grid"></div>
      `;

      const grid = categorySection.querySelector('.menu-grid');
      categoryItems.forEach((item) => {
        const card = document.createElement('article');
        card.className = 'menu-card';
        card.innerHTML = `
          <div class="menu-card__header">
            <h4 class="menu-card__title">${item.title}</h4>
            <span class="price-pill">${formatPrice(item.price)}</span>
          </div>
          <p class="menu-card__description">${item.description ?? ''}</p>
          <dl class="menu-card__meta">
            ${item.unit ? `<div class="menu-card__meta-row"><dt>Einheit</dt><dd>${item.unit}</dd></div>` : ''}
            ${item.notes ? `<div class="menu-card__meta-row"><dt>Hinweise</dt><dd>${item.notes}</dd></div>` : ''}
          </dl>
        `;
        grid?.appendChild(card);
      });

      superCard.appendChild(categorySection);
    });

    superSection.appendChild(superCard);
    container.appendChild(superSection);
  });
}

async function fetchRemoteMenu(): Promise<{
  items: MenuItem[];
  source: string;
  rawPayload: unknown;
  ok: boolean;
  status: number;
}> {
  const apiUrl = '/api/menu.json';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  console.info(LOG_PREFIX, 'Fetching menu from API', apiUrl);
  const res = await fetch(apiUrl, { signal: controller.signal });
  clearTimeout(timeout);

  const payload = await res
    .json()
    .catch((err) => {
      console.warn(LOG_PREFIX, 'Menu API JSON parse failed', err);
      return {};
    });

  const items = Array.isArray((payload as { items?: MenuItem[] }).items)
    ? ((payload as { items?: MenuItem[] }).items as MenuItem[])
    : [];
  const sourceValue = (payload as { source?: string }).source ?? 'unknown';

  console.info(LOG_PREFIX, 'Menu API response received', {
    status: res.status,
    itemCount: items.length,
    source: sourceValue
  });

  return {
    items: items.length ? items : FALLBACK_ITEMS,
    source: items.length ? sourceValue : 'fallback',
    rawPayload: payload,
    ok: res.ok,
    status: res.status
  };
}

async function init() {
  const loading = document.getElementById('menu-loading');
  const error = document.getElementById('menu-error');
  loading?.classList.remove('is-hidden');
  try {
    const result = await fetchRemoteMenu();
    if (!result.ok) {
      error?.classList.remove('is-hidden');
    }
    render(result.items, !result.ok);
  } catch (err) {
    console.warn(LOG_PREFIX, 'Menu fallback after error', err);
    error?.classList.remove('is-hidden');
    render(FALLBACK_ITEMS, true);
  }
}

export function bootstrapMenu() {
  if (typeof window === 'undefined') return;

  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('DOMContentLoaded', init, { once: true });
  }
}

// Auto-initialize when loaded as a script
if (typeof window !== 'undefined') {
  bootstrapMenu();
}
