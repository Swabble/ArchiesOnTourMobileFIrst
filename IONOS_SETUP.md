# IONOS Deploy Now - Setup Anleitung

Diese Anleitung erklärt, wie du die Website auf IONOS Deploy Now konfigurierst.

## 🔑 Erforderliche Environment-Variablen

Die folgenden Environment-Variablen müssen im IONOS Deploy Now Dashboard konfiguriert werden:

### Google Calendar API

**`PUBLIC_DRIVE_API_KEY`**
- **Beschreibung**: Google API Key für Calendar und Drive API
- **Wo zu finden**: [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- **Beispiel**: `AIzaSyB1234567890abcdefghijklmnop`

**`PUBLIC_CALENDAR_ID`**
- **Beschreibung**: Google Calendar ID (zu finden in Calendar Settings)
- **Wo zu finden**: Google Calendar → Settings → Calendar Settings → Calendar ID
- **Beispiel**: `deine-email@gmail.com` oder `xyz123@group.calendar.google.com`

### Google Drive API (für Galerie)

**`PUBLIC_GALLERY_FOLDER_ID`**
- **Beschreibung**: Google Drive Folder ID für Galerie-Bilder
- **Wo zu finden**: Öffne den Ordner in Google Drive, die ID ist in der URL: `https://drive.google.com/drive/folders/FOLDER_ID_HIER`
- **Beispiel**: `1a2b3c4d5e6f7g8h9i0j`

---

## 📝 Schritt-für-Schritt: Environment-Variablen setzen

### 1. IONOS Deploy Now Dashboard öffnen
1. Gehe zu [deploy.ionos.com](https://deploy.ionos.com)
2. Wähle dein Projekt aus
3. Navigiere zu **Settings** → **Environment Variables**

### 2. Variablen hinzufügen
Für jede der oben genannten Variablen:
1. Klicke auf **Add Variable**
2. Name: Exakt wie oben angegeben (z.B. `PUBLIC_DRIVE_API_KEY`)
3. Value: Dein entsprechender API-Key/ID
4. Scope: **Build & Runtime**
5. Klicke auf **Save**

### 3. Deployment triggern
Nach dem Setzen der Variablen:
- Gehe zu **Deployments**
- Klicke auf **Trigger Deployment**
- Die Website wird mit den neuen Variablen neu gebaut

---

## 🤖 Automatische Nightly Rebuilds

Ein GitHub Action Workflow wurde eingerichtet, der:
- ✅ **Jeden Tag um 2:00 Uhr UTC** automatisch läuft
- ✅ Die neuesten Daten von Google Calendar & Drive fetcht
- ✅ Die Website neu baut und deployed
- ✅ Auch **manuell** getriggert werden kann

### Manueller Rebuild
1. Gehe zu [GitHub Actions](https://github.com/Swabble/ArchiesOnTourMobileFIrst/actions)
2. Wähle **"Nightly Rebuild"** in der linken Sidebar
3. Klicke auf **"Run workflow"**
4. Wähle den Branch (meist `main`)
5. Klicke auf **"Run workflow"**

Der Rebuild dauert ca. 2-3 Minuten.

---

## 🔍 Google API Keys erstellen

### Google Calendar & Drive API Key

1. **Google Cloud Console öffnen**
   - Gehe zu [console.cloud.google.com](https://console.cloud.google.com)
   - Erstelle ein neues Projekt oder wähle ein bestehendes

2. **APIs aktivieren**
   - Navigiere zu **APIs & Services** → **Library**
   - Suche nach "Google Calendar API" → **Enable**
   - Suche nach "Google Drive API" → **Enable**

3. **API Key erstellen**
   - Gehe zu **APIs & Services** → **Credentials**
   - Klicke auf **Create Credentials** → **API Key**
   - Kopiere den generierten Key
   - **Wichtig**: Klicke auf "Edit API Key" und beschränke den Key:
     - **Application restrictions**: None (oder HTTP referrers mit deiner Domain)
     - **API restrictions**: Restrict key → Wähle "Google Calendar API" und "Google Drive API"
   - Klicke auf **Save**

4. **Calendar ID finden**
   - Öffne [Google Calendar](https://calendar.google.com)
   - Klicke auf die 3 Punkte neben deinem Kalender → **Settings and sharing**
   - Scrolle zu **Integrate calendar**
   - Kopiere die **Calendar ID**

5. **Drive Folder ID finden**
   - Öffne den gewünschten Ordner in [Google Drive](https://drive.google.com)
   - Die URL sieht so aus: `https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j`
   - Die ID ist der letzte Teil: `1a2b3c4d5e6f7g8h9i0j`

6. **Sharing-Einstellungen**
   - **Kalender**: Settings → Share with specific people → Add "Public" oder deine Domain
   - **Drive Folder**: Rechtsklick → Share → "Anyone with the link can view"

---

## 🧪 Lokales Testen

Für lokales Development:

1. Erstelle eine `.env` Datei im Root:
```bash
PUBLIC_DRIVE_API_KEY=dein_api_key_hier
PUBLIC_CALENDAR_ID=dein_kalender_id_hier
PUBLIC_GALLERY_FOLDER_ID=dein_folder_id_hier
```

2. Starte den Dev-Server:
```bash
npm run dev
```

3. Build testen:
```bash
npm run build
npm run preview
```

---

## ❓ Troubleshooting

### "Kalender konnte nicht geladen werden"
- ✅ Überprüfe, ob `PUBLIC_DRIVE_API_KEY` und `PUBLIC_CALENDAR_ID` korrekt gesetzt sind
- ✅ Stelle sicher, dass der Kalender öffentlich geteilt ist
- ✅ Überprüfe in der Google Cloud Console, ob die Calendar API aktiviert ist

### "Galerie konnte nicht geladen werden"
- ✅ Überprüfe `PUBLIC_GALLERY_FOLDER_ID`
- ✅ Stelle sicher, dass der Drive-Ordner mit "Anyone with the link" geteilt ist
- ✅ Überprüfe, ob die Drive API aktiviert ist

### "Menu wird nicht angezeigt"
- Das Menu lädt aus `public/menu.json`
- Stelle sicher, dass die Datei existiert und valides JSON enthält

### "Parallax-Effekt funktioniert nicht"
- Stelle sicher, dass JavaScript im Browser aktiviert ist
- Öffne die Browser-Konsole (F12) und prüfe auf Fehler
- Der Parallax-Effekt ist rein client-side und sollte ohne API-Keys funktionieren

---

## 📊 Datenaktualität

Mit dem statischen Build-Ansatz:
- 🔄 Daten werden **einmal täglich** (nachts um 2 Uhr) aktualisiert
- ⚡ Website ist **extrem schnell** (alles vorgerendert)
- 💰 **Günstigeres Hosting** als dynamische Lösung
- 🚀 **Manueller Rebuild** jederzeit möglich für dringende Updates

Daten sind maximal 24 Stunden alt - für ein Event/Catering-Business völlig ausreichend!

---

## 📞 Support

Bei Problemen:
1. Überprüfe die Browser-Konsole (F12 → Console)
2. Schaue in die GitHub Actions Logs
3. Überprüfe die IONOS Deployment Logs
