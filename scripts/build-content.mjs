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

  // Versuche verschiedene Download-Methoden
  const downloadUrls = [
    // Methode 1: Direkt mit webContentLink (falls verfügbar)
    file.webContentLink,
    // Methode 2: API Download mit alt=media
    `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&supportsAllDrives=true&key=${apiKey}`,
    // Methode 3: Export-URL für öffentliche Dateien
    `https://drive.google.com/uc?export=download&id=${file.id}`,
  ].filter(Boolean); // Entferne undefined Werte

  for (const downloadUrl of downloadUrls) {
    try {
      log('info', `Versuche Download von ${file.name}`, { url: downloadUrl.substring(0, 80) + '...' });
      const response = await fetch(downloadUrl);

      if (!response.ok) {
        log('warn', `Download-Versuch fehlgeschlagen (${response.status})`, { url: downloadUrl.substring(0, 80) });
        continue; // Versuche nächste URL
      }

      const buffer = await response.arrayBuffer();

      // Prüfe ob wir wirklich Bild-Daten bekommen haben (nicht HTML error page)
      if (buffer.byteLength < 1000) {
        log('warn', 'Download zu klein, möglicherweise Fehlerseite', { size: buffer.byteLength });
        continue;
      }

      await ensureDir(GALLERY_ASSET_DIR);
      await fs.writeFile(outputPath, Buffer.from(buffer));

      log('info', `✅ Bild erfolgreich heruntergeladen: ${file.name}`, { size: buffer.byteLength });

      return {
        url: `/assets/gallery/${filename}`,
        thumbnail: `/assets/gallery/${filename}`
      };
    } catch (error) {
      log('warn', `Download-Fehler bei ${downloadUrl.substring(0, 60)}`, { error: error.message });
      continue; // Versuche nächste URL
    }
  }

  // Alle Download-Versuche fehlgeschlagen, nutze Drive-Links als Fallback
  log('warn', 'Alle Download-Versuche fehlgeschlagen, verwende Drive-Links', { id: file.id, name: file.name });
  const url = `https://drive.google.com/uc?export=view&id=${file.id}`;
  const thumbnail = `https://drive.google.com/thumbnail?id=${file.id}&sz=w600`;
  return { url, thumbnail };
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
    `&fields=files(id,name,mimeType,thumbnailLink,webContentLink,webViewLink,permissions)` +
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
  // Start: 1. November des aktuellen Jahres
  const start = new Date(now.getFullYear(), 10, 1); // Monat 10 = November (0-basiert)
  // End: 2 Jahre in die Zukunft ab jetzt
  const end = new Date(now.getFullYear() + 2, 11, 31); // Bis Ende Dezember in 2 Jahren
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

