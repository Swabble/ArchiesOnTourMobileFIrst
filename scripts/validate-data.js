#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const galleryPath = path.join(process.cwd(), 'public/data/gallery.json');
const galleryRaw = fs.readFileSync(galleryPath, 'utf8');
const gallery = JSON.parse(galleryRaw);

const errors = [];

gallery.forEach((item, index) => {
  if (!item.url) errors.push(`Bild ${index + 1}: url fehlt`);
  try {
    new URL(item.url);
  } catch {
    errors.push(`Bild ${index + 1}: ungültige URL`);
  }
});

if (errors.length) {
  console.error('Validierung fehlgeschlagen');
  errors.forEach((err) => console.error(`- ${err}`));
  process.exit(1);
}

console.log('Daten sehen gut aus.');
