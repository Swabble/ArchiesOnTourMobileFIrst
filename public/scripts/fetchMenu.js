import { FALLBACK_ITEMS } from './menuParser';
const LOG_PREFIX = '[menu-fetch]';
function resolvePublicPath(relativePath) {
    const trimmed = relativePath.replace(/^\/+/, '');
    try {
        return new URL(trimmed, window.location.href).toString();
    }
    catch (error) {
        console.warn('Konnte Pfad nicht relativ zum aktuellen Dokument auflösen, fallback auf Basis-URL', error);
    }
    return `/${trimmed}`;
}
function formatPrice(price) {
    const numeric = Number(String(price).replace(/[^0-9,.-]/g, '').replace(',', '.'));
    if (Number.isNaN(numeric))
        return 'auf Anfrage';
    return `${numeric.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`;
}
function render(items, keepErrorVisible = false) {
    const container = document.getElementById('menu-categories-container');
    const loading = document.getElementById('menu-loading');
    const error = document.getElementById('menu-error');
    if (!container || !loading || !error)
        return;
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
    const grouped = items.reduce((acc, item) => {
        var _a, _b;
        const trimmedSuper = (_a = item.superCategory) === null || _a === void 0 ? void 0 : _a.trim();
        const categoryName = ((_b = item.category) === null || _b === void 0 ? void 0 : _b.trim()) || 'Weitere Highlights';
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
                var _a;
                const card = document.createElement('article');
                card.className = 'menu-card';
                card.innerHTML = `
          <div class="menu-card__header">
            <h4 class="menu-card__title">${item.title}</h4>
            <span class="price-pill" aria-label="Preis">${formatPrice(item.price)}</span>
          </div>
          <p class="menu-card__description">${(_a = item.description) !== null && _a !== void 0 ? _a : ''}</p>
          <div class="menu-card__meta">
            ${item.unit ? `<span class="menu-pill menu-pill--muted">${item.unit}</span>` : ''}
            ${item.notes ? `<span class="menu-pill menu-pill--highlight" role="note">${item.notes}</span>` : ''}
          </div>
        `;
                grid === null || grid === void 0 ? void 0 : grid.appendChild(card);
            });
            cardWrapper.appendChild(categorySection);
        });
        container.appendChild(cardWrapper);
    });
}
function formatDate(value) {
    if (!value)
        return '–';
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return value;
    return date.toLocaleString('de-DE');
}
function describeSource(result) {
    if (!result.ok) {
        if (result.status === 403)
            return '403: API-Key oder Freigabe für Sheet/Drive fehlt';
        if (result.status === 404)
            return '404: Sheet-ID, Range oder Drive-Datei nicht gefunden';
        return 'Fehler beim Laden – Fallback aktiv';
    }
    if (result.source === 'sheet')
        return 'Menü direkt aus Google Sheet geladen';
    if (result.source === 'sheet-api')
        return 'Menü über Google Sheets API geladen';
    if (result.source === 'drive')
        return 'Menü aus Drive-Tabelle geladen';
    if (result.source === 'fallback-empty')
        return 'Quelle leer – Fallback-Einträge genutzt';
    if (result.source === 'missing-config')
        return 'Keine Sheet-URL konfiguriert – Fallback-Einträge';
    if (result.source === 'api-fallback' || result.source === 'fallback')
        return 'API-Fallback aktiv';
    return `Quelle: ${result.source}`;
}
function updateDebugPanel(result) {
    var _a;
    const debugCard = document.getElementById('menu-debug');
    const status = document.getElementById('menu-debug-status');
    const hint = document.getElementById('menu-debug-hint');
    const source = document.getElementById('menu-debug-source');
    const fetched = document.getElementById('menu-debug-fetched');
    const count = document.getElementById('menu-debug-count');
    const payload = document.getElementById('menu-debug-payload');
    if (!debugCard || !status || !hint || !source || !fetched || !count || !payload)
        return;
    debugCard.classList.remove('is-hidden');
    status.textContent = result.ok ? `Status ${result.status}` : `Fehler ${result.status}`;
    hint.textContent = describeSource(result);
    source.textContent = result.source || 'unbekannt';
    fetched.textContent = formatDate(result.fetchedAt);
    count.textContent = String(result.items.length);
    payload.textContent = JSON.stringify((_a = result.rawPayload) !== null && _a !== void 0 ? _a : {}, null, 2);
}
async function fetchRemoteMenu() {
    var _a;
    const apiUrl = resolvePublicPath('data/menu.json');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    console.info(LOG_PREFIX, 'Fetching menu from static file', apiUrl);
    const res = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeout);
    // Parse JSON like gallery.js - no response.ok check to avoid issues with IONOS hosting
    const payload = await res
        .json()
        .catch((err) => {
        console.warn(LOG_PREFIX, 'Menu API JSON parse failed', err);
        return {};
    });
    const items = Array.isArray(payload.items)
        ? payload.items
        : [];
    const sourceValue = (_a = payload.source) !== null && _a !== void 0 ? _a : 'unknown';
    const fetchedAt = payload.fetchedAt;
    console.info(LOG_PREFIX, 'Menu API response received', {
        status: res.status,
        itemCount: items.length,
        source: sourceValue
    });
    return {
        items: items.length ? items : FALLBACK_ITEMS,
        source: items.length ? sourceValue : 'fallback',
        fetchedAt,
        rawPayload: payload,
        ok: res.ok,
        status: res.status
    };
}
async function init() {
    const loading = document.getElementById('menu-loading');
    const error = document.getElementById('menu-error');
    loading === null || loading === void 0 ? void 0 : loading.classList.remove('is-hidden');
    try {
        const result = await fetchRemoteMenu();
        if (!result.ok) {
            error === null || error === void 0 ? void 0 : error.classList.remove('is-hidden');
        }
        render(result.items, !result.ok);
        updateDebugPanel(result);
    }
    catch (err) {
        console.warn(LOG_PREFIX, 'Menu fallback after error', err);
        error === null || error === void 0 ? void 0 : error.classList.remove('is-hidden');
        const fallbackResult = {
            items: FALLBACK_ITEMS,
            source: 'exception',
            fetchedAt: undefined,
            rawPayload: { error: err.message },
            ok: false,
            status: 500
        };
        render(FALLBACK_ITEMS, true);
        updateDebugPanel(fallbackResult);
    }
}
export function bootstrapMenu() {
    if (typeof window === 'undefined')
        return;
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        init();
    }
    else {
        window.addEventListener('DOMContentLoaded', init, { once: true });
    }
}
// Auto-initialize when loaded as a script
if (typeof window !== 'undefined') {
    bootstrapMenu();
}
