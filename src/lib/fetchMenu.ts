import { FALLBACK_ITEMS } from './menuParser';
import type { MenuItem } from './menuTypes';

const LOG_PREFIX = '[menu-fetch]';

function formatPrice(price: string | number) {
  const numeric = Number(String(price).replace(/[^0-9,.-]/g, '').replace(',', '.'));
  if (Number.isNaN(numeric)) return 'auf Anfrage';
  return `${numeric.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`;
}

function render(items: MenuItem[], source?: string) {
  const container = document.getElementById('menu-categories-container');
  const loading = document.getElementById('menu-loading');
  const error = document.getElementById('menu-error');
  const debugBox = document.getElementById('menu-debug');
  if (!container || !loading || !error) return;

  loading.classList.add('is-hidden');
  container.innerHTML = '';
  console.info(LOG_PREFIX, `Rendering ${items.length} menu items`);

  if (debugBox) {
    debugBox.innerHTML = `<strong>Menu Debug Info:</strong>
Data Source: ${source || 'unknown'}
Items Found: ${items.length}

Sample Items:
${JSON.stringify(items.slice(0, 2), null, 2)}`;
  }

  items.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'menu-card reveal';
    card.innerHTML = `
      <div class="menu-card__header">
        <div class="menu-card__titles">
          <p class="menu-card__category">${item.category || 'Klassiker'}</p>
          <h3>${item.title}</h3>
        </div>
        <span class="price-pill">${formatPrice(item.price)}</span>
      </div>
      <p class="menu-card__description">${item.description ?? ''}</p>
      <div class="menu-card__meta">
        ${item.unit ? `<span class="tag">${item.unit}</span>` : ''}
        ${item.notes ? `<span class="tag tag--muted">${item.notes}</span>` : ''}
      </div>
    `;
    container.appendChild(card);
  });
}

async function fetchRemoteMenu(): Promise<{ items: MenuItem[]; source: string }> {
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
  const source = (payload as { source?: string }).source ?? 'unknown';

  console.info(LOG_PREFIX, 'Menu API response received', {
    status: res.status,
    itemCount: items.length,
    source
  });

  if (!res.ok) {
    throw new Error(`Menu API failed with status ${res.status}`);
  }

  if (!items.length) {
    console.warn(LOG_PREFIX, 'Menu API returned no items, falling back');
  }

  return {
    items: items.length ? items : FALLBACK_ITEMS,
    source: items.length ? source : 'fallback'
  };
}

async function init() {
  const loading = document.getElementById('menu-loading');
  const error = document.getElementById('menu-error');
  const debugBox = document.getElementById('menu-debug');
  loading?.classList.remove('is-hidden');
  try {
    const result = await fetchRemoteMenu();
    render(result.items, result.source);
  } catch (err) {
    console.warn(LOG_PREFIX, 'Menu fallback after error', err);
    error?.classList.remove('is-hidden');
    if (debugBox) {
      debugBox.innerHTML = `<strong>Menu Debug Info:</strong>
Error: ${(err as Error).message}
Using fallback items`;
    }
    render(FALLBACK_ITEMS, 'error-fallback');
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', init);
}
