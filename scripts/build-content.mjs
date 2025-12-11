import fs from 'node:fs/promises';
import path from 'node:path';
import { buildMenu, MENU_OUTPUT_PATH } from './build-menu.mjs';

const LOG_PREFIX = '[content-build]';

const GALLERY_OUTPUT_PATH = path.resolve('public/data/gallery.json');
const GALLERY_ASSET_DIR = path.resolve('public/assets/gallery');
const CALENDAR_OUTPUT_PATH = path.resolve('public/data/calendar.json');

function log(level, message, details) {
  const fn = console[level] ?? console.info;
  if (typeof fn !== 'function') return;
  fn(LOG_PREFIX, message, details ?? '');
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJsonFallback(filePath, defaultValue) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return defaultValue;
  }
}

async function writeJson(filePath, data) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

function resolveExtension(name, mimeType) {
  const extensionFromName = path.extname(name || '').replace(/\?.*$/, '');
  if (extensionFromName) return extensionFromName;
  if (mimeType === 'image/jpeg') return '.jpg';
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  if (mimeType === 'image/gif') return '.gif';
  return '.img';
}

async function downloadImage(file, apiKey) {
  const extension = resolveExtension(file.name, file.mimeType);
  const filename = `${file.id}${extension}`;
  const outputPath = path.join(GALLERY_ASSET_DIR, filename);
  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&supportsAllDrives=true&key=${apiKey}`;
  try {
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Download fehlgeschlagen (${response.status})`);
    }
    const buffer = await response.arrayBuffer();
    await ensureDir(GALLERY_ASSET_DIR);
    await fs.writeFile(outputPath, Buffer.from(buffer));
    return {
      url: `/assets/gallery/${filename}`,
      thumbnail: `/assets/gallery/${filename}`
    };
  } catch (error) {
    log('warn', 'Bild-Download fehlgeschlagen, verwende Drive-Links', { id: file.id, error: error.message });
    const url = `https://drive.google.com/uc?export=view&id=${file.id}`;
    const thumbnail = `https://drive.google.com/thumbnail?id=${file.id}&sz=w600`;
    return { url, thumbnail };
  }
}

async function fetchGallery() {
  const apiKey = process.env.PUBLIC_DRIVE_API_KEY;
  const folderId = process.env.PUBLIC_GALLERY_FOLDER_ID;
  const fallbackItems = await readJsonFallback(GALLERY_OUTPUT_PATH, []);

  if (!apiKey || !folderId) {
    log('warn', 'Gallery-Konfiguration fehlt, verwende Fallback');
    return { items: fallbackItems, source: 'missing-config' };
  }

  const query = encodeURIComponent(`'${folderId}' in parents and mimeType contains 'image/' and trashed = false`);
  const listUrl =
    `https://www.googleapis.com/drive/v3/files` +
    `?q=${query}` +
    `&fields=files(id,name,mimeType,thumbnailLink)` +
    `&supportsAllDrives=true&includeItemsFromAllDrives=true` +
    `&key=${apiKey}`;

  log('info', 'Rufe Galerie-Liste von Drive ab');
  const listResponse = await fetch(listUrl);
  if (!listResponse.ok) {
    log('warn', 'Drive-Liste fehlgeschlagen', { status: listResponse.status });
    return { items: fallbackItems, source: 'drive-list-error' };
  }

  const data = await listResponse.json();
  const files = Array.isArray(data.files) ? data.files : [];
  log('info', 'Drive-Dateien gefunden', { count: files.length });

  const entries = [];
  for (const file of files) {
    try {
      const { url, thumbnail } = await downloadImage(file, apiKey);
      entries.push({
        url,
        thumbnail: thumbnail || url,
        alt: file.name || 'Galeriebild'
      });
    } catch (error) {
      log('warn', 'Galerie-Eintrag konnte nicht verarbeitet werden', { id: file.id, error: error.message });
    }
  }

  if (!entries.length) {
    log('warn', 'Keine Galerie-Einträge aus Drive, verwende Fallback');
    return { items: fallbackItems, source: 'drive-empty' };
  }

  return { items: entries, source: 'drive' };
}

async function buildGallery() {
  log('info', 'Starte Galerie-Build');
  const fallbackItems = await readJsonFallback(GALLERY_OUTPUT_PATH, []);
  try {
    const result = await fetchGallery();
    const payload = {
      items: result.items.length ? result.items : fallbackItems,
      source: result.source,
      fetchedAt: new Date().toISOString()
    };
    await writeJson(GALLERY_OUTPUT_PATH, payload.items ? payload.items : []);
    log('info', 'Galerie-Datei geschrieben', { path: GALLERY_OUTPUT_PATH, itemCount: payload.items.length });
  } catch (error) {
    log('error', 'Galerie-Build fehlgeschlagen, schreibe Fallback', { message: error.message });
    await writeJson(GALLERY_OUTPUT_PATH, fallbackItems);
  }
}

function getCalendarRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear() + 1, now.getMonth(), 0);
  return { start, end };
}

async function fetchCalendarEvents() {
  const apiKey = process.env.PUBLIC_DRIVE_API_KEY;
  const calendarId = process.env.PUBLIC_CALENDAR_ID;
  if (!apiKey || !calendarId) {
    throw new Error('Calendar-Konfiguration fehlt');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const { start, end } = getCalendarRange();
  const timeMin = start.toISOString();
  const timeMax = end.toISOString();
  const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?key=${apiKey}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;

  try {
    log('info', 'Rufe Calendar API ab', { timeMin, timeMax });
    const response = await fetch(url, { signal: controller.signal });
    const body = await response.text();
    if (!response.ok) {
      throw new Error(`Calendar API Fehler (${response.status})`);
    }
    const data = JSON.parse(body);
    const events = (data.items || []).map((item) => ({
      id: item.id,
      title: item.summary,
      location: item.location,
      start: item.start?.dateTime || item.start?.date,
      end: item.end?.dateTime || item.end?.date
    }));
    log('info', 'Kalenderdaten erhalten', { count: events.length });
    return { events, timeMin, timeMax };
  } finally {
    clearTimeout(timeout);
  }
}

async function buildCalendar() {
  log('info', 'Starte Kalender-Build');
  const fallback = await readJsonFallback(CALENDAR_OUTPUT_PATH, { events: [] });
  try {
    const { events, timeMin, timeMax } = await fetchCalendarEvents();
    const payload = {
      events: events.length ? events : fallback.events || [],
      source: events.length ? 'calendar-api' : 'calendar-empty',
      fetchedAt: new Date().toISOString(),
      timeMin,
      timeMax
    };
    await writeJson(CALENDAR_OUTPUT_PATH, payload);
    log('info', 'Kalender-Datei geschrieben', { path: CALENDAR_OUTPUT_PATH, eventCount: payload.events.length });
  } catch (error) {
    log('warn', 'Kalender-Build fehlgeschlagen, verwende Fallback', { message: error.message });
    await writeJson(CALENDAR_OUTPUT_PATH, {
      events: fallback.events || [],
      source: 'calendar-fallback',
      fetchedAt: new Date().toISOString()
    });
  }
}

async function main() {
  log('info', 'Beginne Content-Build');
  await buildMenu();
  await Promise.all([buildGallery(), buildCalendar()]);
  log('info', 'Content-Build abgeschlossen', { menuPath: MENU_OUTPUT_PATH, galleryPath: GALLERY_OUTPUT_PATH, calendarPath: CALENDAR_OUTPUT_PATH });
}

main().catch((error) => {
  console.error(LOG_PREFIX, 'Content-Build fehlgeschlagen', error);
  process.exitCode = 1;
});
