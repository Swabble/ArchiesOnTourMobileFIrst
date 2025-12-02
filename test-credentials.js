// Test-Script für Google Sheets/Drive Credentials
import 'dotenv/config';

const sheetUrl = process.env.MENU_SHEET_URL;
const driveFolderId = process.env.PUBLIC_MENU_FOLDER_ID;
const driveApiKey = process.env.PUBLIC_DRIVE_API_KEY;

console.log('\n🔍 Checking credentials from .env file:\n');
console.log('MENU_SHEET_URL:', sheetUrl ? '✅ Set' : '❌ Missing');
console.log('PUBLIC_MENU_FOLDER_ID:', driveFolderId ? '✅ Set' : '❌ Missing');
console.log('PUBLIC_DRIVE_API_KEY:', driveApiKey ? '✅ Set' : '❌ Missing');

console.log('\n📋 Testing credentials:\n');

// Test Google Sheets URL
if (sheetUrl && !sheetUrl.includes('YOUR_SHEET_ID')) {
  console.log('Testing MENU_SHEET_URL...');
  try {
    const response = await fetch(sheetUrl, {
      signal: AbortSignal.timeout(5000),
      headers: { 'Accept': 'text/csv' }
    });
    console.log(`  Status: ${response.status} ${response.statusText}`);
    console.log(`  Content-Type: ${response.headers.get('content-type')}`);

    if (response.ok) {
      const text = await response.text();
      const lines = text.split('\n').filter(Boolean);
      console.log(`  ✅ Sheet accessible! Found ${lines.length} lines`);
      console.log(`  First line: ${lines[0]?.substring(0, 100)}`);
    } else {
      console.log(`  ❌ Sheet not accessible (HTTP ${response.status})`);
      if (response.status === 404) {
        console.log('  → Sheet might not be public or URL is wrong');
      }
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }
  console.log('');
}

// Test Google Drive API
if (driveFolderId && driveApiKey &&
    !driveFolderId.includes('your_') &&
    !driveApiKey.includes('your_')) {
  console.log('Testing Google Drive API...');
  const query = encodeURIComponent(`'${driveFolderId}' in parents`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&key=${driveApiKey}&fields=files(id,name)`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    console.log(`  Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      console.log(`  ✅ Drive API works! Found ${data.files?.length || 0} files`);
      if (data.files?.length) {
        console.log(`  Files: ${data.files.map(f => f.name).join(', ')}`);
      }
    } else {
      const error = await response.json().catch(() => ({}));
      console.log(`  ❌ Drive API failed (HTTP ${response.status})`);
      console.log(`  Error: ${error.error?.message || 'Unknown error'}`);
      if (response.status === 403) {
        console.log('  → API Key might be invalid or restricted');
      }
      if (response.status === 404) {
        console.log('  → Folder ID might be wrong');
      }
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }
}

console.log('\n');
