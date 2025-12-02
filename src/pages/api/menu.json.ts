import type { APIRoute } from 'astro';
import { read, utils } from 'xlsx';
import { Logger, type LoggerLabel } from '../../../node_modules/astro/dist/core/logger/core.js';
import { nodeLogDestination } from '../../../node_modules/astro/dist/core/logger/node.js';
import { FALLBACK_ITEMS, mapRowToItem, parseMenuPayload, type MenuLogger } from '../../lib/menuParser';
import type { MenuItem } from '../../lib/menuTypes';

const LOG_PREFIX = '[menu-api]';
const LOG_LABEL: LoggerLabel = 'env';

type FetchResult = { items: MenuItem[]; status: number; source: string };

const DEFAULT_HEADERS = {
  'cache-control': 'no-store',
  'content-type': 'application/json; charset=utf-8'
};

function log(
  logger: MenuLogger,
  level: keyof MenuLogger,
  message: string,
  details?: Record<string, unknown>
) {
  const fn = logger[level] ?? console[level];
  if (typeof fn !== 'function') return;

  if (logger instanceof Logger) {
    const formattedDetails = details ? ` ${JSON.stringify(details)}` : '';
    fn.call(logger, LOG_LABEL, `${LOG_PREFIX} ${message}${formattedDetails}`);
  } else {
    fn(LOG_PREFIX, message, details ?? '');
  }
}

function normalizeHeaders(headers: Headers): Record<string, string> {
  return Object.fromEntries(Array.from(headers.entries()));
}

async function fetchSheet(url: string, logger: MenuLogger): Promise<FetchResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  log(logger, 'info', 'Fetching menu sheet', { url });

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'text/csv, application/json;q=0.9' }
    });
    const contentType = response.headers.get('content-type') ?? '';
    const body = await response.text();
    log(logger, 'info', 'Sheet response received', {
      status: response.status,
      headers: normalizeHeaders(response.headers),
      contentType,
      preview: body.slice(0, 200)
    });

    if (!response.ok) {
      return { items: FALLBACK_ITEMS, status: response.status, source: 'upstream-error' };
    }

    const items = parseMenuPayload(body, contentType, logger);
    const source = items.length ? 'sheet' : 'fallback-empty';
    if (!items.length) {
      log(logger, 'warn', 'Parsed menu empty, using fallback');
    }

    return { items: items.length ? items : FALLBACK_ITEMS, status: 200, source };
  } catch (error) {
    log(logger, 'error', 'Sheet fetch failed', { message: (error as Error).message });
    return { items: FALLBACK_ITEMS, status: 502, source: 'exception' };
  } finally {
    clearTimeout(timeout);
  }
}

function parseWorkbook(buffer: ArrayBuffer, logger: MenuLogger): MenuItem[] {
  const workbook = read(buffer, { type: 'array' });
  const rows: Record<string, string>[] = [];

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;
    const data = utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
    rows.push(...data);
  });

  const items = rows.map((row) => mapRowToItem(row, logger)).filter((item) => item.title || item.category);
  log(logger, 'info', 'Parsed workbook', { sheetCount: workbook.SheetNames.length, itemCount: items.length });
  return items;
}

async function fetchDriveWorkbook(folderId: string, apiKey: string, logger: MenuLogger): Promise<FetchResult> {
  const query = encodeURIComponent(`'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`);
  const listUrl =
    `https://www.googleapis.com/drive/v3/files` +
    `?q=${query}` +
    `&fields=files(id,name,mimeType)` +
    `&supportsAllDrives=true&includeItemsFromAllDrives=true` +
    `&key=${apiKey}`;

  log(logger, 'info', 'Listing Drive folder for menu', { folderId });

  const listResponse = await fetch(listUrl);
  if (!listResponse.ok) {
    log(logger, 'warn', 'Drive list request failed', { status: listResponse.status });
    return { items: FALLBACK_ITEMS, status: 502, source: 'drive-list-error' };
  }

  const data = await listResponse.json();
  const spreadsheet = (data.files as { id: string; name?: string; mimeType?: string }[] | undefined)?.find((file) => {
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
    log(logger, 'warn', 'No spreadsheet found in Drive folder');
    return { items: FALLBACK_ITEMS, status: 404, source: 'drive-no-file' };
  }

  const isGoogleSheet = spreadsheet.mimeType === 'application/vnd.google-apps.spreadsheet';
  const downloadUrl = isGoogleSheet
    ? `https://docs.google.com/spreadsheets/d/${spreadsheet.id}/export?format=xlsx`
    : `https://www.googleapis.com/drive/v3/files/${spreadsheet.id}?alt=media&supportsAllDrives=true&key=${apiKey}`;

  log(logger, 'info', 'Downloading Drive spreadsheet', { fileId: spreadsheet.id, mimeType: spreadsheet.mimeType });
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    log(logger, 'warn', 'Drive download failed', { status: response.status });
    return { items: FALLBACK_ITEMS, status: 502, source: 'drive-download-error' };
  }

  const buffer = await response.arrayBuffer();
  const items = parseWorkbook(buffer, logger);
  const source = items.length ? 'drive' : 'fallback-empty';

  if (!items.length) {
    log(logger, 'warn', 'Parsed Drive workbook empty, using fallback');
  }

  return { items: items.length ? items : FALLBACK_ITEMS, status: 200, source };
}

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const logger = new Logger({ dest: nodeLogDestination, level: 'info' }) as unknown as MenuLogger;
  const sheetUrl = import.meta.env.MENU_SHEET_URL;
  const driveFolderId = import.meta.env.PUBLIC_MENU_FOLDER_ID;
  const driveApiKey = import.meta.env.PUBLIC_DRIVE_API_KEY;

  log(logger, 'info', 'Menu API request', {
    requestUrl: request.url,
    headers: normalizeHeaders(request.headers)
  });

  log(logger, 'info', 'Environment configuration', {
    sheetUrl: sheetUrl ? '✓ Configured' : '✗ Missing',
    driveFolderId: driveFolderId ? '✓ Configured' : '✗ Missing',
    driveApiKey: driveApiKey ? '✓ Configured' : '✗ Missing'
  });

  let result: FetchResult | null = null;

  if (sheetUrl) {
    log(logger, 'info', 'Attempting to fetch from Google Sheet');
    result = await fetchSheet(sheetUrl, logger);
  }

  if ((!result || result.source !== 'sheet') && driveFolderId && driveApiKey) {
    log(logger, 'info', 'Attempting to fetch from Google Drive folder');
    result = await fetchDriveWorkbook(driveFolderId, driveApiKey, logger);
  }

  if (!result) {
    log(logger, 'warn', 'Menu sources missing, serving fallback items');
    result = { items: FALLBACK_ITEMS, status: 200, source: 'missing-config' };
  }

  log(logger, 'info', 'Returning menu payload', { itemCount: result.items.length, status: result.status, source: result.source });

  return new Response(JSON.stringify({ items: result.items, source: result.source }), {
    status: result.status,
    headers: DEFAULT_HEADERS
  });
};
