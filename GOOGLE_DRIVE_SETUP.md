# Google Drive API Setup Guide

This guide will help you set up the Google Drive API to display your images, menu, and calendar.

## Quick Debug View

The website now shows debug information for each section:
- **Gallery**: Shows API key status, folder ID, files found, and sample URLs
- **Menu**: Shows data source, items found, and sample items in JSON format
- **Calendar**: Already working according to your report

Check the browser console (F12) for detailed logs with `[GALLERY DEBUG]` and `[menu-fetch]` prefixes.

## Step 1: Create Google API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Google Drive API
   - Google Calendar API
4. Go to "Credentials" → "Create Credentials" → "API Key"
5. Copy your API key
6. (Recommended) Restrict the API key to only the APIs you need:
   - Click on the API key → "API restrictions" → Select "Restrict key"
   - Choose: Google Drive API, Google Calendar API

## Step 2: Set Up Gallery (Images)

1. Create a folder in Google Drive with your images
2. Right-click the folder → "Share" → "Get link"
3. Set to "Anyone with the link can view"
4. Copy the folder ID from the URL
   - Example URL: `https://drive.google.com/drive/folders/1ABC123xyz`
   - Folder ID is: `1ABC123xyz`

## Step 3: Set Up Menu

You have two options:

### Option A: Direct Google Sheets Export (Recommended)
1. Create a Google Sheet with your menu data
2. Use these column headers (case insensitive):
   - `Produkt` or `Titel` or `Name` → Product name
   - `Preis` or `Preis in €` → Price
   - `Beschreibung` → Description
   - `Einheit` or `Größe` → Unit (e.g., "pro Stück", "0,5l")
   - `Kategorie` → Category
   - `Überkategorie` → Super category
3. File → Share → Get link → "Anyone with the link can view"
4. Use the export URL format:
   ```
   https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/export?format=csv
   ```

### Option B: Google Drive Folder
1. Upload a spreadsheet (.xlsx, .csv, or Google Sheets) to a Drive folder
2. Share the folder publicly
3. Use the folder ID in your .env file

## Step 4: Set Up Calendar

1. Open Google Calendar
2. Find the calendar you want to display
3. Click the three dots → "Settings and sharing"
4. Scroll to "Integrate calendar"
5. Copy the "Calendar ID" (looks like an email address)
6. Make sure "Make available to public" is checked

## Step 5: Configure Environment Variables

Create a `.env` file in the project root with:

```bash
PUBLIC_DRIVE_API_KEY=your_api_key_from_step_1
PUBLIC_GALLERY_FOLDER_ID=your_folder_id_from_step_2
MENU_SHEET_URL=your_sheet_export_url_from_step_3
# OR
PUBLIC_MENU_FOLDER_ID=your_menu_folder_id_from_step_3
PUBLIC_CALENDAR_ID=your_calendar_id_from_step_4
```

## Step 6: Test

1. Restart your development server
2. Open the website
3. Check the debug boxes on each section:
   - They will show you what's configured and what data is being fetched
4. Open browser console (F12) to see detailed logs
5. Look for:
   - `[GALLERY DEBUG]` - Gallery status, files found, URLs
   - `[menu-fetch]` - Menu API responses
   - `[menu-api]` - Server-side menu processing
   - `[menu-parse]` - Menu data parsing

## Troubleshooting

### Gallery shows no images
- Check that folder ID is correct
- Make sure folder is publicly accessible
- Look at browser console for `[GALLERY DEBUG]` messages
- Check if files have `thumbnailLink` in the debug output

### Menu shows fallback items
- Check server logs for `[menu-api]` messages
- Verify Google Sheet is publicly accessible
- Test the export URL directly in your browser
- Make sure sheet has the correct column headers

### Images show titles but no pictures
- This was a bug with URL generation - now fixed
- Check browser console for image loading errors
- Verify files are actually image types (JPG, PNG, etc.)
- Try the new fallback: uses both thumbnailLink and webContentLink

## What's Working Now

✅ **Comprehensive debugging**: See exactly what's happening with API calls
✅ **Better error messages**: Clear indication of what's missing or failing
✅ **Improved image URL handling**: Fallback to multiple URL formats
✅ **Visible debug info**: No need to open console to see basic status
✅ **Server-side logging**: Check what the API is doing on the server

## Current Limitations

- Images require public folder access (not authenticated)
- API key is visible in browser (that's normal for client-side APIs)
- Calendar and Drive APIs have daily quotas (should be sufficient for normal use)
- Fallback data is shown when APIs are not configured
