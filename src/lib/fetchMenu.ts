import { FALLBACK_ITEMS } from './menuParser';
import type { MenuItem } from './menuTypes';

const LOG_PREFIX = '[menu-fetch]';

function formatPrice(price: string | number) {
  const numeric = Number(String(price).replace(/[^0-9,.-]/g, '').replace(',', '.'));
  if (Number.isNaN(numeric)) return 'auf Anfrage';
  return `${numeric.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`;
}

type MenuGroup = {
  title: string;
  categories: Record<string, MenuItem[]>;
};

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

  // Group by card (superCategory if present, otherwise the category itself)
  const grouped = items.reduce<Record<string, MenuGroup>>((acc, item) => {
    const trimmedSuper = item.superCategory?.trim();
    const categoryName = item.category?.trim() || 'Weitere Highlights';
    const cardKey = trimmedSuper || categoryName;
    if (!acc[cardKey]) {
      acc[cardKey] = {
        title: trimmedSuper || categoryName,
        categories: {}
      };
    }

    if (!acc[cardKey].categories[categoryName]) {
      acc[cardKey].categories[categoryName] = [];
    }

    acc[cardKey].categories[categoryName].push(item);
    return acc;
  }, {});

  Object.values(grouped).forEach((group) => {
    const categoryEntries = Object.entries(group.categories);

    const cardWrapper = document.createElement('section');
    cardWrapper.className = 'menu-category-block';

    categoryEntries.forEach(([categoryName, categoryItems]) => {
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
            <span class="price-pill" aria-label="Preis">${formatPrice(item.price)}</span>
          </div>
          <p class="menu-card__description">${item.description ?? ''}</p>
          <div class="menu-card__meta">
            ${item.unit ? `<span class="menu-pill menu-pill--muted">${item.unit}</span>` : ''}
            ${item.notes ? `<span class="menu-pill menu-pill--highlight" role="note">${item.notes}</span>` : ''}
          </div>
        `;
        grid?.appendChild(card);
      });

      cardWrapper.appendChild(categorySection);
    });

    container.appendChild(cardWrapper);
  });
}

async function fetchRemoteMenu(): Promise<{
  items: MenuItem[];
  source: string;
  rawPayload: unknown;
  ok: boolean;
  status: number;
}> {
  const apiUrl = '/menu.json';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  console.info(LOG_PREFIX, 'Fetching menu from static file', apiUrl);
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
    // Try to load prerendered menu data first
    const dataElement = document.getElementById('menu-data');
    console.info(LOG_PREFIX, 'Looking for prerendered data...', { found: !!dataElement, hasContent: !!dataElement?.textContent });

    if (dataElement?.textContent) {
      try {
        const parsed = JSON.parse(dataElement.textContent);
        console.info(LOG_PREFIX, 'Parsed prerendered data:', { isArray: Array.isArray(parsed), length: Array.isArray(parsed) ? parsed.length : 0 });

        if (Array.isArray(parsed) && parsed.length > 0) {
          console.info(LOG_PREFIX, 'Using', parsed.length, 'prerendered menu items');
          render(parsed, false);
          return;
        } else {
          console.warn(LOG_PREFIX, 'Prerendered data is empty or not an array');
        }
      } catch (parseError) {
        console.error(LOG_PREFIX, 'Failed to parse prerendered data:', parseError);
      }
    }

    // Fallback: fetch from API (for local dev)
    console.warn(LOG_PREFIX, 'No prerendered data, falling back to fetch');
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
