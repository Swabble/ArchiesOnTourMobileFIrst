import type { APIRoute } from 'astro';
import { Logger, type LoggerLabel } from '../../../node_modules/astro/dist/core/logger/core.js';
import { nodeLogDestination } from '../../../node_modules/astro/dist/core/logger/node.js';
import { FALLBACK_ITEMS, parseMenuPayload, type MenuLogger } from '../../lib/menuParser';
import type { MenuItem } from '../../lib/menuTypes';

const LOG_PREFIX = '[menu-api]';
const LOG_LABEL: LoggerLabel = 'env';

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

async function fetchSheet(url: string, logger: MenuLogger): Promise<{ items: MenuItem[]; status: number; source: string }> {
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

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const logger = new Logger({ dest: nodeLogDestination, level: 'info' }) as unknown as MenuLogger;
  const sheetUrl = import.meta.env.MENU_SHEET_URL;

  log(logger, 'info', 'Menu API request', {
    requestUrl: request.url,
    headers: normalizeHeaders(request.headers)
  });

  if (!sheetUrl) {
    log(logger, 'warn', 'MENU_SHEET_URL missing, serving fallback items');
    return new Response(
      JSON.stringify({ items: FALLBACK_ITEMS, source: 'missing-url' }),
      { status: 200, headers: DEFAULT_HEADERS }
    );
  }

  const { items, status, source } = await fetchSheet(sheetUrl, logger);

  log(logger, 'info', 'Returning menu payload', { itemCount: items.length, status, source });

  return new Response(JSON.stringify({ items, source }), {
    status,
    headers: DEFAULT_HEADERS
  });
};
