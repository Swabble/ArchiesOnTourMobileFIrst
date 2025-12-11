import fs from 'fs';
import path from 'path';

const galleryPath = path.resolve('public/data/gallery.json');

function validateGallery() {
  const raw = fs.readFileSync(galleryPath, 'utf-8');
  const parsed = JSON.parse(raw);
  const items = Array.isArray(parsed?.items) ? parsed.items : Array.isArray(parsed) ? parsed : [];
  if (!items.length) throw new Error('gallery.json enthält keine items');
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
