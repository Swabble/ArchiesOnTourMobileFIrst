import type { MenuItem } from './menuTypes';

export type MenuLogger = Pick<Console, 'info' | 'warn' | 'error' | 'debug'>;

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

export const FALLBACK_ITEMS: MenuItem[] = [
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

const LOG_PREFIX = '[menu-parse]';

function log(
  logger: MenuLogger,
  level: keyof MenuLogger,
  message: string,
  details?: Record<string, unknown>
) {
  const fn = logger[level] ?? console[level];
  if (typeof fn !== 'function') return;
  fn(LOG_PREFIX, message, details ?? '');
}

function normalizeValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

export function mapRowToItem(row: Record<string, unknown>, logger: MenuLogger = console): MenuItem {
  const item: Partial<MenuItem> = {};
  Object.entries(row).forEach(([rawKey, value]) => {
    const normalizedKey = rawKey.toString().trim().toLowerCase();
    const key = HEADER_MAP[normalizedKey] ?? (normalizedKey as keyof MenuItem);
    const normalizedValue = normalizeValue(value);
    if (key) item[key] = normalizedValue.trim();
  });
  if (!item.title && !item.category) {
    log(logger, 'debug', 'Skipping row without title/category', row);
  }
  return item as MenuItem;
}

export function parseMatrix(
  headers: string[],
  rows: string[][],
  logger: MenuLogger = console
): MenuItem[] {
  log(logger, 'info', 'Parsing matrix', { headers, rowCount: rows.length });
  return rows
    .map((columns) => {
      const record: Record<string, string> = {};
      headers.forEach((header, idx) => {
        record[header] = columns[idx] ?? '';
      });
      return record;
    })
    .map((record) => mapRowToItem(record, logger))
    .filter((item) => item.title || item.category);
}

export function parseCsv(text: string, logger: MenuLogger = console): MenuItem[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const lines = trimmed.split(/\r?\n/).filter(Boolean);
  const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
  log(logger, 'info', 'Detected CSV delimiter', { delimiter });
  const headers = lines[0].split(delimiter).map((h) => h.trim());
  const rows = lines.slice(1).map((line) => line.split(delimiter));
  return parseMatrix(headers, rows, logger);
}

export function parseJsonPayload(text: string, logger: MenuLogger = console): MenuItem[] {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      log(logger, 'info', 'Parsing JSON array payload', { length: parsed.length });
      return parsed.map((entry) => mapRowToItem(entry, logger));
    }
    if (Array.isArray(parsed?.values)) {
      const [headerRow, ...dataRows] = parsed.values as string[][];
      if (!headerRow) return [];
      log(logger, 'info', 'Parsing JSON matrix payload', { rowCount: dataRows.length });
      return parseMatrix(headerRow, dataRows, logger);
    }
  } catch (err) {
    log(logger, 'warn', 'Menu JSON parse failed', { error: (err as Error).message });
  }
  return [];
}

export function parseMenuPayload(
  text: string,
  contentType?: string,
  logger: MenuLogger = console
): MenuItem[] {
  const normalizedType = contentType?.toLowerCase() ?? '';
  const items = normalizedType.includes('application/json')
    ? parseJsonPayload(text, logger)
    : parseCsv(text, logger);
  log(logger, 'info', 'Parsed menu result', { itemCount: items.length });
  return items;
}