async function validateBuildResults() {
  log('info', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('info', 'Build-Zusammenfassung:');
  log('info', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const results = {
    success: [],
    warnings: [],
    errors: []
  };

  // Validate Menu
  try {
    const menuData = await readJsonFallback(MENU_OUTPUT_PATH, null);
    if (menuData?.source === 'missing-config' || menuData?.source === 'sheet-api-error' || menuData?.source === 'sheet-api-exception') {
      results.warnings.push(`⚠️  Menü: Fallback-Daten verwendet (${menuData.source})`);
      log('warn', `Menü verwendet Fallback-Daten (${menuData.source})`, { items: menuData?.items?.length || 0 });
    } else if (menuData?.items?.length > 0) {
      results.success.push(`✅ Menü: ${menuData.items.length} Items geladen`);
      log('info', `Menü erfolgreich geladen`, { items: menuData.items.length, source: menuData.source });
    } else {
      results.errors.push(`❌ Menü: Keine Daten vorhanden`);
      log('error', 'Menü hat keine Daten');
    }
  } catch (error) {
    results.errors.push(`❌ Menü: Konnte nicht gelesen werden (${error.message})`);
  }

  // Validate Gallery
  try {
    const galleryData = await readJsonFallback(GALLERY_OUTPUT_PATH, null);
    const items = Array.isArray(galleryData) ? galleryData : galleryData?.items || [];
    if (items.length === 0) {
      results.warnings.push(`⚠️  Galerie: Keine Bilder geladen`);
      log('warn', 'Galerie hat keine Bilder');
    } else if (items.some(item => item.url?.includes('unsplash.com'))) {
      results.warnings.push(`⚠️  Galerie: Verwendet Platzhalter-Bilder (${items.length} Bilder)`);
      log('warn', `Galerie verwendet Platzhalter-Bilder`, { items: items.length });
    } else {
      results.success.push(`✅ Galerie: ${items.length} Bilder geladen`);
      log('info', `Galerie erfolgreich geladen`, { items: items.length });
    }
  } catch (error) {
    results.errors.push(`❌ Galerie: Konnte nicht gelesen werden (${error.message})`);
  }

  // Validate Calendar
  try {
    const calendarData = await readJsonFallback(CALENDAR_OUTPUT_PATH, null);
    const events = calendarData?.events || [];
    if (calendarData?.source === 'calendar-fallback' || calendarData?.source === 'missing-config') {
      results.warnings.push(`⚠️  Kalender: Fallback-Daten verwendet (${calendarData.source})`);
      log('warn', `Kalender verwendet Fallback-Daten (${calendarData.source})`, { events: events.length });
    } else if (events.length === 0 && calendarData?.source === 'calendar-empty') {
      results.warnings.push(`⚠️  Kalender: Keine Events im Zeitraum gefunden`);
      log('warn', 'Kalender hat keine Events im Zeitraum');
    } else if (events.length > 0) {
      results.success.push(`✅ Kalender: ${events.length} Events geladen`);
      log('info', `Kalender erfolgreich geladen`, { events: events.length, source: calendarData.source });
    }
  } catch (error) {
    results.errors.push(`❌ Kalender: Konnte nicht gelesen werden (${error.message})`);
  }

  // Print summary
  log('info', '');
  results.success.forEach(msg => log('info', msg));
  results.warnings.forEach(msg => log('warn', msg));
  results.errors.forEach(msg => log('error', msg));
  log('info', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Check for strict mode
  const strictMode = process.env.STRICT_BUILD_MODE === 'true';
  if (strictMode && (results.warnings.length > 0 || results.errors.length > 0)) {
    log('error', '');
    log('error', '🚫 STRICT_BUILD_MODE ist aktiviert - Build fehlgeschlagen wegen Warnungen/Fehlern');
    log('error', '');
    log('error', 'Behebe die API-Konfiguration in der .env Datei:');
    log('error', '  - PUBLIC_DRIVE_API_KEY: Google API Key');
    log('error', '  - PUBLIC_GALLERY_FOLDER_ID: Google Drive Ordner-ID für Galerie');
    log('error', '  - MENU_SHEET_ID: Google Sheets ID für Menü');
    log('error', '  - PUBLIC_CALENDAR_ID: Google Calendar ID');
    log('error', '');
    throw new Error('Build validation failed in strict mode');
  }

  if (results.warnings.length > 0 || results.errors.length > 0) {
    log('warn', '');
    log('warn', '⚠️  Hinweis: Build verwendet Fallback-Daten. Für Production sollten echte API-Daten geladen werden.');
    log('warn', 'Setze STRICT_BUILD_MODE=true in der .env, um den Build bei Fehlern abzubrechen.');
    log('warn', '');
  }

  return results;
}

async function main() {
  log('info', 'Beginne Content-Build');
  log('info', '');

  await buildMenu();
  await Promise.all([buildGallery(), buildCalendar()]);

  log('info', '');
  log('info', 'Content-Build abgeschlossen');
  log('info', '');

  await validateBuildResults();
}

main().catch((error) => {
  console.error(LOG_PREFIX, 'Content-Build fehlgeschlagen', error);
  process.exitCode = 1;
});
