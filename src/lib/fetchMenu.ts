import { FALLBACK_ITEMS } from './menuParser';
import type { MenuItem } from './menuTypes';

const LOG_PREFIX = '[menu-fetch]';

function formatPrice(price: string | number) {
  const numeric = Number(String(price).replace(/[^0-9,.-]/g, '').replace(',', '.'));
  if (Number.isNaN(numeric)) return 'auf Anfrage';
  return `${numeric.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`;
}

function updateJsonPanel(payload: unknown, meta?: { status?: number; source?: string; note?: string }) {
  const panel = document.getElementById('menu-json-panel');
  const pre = document.getElementById('menu-json-raw');
  const summary = document.getElementById('menu-json-summary');
  const metaRow = document.getElementById('menu-json-meta');
  const wrapper = document.getElementById('menu-debug');
  if (!panel || !pre || !summary || !metaRow || !wrapper) return;

  const summaryParts = [] as string[];
  if (meta?.status !== undefined) summaryParts.push(`Status ${meta.status}`);
  if (meta?.source) summaryParts.push(`Quelle: ${meta.source}`);
  if (meta?.note) summaryParts.push(meta.note);

  summary.textContent = summaryParts.length ? summaryParts.join(' · ') : 'API-Antwort anzeigen';
  metaRow.textContent = summaryParts.length ? summaryParts.join(' • ') : '';
  pre.textContent = JSON.stringify(payload, null, 2);

  panel.classList.remove('is-hidden');
  wrapper.classList.remove('is-hidden');
}

function render(items: MenuItem[], source?: string, keepErrorVisible = false) {
  const container = document.getElementById('menu-categories-container');
  const loading = document.getElementById('menu-loading');
  const error = document.getElementById('menu-error');
  const sourcePill = document.getElementById('menu-source');
  const statsCard = document.getElementById('menu-stats');
  const statCount = document.getElementById('menu-stat-count');
  const statCategories = document.getElementById('menu-stat-categories');
  const statSource = document.getElementById('menu-stat-source');
  if (!container || !loading || !error || !sourcePill || !statsCard || !statCount || !statCategories || !statSource) return;

  loading.classList.add('is-hidden');
  if (!keepErrorVisible) {
    error.classList.add('is-hidden');
  }
  container.innerHTML = '';
  console.info(LOG_PREFIX, `Rendering ${items.length} menu items`);

  sourcePill.textContent = `Quelle: ${source || 'unbekannt'}`;
  sourcePill.classList.remove('is-hidden');

  const categories = items.reduce<Record<string, MenuItem[]>>((acc, item) => {
    const category = item.category?.trim() || 'Weitere Highlights';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  statCount.textContent = `${items.length}`;
  statCategories.textContent = `${Object.keys(categories).length}`;
  statSource.textContent = source || 'unbekannt';
  statsCard.classList.remove('is-hidden');

  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'menu-empty';
    empty.textContent = 'Keine Produkte gefunden.';
    container.appendChild(empty);
    return;
  }

  Object.entries(categories).forEach(([categoryName, categoryItems]) => {
    const section = document.createElement('section');
    section.className = 'menu-category-block reveal';
    section.innerHTML = `
      <header class="menu-category-block__header">
        <p class="eyebrow">Kategorie</p>
        <h3>${categoryName}</h3>
      </header>
      <div class="menu-grid"></div>
    `;

    const grid = section.querySelector('.menu-grid');
    categoryItems.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'menu-card';
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
      grid?.appendChild(card);
    });

    container.appendChild(section);
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
  const source = (payload as { source?: string }).source ?? 'unknown';

  console.info(LOG_PREFIX, 'Menu API response received', {
    status: res.status,
    itemCount: items.length,
    source
  });

  return {
    items: items.length ? items : FALLBACK_ITEMS,
    source: items.length ? source : 'fallback',
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
    render(result.items, result.source, !result.ok);
    updateJsonPanel(result.rawPayload, {
      status: result.status,
      source: result.source,
      note: result.ok ? undefined : 'API-Fehler'
    });
  } catch (err) {
    console.warn(LOG_PREFIX, 'Menu fallback after error', err);
    error?.classList.remove('is-hidden');
    render(FALLBACK_ITEMS, 'error-fallback', true);
    updateJsonPanel(
      {
        error: err instanceof Error ? err.message : String(err),
        fallback: FALLBACK_ITEMS
      },
      { note: 'Fallback nach Fehler' }
    );
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', init);
}
