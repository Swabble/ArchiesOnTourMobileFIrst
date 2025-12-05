import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { FALLBACK_ITEMS } from '../../lib/menuParser';

const DEFAULT_HEADERS = {
  'cache-control': 'no-store',
  'content-type': 'application/json; charset=utf-8'
};

export const prerender = true;

export const GET: APIRoute = async () => {
  const menuPath = path.resolve('public/menu.json');

  try {
    const payload = await readFile(menuPath, 'utf-8');
    return new Response(payload, { headers: DEFAULT_HEADERS });
  } catch (error) {
    console.warn('[menu-api]', 'Falling back to default items', { message: (error as Error).message });
    return new Response(JSON.stringify({ items: FALLBACK_ITEMS, source: 'api-fallback' }), {
      headers: DEFAULT_HEADERS,
      status: 200
    });
  }
};
