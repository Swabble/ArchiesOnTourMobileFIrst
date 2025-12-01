import fs from 'fs';
import path from 'path';

const galleryPath = path.resolve('public/data/gallery.json');

function validateGallery() {
  const raw = fs.readFileSync(galleryPath, 'utf-8');
  const items = JSON.parse(raw);
  if (!Array.isArray(items)) throw new Error('gallery.json muss ein Array sein');
  items.forEach((item, index) => {
    if (!item.url || !item.alt) {
      throw new Error(`Galerie-Eintrag ${index} fehlt url oder alt`);
    }
  });
  console.log(`Galerie ok (${items.length} Einträge)`);
}

try {
  validateGallery();
  console.log('Validierung erfolgreich');
} catch (error) {
  console.error('Validierung fehlgeschlagen:', error.message);
  process.exit(1);
}
