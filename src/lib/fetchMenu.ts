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

const FALLBACK_ITEMS: MenuItem[] = [
  {
    title: 'Signature Burger',
    description: 'Rindfleisch-Patty, Cheddar, karamellisierte Zwiebeln, Haus-Sauce',
    price: '11.90',
    unit: 'pro Stück',
    category: 'Burger'
  },
  {
    title: 'Veggie Bowl',
    description: 'Geröstetes Gemüse, Quinoa, Kräuter-Dip',
    price: '10.50',
    unit: 'pro Portion',
    category: 'Bowls'
  },
  {
    title: 'Hauslimonade',
    description: 'Zitrone-Ingwer, wenig Zucker',
    price: '3.90',
    unit: '0,33l',
    category: 'Getränke'
  }
];

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

function parseJsonPayload(text: string): MenuItem[] {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      console.info(LOG_PREFIX, 'Parsing JSON array payload', { length: parsed.length });
      lastHeaders = parsed[0] ? Object.keys(parsed[0]) : undefined;
      return parsed.map(mapRowToItem);
    }
    if (Array.isArray(parsed?.values)) {
      const [headerRow, ...dataRows] = parsed.values as string[][];
      if (!headerRow) return [];
      console.info(LOG_PREFIX, 'Parsing JSON matrix payload', { rowCount: dataRows.length });
      lastHeaders = headerRow;
      return parseMatrix(headerRow, dataRows);
    }
  } catch (err) {
    console.warn(LOG_PREFIX, 'Menu JSON parse failed', err);
  }
  return [];
}

async function fetchRemoteMenu(): Promise<MenuItem[]> {
  const url = import.meta.env.PUBLIC_MENU_SHEET_URL;
  if (!url) {
    console.warn(LOG_PREFIX, 'PUBLIC_MENU_SHEET_URL is missing, using fallback items');
    emitDebug({
      status: 'error',
      source: 'fallback',
      usedFallback: true,
      message: 'PUBLIC_MENU_SHEET_URL missing'
    });
    return FALLBACK_ITEMS;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  console.info(LOG_PREFIX, 'Fetching menu from', url);
  emitDebug({ status: 'fetching', source: 'remote', usedFallback: false, message: 'Requesting menu' });
  const res = await fetch(url, { signal: controller.signal });
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

  console.info(LOG_PREFIX, 'Menu API response received', {
    status: res.status,
    itemCount: items.length,
    source: (payload as { source?: string }).source ?? 'unknown'
  });
  emitDebug({ contentType });

  lastDelimiter = undefined;
  lastHeaders = undefined;
  const items = contentType.includes('application/json') ? parseJsonPayload(body) : parseCsv(body);

  if (!items.length) {
    console.warn(LOG_PREFIX, 'Parsed menu is empty, falling back');
    emitDebug({
      status: 'error',
      usedFallback: true,
      delimiter: lastDelimiter,
      headers: lastHeaders,
      parsedCount: 0,
      source: 'fallback'
    });
  }

  const parsedCount = items.length;
  emitDebug({
    status: parsedCount ? 'success' : 'error',
    delimiter: lastDelimiter,
    headers: lastHeaders,
    parsedCount,
    usedFallback: !parsedCount,
    source: parsedCount ? 'remote' : 'fallback'
  });

  return parsedCount ? items : FALLBACK_ITEMS;
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
