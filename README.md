# Archie on Tour – Foodtruck Landingpage

Eine mobile-first Marketing-Site für den Foodtruck „Archie on Tour“, gebaut mit Astro. Alle dynamischen Inhalte (Menü, Galerie, Kalender) laden clientseitig aus Google-Diensten oder aus lokalen Fallbacks.

## Entwicklung

```bash
npm install
npm run dev
```

Weitere Skripte:

- `npm run build` – statischer Produktionsbuild
- `npm run preview` – Vorschau des Builds
- `npm run lint` – ESLint für TS/JS/Astro
- `npm run format` – Prettier für das ganze Repo
- `npm run test:e2e` – Playwright Basiskonfiguration
- `npm run validate:data` – Prüft Galerie-/Menü-Daten

## Inhalte pflegen

### Menü aus Google Sheet

1. Tragen Sie Ihre Produkte in einem Google Sheet oder einer CSV ein.
2. Setzen Sie die Umgebungsvariable `PUBLIC_MENU_SHEET_URL` auf die veröffentlichte CSV/Visualization-URL.
3. Unterstützte Spaltennamen (werden automatisch gemappt): `Titel/Name/Produkt`, `Preis`, `Beschreibung/Notes`, `Einheit`, `Hinweis/Hinweise`, `Kategorie/Category`, `Überkategorie/Ueberkategorie`, `Anzahl/Quantity/Menge`.
4. Fallback-Daten sind in `src/lib/fetchMenu.ts` hinterlegt und werden gecacht (`localStorage`).

### Galerie

- Standard lädt Bilder aus einem Google-Drive-Ordner (`PUBLIC_GALLERY_FOLDER_ID` + `PUBLIC_DRIVE_API_KEY`).
- Ohne API-Key wird `public/data/gallery.json` genutzt. Ergänzen Sie Einträge mit `url`, optional `thumbnail`, `alt`.

### Kalender

- Setzen Sie `PUBLIC_CALENDAR_ID` und `PUBLIC_DRIVE_API_KEY` für Google Calendar.
- Ohne Konfiguration erscheinen Demo-Termine des aktuellen Monats.

### Umgebungsvariablen

Legen Sie eine `.env` basierend auf `.env.example` an:

```
PUBLIC_DRIVE_API_KEY=
PUBLIC_MENU_FOLDER_ID=
PUBLIC_GALLERY_FOLDER_ID=
PUBLIC_CALENDAR_ID=
PUBLIC_MENU_SHEET_URL=
```

## Datenvalidierung

`npm run validate:data` prüft aktuell `public/data/gallery.json` auf Pflichtfelder und gültige URLs. Erweiterbar für Menü-JSON.

## Release-Checkliste

- [ ] UI-Regression auf Mobile & Desktop geprüft (Header, Hero, Sektionen)
- [ ] Lighthouse Mobile Score geprüft (Performance, SEO, Best Practices, Accessibility)
- [ ] Menü/Galerie laden online und aus Cache ohne Fehler
- [ ] Kalender lädt Live-Daten oder zeigt Demo plausibel an
- [ ] Formular + Vertrags-Modal funktionieren (Validierung, Fokus-Stati)
- [ ] Cross-Browser: iOS Safari, Android Chrome/Samsung Internet, Desktop Chrome/Firefox/Safari/Edge

## Struktur

- `src/pages/index.astro` – Hauptseite
- `src/components` – Section-Komponenten inkl. Lightbox & Modal
- `src/lib` – Browser-Logik (Menu-Fetch, Galerie, Kalender, Forms, Utilities)
- `src/styles` – Design Tokens, Layout, Komponenten und Utilities
- `public` – statische Assets, Manifest, Galerie-Fallback

