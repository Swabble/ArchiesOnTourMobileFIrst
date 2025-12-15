# Lokal Build ausführen - Anleitung

## Problem
Die Claude Code Sandbox kann keine API-Calls machen. Deshalb werden nur Fallback-Daten generiert.

## Lösung: Build lokal ausführen

### Schritt 1: Repository klonen/pullen

```bash
git pull origin claude/analyze-api-integration-mtxV7
```

### Schritt 2: Dependencies installieren

```bash
npm install
```

### Schritt 3: .env ist bereits vorhanden

Die `.env` Datei mit deinen API-Credentials ist bereits im Repository.

### Schritt 4: Build-Daten generieren

> Hinweis: `npm run dev` führt jetzt automatisch `npm run build:data` als Pre-Step aus. Du kannst den Schritt hier trotzdem manuell laufen lassen, wenn du die Ausgabe prüfen möchtest.

```bash
npm run build:data
```

**Erwartete Ausgabe bei Erfolg:**

```
[content-build] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[content-build] Build-Zusammenfassung:
[content-build] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[content-build] ✅ Menü: X Items geladen
[content-build] ✅ Galerie: X Bilder geladen
[content-build] ✅ Kalender: X Events geladen
[content-build] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Schritt 5: Dev-Server starten

```bash
npm run dev
```

Der Dev-Server baut die Daten vor dem Start automatisch (via `predev`), damit Menü, Galerie und Kalender auch lokal mit den gleichen JSONs/Assets laufen.

Öffne: http://localhost:4321

### Schritt 6: Production Build (optional)

```bash
npm run build
```

Dies generiert den `dist/` Ordner mit der fertigen Website.

---

## Was passiert beim Build?

### 1. **Menü-Daten** (Google Sheets)
- Holt Daten aus deinem Google Sheet
- Speichert in `public/data/menu.json`
- Format:
  ```json
  {
    "items": [
      { "title": "...", "price": "...", "category": "..." }
    ],
    "source": "sheet-api",
    "fetchedAt": "2025-12-15T..."
  }
  ```

### 2. **Galerie-Bilder** (Google Drive)
- Listet alle Bilder in deinem Drive-Ordner
- **Lädt Bilder herunter** nach `public/assets/gallery/`
- Speichert Metadaten in `public/data/gallery.json`
- Format:
  ```json
  [
    {
      "url": "/assets/gallery/ABC123.jpg",
      "thumbnail": "/assets/gallery/ABC123.jpg",
      "alt": "Bildname"
    }
  ]
  ```

### 3. **Kalender-Events** (Google Calendar)
- Holt Events für die nächsten 12 Monate
- Speichert in `public/data/calendar.json`
- Format:
  ```json
  {
    "events": [
      {
        "id": "...",
        "title": "...",
        "location": "...",
        "start": "2025-12-20T10:00:00",
        "end": "2025-12-20T18:00:00"
      }
    ],
    "source": "calendar-api",
    "fetchedAt": "2025-12-15T..."
  }
  ```

---

## Überprüfung nach dem Build

### Prüfe die generierten Dateien:

```bash
# Menü prüfen
cat public/data/menu.json | jq '.source'
# Sollte sein: "sheet-api" (nicht "missing-config"!)

# Galerie prüfen
ls -lah public/assets/gallery/
# Sollte Bild-Dateien enthalten (.jpg, .png, etc.)

# Kalender prüfen
cat public/data/calendar.json | jq '.events | length'
# Sollte > 0 sein (wenn Events vorhanden)
```

### Alternative ohne `jq`:

```bash
# Menü prüfen
grep '"source"' public/data/menu.json

# Galerie prüfen
ls public/assets/gallery/ | wc -l

# Kalender prüfen
cat public/data/calendar.json
```

---

## Fehlersuche

### Problem: "sheet-api-exception"

**Symptom:**
```json
{
  "source": "sheet-api-exception"
}
```

**Ursachen:**
- Netzwerk-Problem
- API-Key ungültig
- Sheet nicht öffentlich ("Anyone with the link")

**Lösung:**
```bash
# Teste manuell:
curl "https://sheets.googleapis.com/v4/spreadsheets/DEINE_SHEET_ID/values/A1:Z?key=DEIN_API_KEY"
```

### Problem: Galerie zeigt Unsplash-Bilder

**Symptom:**
```json
{
  "url": "https://images.unsplash.com/..."
}
```

**Ursachen:**
- Drive API-Call fehlgeschlagen
- Folder-ID falsch
- Ordner nicht öffentlich

**Lösung:**
```bash
# Teste manuell:
curl "https://www.googleapis.com/drive/v3/files?q='DEINE_FOLDER_ID'+in+parents&key=DEIN_API_KEY"
```

### Problem: Kalender leer

**Symptom:**
```json
{
  "events": [],
  "source": "calendar-fallback"
}
```

**Ursachen:**
- Keine Events im Zeitraum (nächste 12 Monate)
- Calendar-ID falsch
- Kalender nicht öffentlich

**Lösung:**
```bash
# Teste manuell:
curl "https://www.googleapis.com/calendar/v3/calendars/DEINE_CALENDAR_ID/events?key=DEIN_API_KEY"
```

---

## Deployment nach erfolgreichem Build

### Option 1: Manuell deployen

Nach erfolgreichem Build, committe die generierten Dateien:

```bash
git add public/data/menu.json public/data/gallery.json public/data/calendar.json public/assets/gallery/
git commit -m "Update API-Daten"
git push
```

### Option 2: CI/CD Pipeline

Füge die Environment-Variablen zu deinem Hosting-Provider hinzu:

**Netlify / Vercel / GitHub Actions:**
```
PUBLIC_DRIVE_API_KEY=...
PUBLIC_GALLERY_FOLDER_ID=...
MENU_SHEET_ID=...
PUBLIC_CALENDAR_ID=...
STRICT_BUILD_MODE=true
```

Der Build-Prozess läuft dann automatisch beim Push.

---

## Wichtig: Bilder-Download

Die Galerie lädt die Bilder **beim Build herunter**:

```javascript
// scripts/build-content.mjs:45-67
async function downloadImage(file, apiKey) {
  // 1. Lädt Bild von Drive
  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;

  // 2. Speichert lokal
  await fs.writeFile(`public/assets/gallery/${filename}`, buffer);

  // 3. Gibt lokale URL zurück
  return { url: `/assets/gallery/${filename}` };
}
```

**Ergebnis:**
- Bilder sind lokal in `public/assets/gallery/`
- Website lädt Bilder von **eigenem Server**, nicht von Google Drive
- Schneller & unabhängig von Drive-Verfügbarkeit

---

## Testen der Website

Nach erfolgreichem Build:

### 1. Dev-Server

```bash
npm run dev
```

Öffne http://localhost:4321

### 2. Production-Preview

```bash
npm run build
npm run preview
```

Öffne http://localhost:4321

### 3. Überprüfe die Daten

- **Menü-Sektion**: Sollte deine echten Menü-Items zeigen
- **Galerie-Sektion**: Sollte deine Drive-Bilder zeigen (geladen von `/assets/gallery/`)
- **Kalender-Sektion**: Sollte deine Events zeigen

---

**Erstellt:** 2025-12-15
**Für:** Lokales Build-Testing mit echten API-Daten
