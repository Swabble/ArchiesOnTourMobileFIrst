import fs from 'node:fs/promises';
import path from 'node:path';

const LOG_PREFIX = '[menu-build]';
const OUTPUT_PATH = path.resolve('public/menu.json');

const FALLBACK_ITEMS = [
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

const HEADER_MAP = {
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

function log(level, message, details) {
  const fn = console[level] ?? console.info;
  if (typeof fn !== 'function') return;
  fn(LOG_PREFIX, message, details ?? '');
}

function normalizeValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function mapRowToItem(row, logger = console) {
  const item = {};
  Object.entries(row).forEach(([rawKey, value]) => {
    const normalizedKey = rawKey.toString().trim().toLowerCase();
    const key = HEADER_MAP[normalizedKey] ?? normalizedKey;
    const normalizedValue = normalizeValue(value);
    if (key) item[key] = normalizedValue.trim();
  });
  if (!item.title && !item.category) {
    logger.debug?.(LOG_PREFIX, 'Skipping row without title/category', row);
  }
  return item;
}

function parseMatrix(headers, rows, logger = console) {
  logger.info?.(LOG_PREFIX, 'Parsing matrix', { headers, rowCount: rows.length });
  return rows
    .map((columns) => {
      const record = {};
      headers.forEach((header, idx) => {
        record[header] = columns[idx] ?? '';
      });
      return record;
    })
    .map((record) => mapRowToItem(record, logger))
    .filter((item) => item.title || item.category);
}

async function fetchSheetWithApi(sheetId, apiKey, range = 'A1:Z', logger = console) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedRange}?key=${apiKey}`;

  try {
    logger.info?.(LOG_PREFIX, 'Fetching menu via Sheets API', { url });
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      const text = await response.text();
      logger.warn?.(LOG_PREFIX, 'Sheets API responded with error', { status: response.status, body: text });
      return { items: FALLBACK_ITEMS, status: response.status, source: 'sheet-api-error' };
    }

    const json = await response.json();
    const [headers, ...rows] = json.values || [];

    if (!headers?.length) {
      log('warn', 'Sheets API returned empty header row, using fallback');
      return { items: FALLBACK_ITEMS, status: 204, source: 'sheet-api-empty' };
    }

    const items = parseMatrix(headers, rows, logger);
    const source = items.length ? 'sheet-api' : 'fallback-empty';

    log('info', 'Sheets API parsed menu', { range, itemCount: items.length });

    if (!items.length) {
      log('warn', 'Sheets API parsed menu empty, using fallback');
    }

    return { items: items.length ? items : FALLBACK_ITEMS, status: 200, source };
  } catch (error) {
    log('error', 'Sheets API fetch failed', { message: error.message, range });
    return { items: FALLBACK_ITEMS, status: 502, source: 'sheet-api-exception' };
  } finally {
    clearTimeout(timeout);
  }
}

async function writeMenuFile(payload) {
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2));
  log('info', 'Menu file written', { path: OUTPUT_PATH, itemCount: payload.items.length, source: payload.source });
}

export async function buildMenu() {
  const sheetId = process.env.MENU_SHEET_ID;
  const sheetRange = process.env.MENU_SHEET_RANGE || 'A1:Z';
  const driveApiKey = process.env.PUBLIC_DRIVE_API_KEY;

  log('info', 'Starting menu build', {
    sheetId: sheetId ? '✓ Configured' : '✗ Missing',
    sheetRange,
    driveApiKey: driveApiKey ? '✓ Configured' : '✗ Missing'
  });

  if (!sheetId || !driveApiKey) {
    log('warn', 'Sheet configuration missing, using fallback items');
    await writeMenuFile({ items: FALLBACK_ITEMS, source: 'missing-config', fetchedAt: new Date().toISOString() });
    return;
  }

  const result = await fetchSheetWithApi(sheetId, driveApiKey, sheetRange);
  const payload = {
    items: result.items,
    source: result.source,
    fetchedAt: new Date().toISOString()
  };

  await writeMenuFile(payload);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildMenu().catch(async (error) => {
    log('error', 'Menu build failed, writing fallback', { message: error.message });
    await writeMenuFile({ items: FALLBACK_ITEMS, source: 'build-error', fetchedAt: new Date().toISOString() });
    process.exitCode = 1;
  });
}

export { FALLBACK_ITEMS, OUTPUT_PATH as MENU_OUTPUT_PATH };
