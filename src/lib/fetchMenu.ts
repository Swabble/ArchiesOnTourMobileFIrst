import { FALLBACK_ITEMS } from './menuParser';
import type { MenuItem } from './menuTypes';

const LOG_PREFIX = '[menu-fetch]';

type DebugStatus = 'idle' | 'fetching' | 'success' | 'error';
type DebugSource = 'remote' | 'fallback';

type DebugState = {
  enabled: boolean;
  status: DebugStatus;
  source: DebugSource;
  contentType?: string;
  delimiter?: string;
  headers?: string[];
  parsedCount: number;
  fallbackCount: number;
  usedFallback: boolean;
  message?: string;
};

const debugEnabled =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debugMenu') === '1';

let lastDelimiter: string | undefined;
let lastHeaders: string[] | undefined;

let debugState: DebugState = {
  enabled: debugEnabled,
  status: 'idle',
  source: 'remote',
  parsedCount: 0,
  fallbackCount: FALLBACK_ITEMS.length,
  usedFallback: false
};

function emitDebug(update: Partial<DebugState>) {
  if (!debugEnabled || typeof window === 'undefined') return;
  debugState = { ...debugState, ...update } as DebugState;
  window.dispatchEvent(new CustomEvent<DebugState>('menu:debug', { detail: debugState }));
}

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

const HEADER_MAP: Record<string, keyof MenuItem> = {
  produkt: 'title',
  titel: 'title',
  name: 'title',
  'preis in €': 'price',
  preis: 'price',
  beschreibung: 'description',
  'einheit / größe': 'unit',
  einheit: 'unit',
  größe: 'unit',
  hinweise: 'notes',
  kategorie: 'category',
  überkategorie: 'superCategory',
  anzahl: 'quantity'
};

function mapRowToItem(row: Record<string, string>): MenuItem {
  const item: Partial<MenuItem> = {};
  Object.entries(row).forEach(([rawKey, value]) => {
    const normalizedKey = rawKey.trim().toLowerCase();
    const key = HEADER_MAP[normalizedKey] ?? (normalizedKey as keyof MenuItem);
    if (key) item[key] = value?.trim();
  });
  if (!item.title && !item.category) {
    console.debug(LOG_PREFIX, 'Skipping row without title/category', row);
  }
  return item as MenuItem;
}

function parseMatrix(headers: string[], rows: string[][]): MenuItem[] {
  console.info(LOG_PREFIX, 'Parsing matrix', { headers, rowCount: rows.length });
  return rows
    .map((columns) => {
      const record: Record<string, string> = {};
      headers.forEach((header, idx) => {
        record[header] = columns[idx] ?? '';
      });
      return record;
    })
    .map(mapRowToItem)
    .filter((item) => item.title || item.category);
}

function parseCsv(text: string): MenuItem[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const lines = trimmed.split(/\r?\n/).filter(Boolean);
  const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
  lastDelimiter = delimiter;
  console.info(LOG_PREFIX, 'Detected CSV delimiter', delimiter);
  const headers = lines[0].split(delimiter).map((h) => h.trim());
  lastHeaders = headers;
  const rows = lines.slice(1).map((line) => line.split(delimiter));
  return parseMatrix(headers, rows);
}

function normalizeSheetUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const isSheet = url.hostname.includes('docs.google.com') && url.pathname.includes('/spreadsheets/');
    if (!isSheet) return rawUrl;

    const pathParts = url.pathname.split('/').filter(Boolean);
    const dIndex = pathParts.indexOf('d');
    const sheetId = dIndex >= 0 ? pathParts[dIndex + 1] : undefined;
    const hashGid = url.hash.replace('#gid=', '') || undefined;
    const gid = url.searchParams.get('gid') ?? hashGid ?? '0';

    if (url.pathname.includes('/gviz/tq')) {
      url.searchParams.set('tqx', 'out:csv');
      if (gid) url.searchParams.set('gid', gid);
      return url.toString();
    }

    if (url.pathname.includes('/export')) {
      url.searchParams.set('format', url.searchParams.get('format') ?? 'tsv');
      if (gid) url.searchParams.set('gid', gid);
      return url.toString();
    }

    if (sheetId) {
      const exportUrl = new URL(`https://docs.google.com/spreadsheets/d/${sheetId}/export`);
      exportUrl.searchParams.set('format', 'tsv');
      exportUrl.searchParams.set('gid', gid);
      return exportUrl.toString();
    }
  } catch (error) {
    console.warn(LOG_PREFIX, 'Failed to normalize sheet URL', error);
  }

  return rawUrl;
}

function isHtmlPayload(contentType: string, body: string): boolean {
  const normalizedType = contentType.toLowerCase();
  if (normalizedType.includes('text/html') || normalizedType.includes('application/xhtml+xml')) return true;
  const trimmed = body.trimStart().toLowerCase();
  return trimmed.startsWith('<!doctype') || trimmed.startsWith('<html');
}

async function fetchRemoteMenu(): Promise<MenuItem[]> {
  const rawUrl = import.meta.env.PUBLIC_MENU_SHEET_URL;
  if (!rawUrl) {
    console.warn(LOG_PREFIX, 'PUBLIC_MENU_SHEET_URL is missing, using fallback items');
    emitDebug({
      status: 'error',
      source: 'fallback',
      usedFallback: true,
      message: 'PUBLIC_MENU_SHEET_URL missing'
    });
    return FALLBACK_ITEMS;
  }

  const url = normalizeSheetUrl(rawUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  console.info(LOG_PREFIX, 'Fetching menu from', url);
  emitDebug({ status: 'fetching', source: 'remote', usedFallback: false, message: 'Requesting menu' });

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

    return items;
  } catch (err) {
    console.warn(LOG_PREFIX, 'Menu fallback after error', err);
    emitDebug({
      status: 'error',
      usedFallback: true,
      source: 'fallback',
      message: err instanceof Error ? err.message : String(err)
    });
    return FALLBACK_ITEMS;
  } finally {
    clearTimeout(timeout);
  }
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
    emitDebug({
      status: 'error',
      usedFallback: true,
      source: 'fallback',
      message: err instanceof Error ? err.message : String(err)
    });
    error?.classList.remove('is-hidden');
    render(FALLBACK_ITEMS);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', init);
}
