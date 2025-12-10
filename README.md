# Archie on Tour – Foodtruck Catering (Astro)

Single-Page-Marketing-Site für den Foodtruck "Archie on Tour". Das Projekt ist mobile-first aufgebaut, überwiegend statisch auslieferbar und nutzt optionale Integrationen für Google Sheets (Menü), Google Drive (Galerie) und Google Calendar (Verfügbarkeit). Eine serverseitige API-Route liefert das Menü aus und loggt Fetch-Daten für Debugging.

## Quickstart

```bash
npm install
npm run dev
```

Für Produktions-Builds: `npm run build` und `npm run preview`.

## ENV-Variablen

Legen Sie eine `.env` mit folgenden Schlüsseln an (siehe `.env.example`):

- `PUBLIC_DRIVE_API_KEY` – Google API Key für Drive/Calendar (reicht als Lesezugriff für Sheets API).
- `MENU_SHEET_ID` / `MENU_SHEET_RANGE` – Bevorzugt: Google Sheets API Range, kein Publish nötig.
- `PUBLIC_MENU_FOLDER_ID` / `MENU_SHEET_URL` – Alternative Menü-Quellen (Drive-Ordner oder Sheet-Export).
- `PUBLIC_GALLERY_FOLDER_ID` – Drive-Ordner für Galerie-Bilder.
- `PUBLIC_CALENDAR_ID` – Google Calendar ID für Verfügbarkeiten.

Ohne gültige Keys greifen Fallback-Daten (Demo-Menü, Galerie-JSON, Beispieltermine).

## Datenpflege

- **Menü:** Pflege im angebundenen Google Sheet. Spalten sollten Titel/Name, Preis, Beschreibung, Einheit, Hinweise, Kategorie enthalten. Per `MENU_SHEET_ID` liest die Build-Logik direkt via Sheets API (nur Lesezugriff mit API Key, kein Publish des Sheets nötig). Alternativ kann weiterhin ein Export-Link in `MENU_SHEET_URL` oder ein Drive-Ordner genutzt werden.
- **Galerie:** Standard-Fallback liegt unter `public/data/gallery.json` (Felder: `url`, `thumbnail`, `alt`). Bei aktiver Drive-Integration wird der Ordner per API geladen.
- **Kalender:** Google Calendar muss öffentlich lesbar sein; ID in `PUBLIC_CALENDAR_ID` eintragen.

## Skripte

- `npm run lint` – ESLint für `.astro`, `.ts`, `.js`.
- `npm run format` – Prettier.
- `npm run test:e2e` – Playwright Grundgerüst.
- `npm run validate:data` – Prüft Galerie-JSON auf Pflichtfelder.

## Release-Checkliste

- [ ] UI-Regression geprüft (Header, Hero, Sektionen)
- [ ] Lighthouse Mobile Score kontrolliert (Performance, SEO, Accessibility)
- [ ] Menü/Galerie laden fehlerfrei (online + Fallback)
- [ ] Kalender zeigt Live-Daten oder plausible Demo-Termine
- [ ] Formular + Contract Modal auf Mobile & Desktop getestet
- [ ] Cross-Browser: iOS Safari, Android Chrome, Samsung Internet, Desktop Chrome/Firefox/Safari/Edge

## Hosting-Hinweise

Das Projekt wird als vollständig statisches Astro-Build ausgeliefert (`output: 'static'`). Hostings sollten den generierten `dist/`-Ordner direkt bedienen; es ist kein Node.js-Server nötig. Setzen Sie lange Cache-Header für Assets (`public, max-age=31536000, immutable`) und kurze für HTML.

## Deploy Now (Static)

Für IONOS Deploy Now als statisches Deployment:

- Installation: `npm ci`
- Build: `npm run build`
- Deployment-Output: `dist` als Dokumentenstamm; keine `startCommand`/Node-Runtime erforderlich
- Optionaler Healthcheck: `/index.html` (statisch)

Wichtige Deploy-Now-ENV-Variablen für die Menü-API (siehe `.env.example`):

- `PUBLIC_DRIVE_API_KEY`
- `MENU_SHEET_ID` / `MENU_SHEET_RANGE`
- `PUBLIC_MENU_FOLDER_ID`
- `MENU_SHEET_URL`
