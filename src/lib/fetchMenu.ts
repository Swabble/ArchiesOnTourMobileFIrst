import { FALLBACK_ITEMS } from './menuParser';
import type { MenuItem } from './menuTypes';

const LOG_PREFIX = '[menu-fetch]';

function formatPrice(price: string | number) {
  const numeric = Number(String(price).replace(/[^0-9,.-]/g, '').replace(',', '.'));
  if (Number.isNaN(numeric)) return 'auf Anfrage';
  return `${numeric.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`;
}

function render(items: MenuItem[]) {
  const container = document.getElementById('menu-categories-container');
  const loading = document.getElementById('menu-loading');
  const error = document.getElementById('menu-error');
  if (!container || !loading || !error) return;

  loading.classList.add('is-hidden');
  container.innerHTML = '';
  console.info(LOG_PREFIX, `Rendering ${items.length} menu items`);
  items.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'menu-card reveal';
    card.innerHTML = `
      <div class="menu-card__header">
        <h3>${item.title}</h3>
        <span class="price-pill">${formatPrice(item.price)}</span>
      </div>
      <p>${item.description ?? ''}</p>
      ${item.unit ? `<p class="price-pill" aria-label="Einheit">${item.unit}</p>` : ''}
    `;
    container.appendChild(card);
  });
}

async function fetchRemoteMenu(): Promise<MenuItem[]> {
  const apiUrl = '/api/menu.json';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  console.info(LOG_PREFIX, 'Fetching menu from API', apiUrl);
  const res = await fetch(apiUrl, { signal: controller.signal });
  clearTimeout(timeout);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'text/tab-separated-values,text/csv;q=0.9,text/plain;q=0.8' }
    });
    const contentType = res.headers.get('content-type') ?? '';
    const body = await res.text();

    console.info(LOG_PREFIX, 'Menu response received', {
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      contentType,
      preview: body.slice(0, 120)
    });
    emitDebug({ contentType });

    if (!res.ok) {
      console.warn(LOG_PREFIX, 'Menu request failed, using fallback', res.status);
      emitDebug({
        status: 'error',
        source: 'fallback',
        usedFallback: true,
        message: `Request failed with status ${res.status}`
      });
      return FALLBACK_ITEMS;
    }

    if (isHtmlPayload(contentType, body)) {
      console.warn(LOG_PREFIX, 'Received HTML payload instead of CSV/TSV, aborting parse');
      emitDebug({
        status: 'error',
        source: 'fallback',
        usedFallback: true,
        message: 'Received HTML response'
      });
      return FALLBACK_ITEMS;
    }

    lastDelimiter = undefined;
    lastHeaders = undefined;
    const items = parseCsv(body);
    const parsedCount = items.length;

    if (!parsedCount) {
      console.warn(LOG_PREFIX, 'Parsed menu is empty, falling back');
      emitDebug({
        status: 'error',
        usedFallback: true,
        delimiter: lastDelimiter,
        headers: lastHeaders,
        parsedCount: 0,
        source: 'fallback',
        message: 'Empty export payload'
      });
      return FALLBACK_ITEMS;
    }

    emitDebug({
      status: 'success',
      delimiter: lastDelimiter,
      headers: lastHeaders,
      parsedCount,
      usedFallback: false,
      source: 'remote'
    });

  const items = Array.isArray((payload as { items?: MenuItem[] }).items)
    ? ((payload as { items?: MenuItem[] }).items as MenuItem[])
    : [];

  console.info(LOG_PREFIX, 'Menu API response received', {
    status: res.status,
    itemCount: items.length,
    source: (payload as { source?: string }).source ?? 'unknown'
  });

  if (!res.ok) {
    throw new Error(`Menu API failed with status ${res.status}`);
  }

  if (!items.length) {
    console.warn(LOG_PREFIX, 'Menu API returned no items, falling back');
  }

  return items.length ? items : FALLBACK_ITEMS;
}

async function init() {
  const loading = document.getElementById('menu-loading');
  const error = document.getElementById('menu-error');
  loading?.classList.remove('is-hidden');
  try {
    const items = await fetchRemoteMenu();
    render(items.length ? items : FALLBACK_ITEMS);
  } catch (err) {
    console.warn(LOG_PREFIX, 'Menu fallback after error', err);
    error?.classList.remove('is-hidden');
    render(FALLBACK_ITEMS);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', init);
}
