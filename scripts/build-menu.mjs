import fs from 'node:fs/promises';
import path from 'node:path';
import { read, utils } from 'xlsx';

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

function parseCsv(text, logger = console) {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const lines = trimmed.split(/\r?\n/).filter(Boolean);
  const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
  logger.info?.(LOG_PREFIX, 'Detected CSV delimiter', { delimiter });
  const headers = lines[0].split(delimiter).map((h) => h.trim());
  const rows = lines.slice(1).map((line) => line.split(delimiter));
  return parseMatrix(headers, rows, logger);
}

function parseJsonPayload(text, logger = console) {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      logger.info?.(LOG_PREFIX, 'Parsing JSON array payload', { length: parsed.length });
      return parsed.map((entry) => mapRowToItem(entry, logger));
    }
    if (Array.isArray(parsed?.values)) {
      const [headerRow, ...dataRows] = parsed.values;
      if (!headerRow) return [];
      logger.info?.(LOG_PREFIX, 'Parsing JSON matrix payload', { rowCount: dataRows.length });
      return parseMatrix(headerRow, dataRows, logger);
    }
  } catch (err) {
    logger.warn?.(LOG_PREFIX, 'Menu JSON parse failed', { error: err.message });
  }
  return [];
}

function parseMenuPayload(text, contentType = '', logger = console) {
  const normalizedType = contentType.toLowerCase();
  const items = normalizedType.includes('application/json')
    ? parseJsonPayload(text, logger)
    : parseCsv(text, logger);
  logger.info?.(LOG_PREFIX, 'Parsed menu result', { itemCount: items.length });
  return items;
}

function parseWorkbook(buffer, logger = console) {
  const workbook = read(buffer, { type: 'array' });
  const rows = [];

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;
    const data = utils.sheet_to_json(sheet, { defval: '' });
    rows.push(...data);
  });

  const items = rows.map((row) => mapRowToItem(row, logger)).filter((item) => item.title || item.category);
  logger.info?.(LOG_PREFIX, 'Parsed workbook', { sheetCount: workbook.SheetNames.length, itemCount: items.length });
  return items;
}

async function fetchSheet(url, logger = console) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  log('info', 'Fetching menu sheet', { url });

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'text/csv, application/json;q=0.9' }
    });
    const contentType = response.headers.get('content-type') ?? '';
    const body = await response.text();
    log('info', 'Sheet response received', {
      status: response.status,
      headers: Object.fromEntries(Array.from(response.headers.entries())),
      contentType,
      preview: body.slice(0, 200)
    });

    if (!response.ok) {
      return { items: FALLBACK_ITEMS, status: response.status, source: 'upstream-error' };
    }

    const items = parseMenuPayload(body, contentType, logger);
    const source = items.length ? 'sheet' : 'fallback-empty';
    if (!items.length) {
      log('warn', 'Parsed menu empty, using fallback');
    }

    return { items: items.length ? items : FALLBACK_ITEMS, status: 200, source };
  } catch (error) {
    log('error', 'Sheet fetch failed', { message: error.message });
    return { items: FALLBACK_ITEMS, status: 502, source: 'exception' };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchDriveWorkbook(folderId, apiKey, logger = console) {
  const query = encodeURIComponent(`'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`);
  const listUrl =
    `https://www.googleapis.com/drive/v3/files` +
    `?q=${query}` +
    `&fields=files(id,name,mimeType)` +
    `&supportsAllDrives=true&includeItemsFromAllDrives=true` +
    `&key=${apiKey}`;

  log('info', 'Listing Drive folder for menu', { folderId });

  const listResponse = await fetch(listUrl);
  if (!listResponse.ok) {
    log('warn', 'Drive list request failed', { status: listResponse.status });
    return { items: FALLBACK_ITEMS, status: 502, source: 'drive-list-error' };
  }

  const data = await listResponse.json();
  const spreadsheet = (data.files ?? []).find((file) => {
    const name = (file.name ?? '').toLowerCase();
    return (
      file.mimeType === 'application/vnd.google-apps.spreadsheet' ||
      file.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimeType === 'application/vnd.ms-excel' ||
      name.endsWith('.xlsx') ||
      name.endsWith('.xls') ||
      name.endsWith('.csv')
    );
  });

  if (!spreadsheet) {
    log('warn', 'No spreadsheet found in Drive folder');
    return { items: FALLBACK_ITEMS, status: 404, source: 'drive-no-file' };
  }

  const isGoogleSheet = spreadsheet.mimeType === 'application/vnd.google-apps.spreadsheet';
  const downloadUrl = isGoogleSheet
    ? `https://docs.google.com/spreadsheets/d/${spreadsheet.id}/export?format=xlsx`
    : `https://www.googleapis.com/drive/v3/files/${spreadsheet.id}?alt=media&supportsAllDrives=true&key=${apiKey}`;

  log('info', 'Downloading Drive spreadsheet', { fileId: spreadsheet.id, mimeType: spreadsheet.mimeType });
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    log('warn', 'Drive download failed', { status: response.status });
    return { items: FALLBACK_ITEMS, status: 502, source: 'drive-download-error' };
  }

  const buffer = await response.arrayBuffer();
  const items = parseWorkbook(buffer, logger);
  const source = items.length ? 'drive' : 'fallback-empty';

  if (!items.length) {
    log('warn', 'Parsed Drive workbook empty, using fallback');
  }

  return { items: items.length ? items : FALLBACK_ITEMS, status: 200, source };
}

async function writeMenuFile(payload) {
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2));
  log('info', 'Menu file written', { path: OUTPUT_PATH, itemCount: payload.items.length, source: payload.source });
}

async function buildMenu() {
  const sheetUrl = process.env.MENU_SHEET_URL;
  const driveFolderId = process.env.PUBLIC_MENU_FOLDER_ID;
  const driveApiKey = process.env.PUBLIC_DRIVE_API_KEY;

  log('info', 'Starting menu build', {
    sheetUrl: sheetUrl ? '✓ Configured' : '✗ Missing',
    driveFolderId: driveFolderId ? '✓ Configured' : '✗ Missing',
    driveApiKey: driveApiKey ? '✓ Configured' : '✗ Missing'
  });

  let result = null;

  if (sheetUrl) {
    log('info', 'Attempting to fetch from Google Sheet');
    result = await fetchSheet(sheetUrl);
  }

  if ((!result || result.source !== 'sheet') && driveFolderId && driveApiKey) {
    log('info', 'Attempting to fetch from Google Drive folder');
    result = await fetchDriveWorkbook(driveFolderId, driveApiKey);
  }

  if (!result) {
    log('warn', 'Menu sources missing, using fallback items');
    result = { items: FALLBACK_ITEMS, status: 200, source: 'missing-config' };
  }

  const payload = {
    items: result.items,
    source: result.source,
    fetchedAt: new Date().toISOString()
  };

  await writeMenuFile(payload);
}

buildMenu().catch(async (error) => {
  log('error', 'Menu build failed, writing fallback', { message: error.message });
  await writeMenuFile({ items: FALLBACK_ITEMS, source: 'build-error', fetchedAt: new Date().toISOString() });
  process.exitCode = 1;
});
