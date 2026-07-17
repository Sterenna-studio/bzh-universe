#!/usr/bin/env node
// BZH Universe - genere le favicon et l'image de partage social (Open Graph)
// a partir d'un visuel de marque existant. Script de maintenance execute
// localement (comme tools/gen-thumbs.mjs) : sharp n'est jamais importe par
// les generateurs principaux ni par la CI.
//
//   node tools/gen-brand-assets.mjs
//
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'assets', 'logos', 'bzh-chronicles', 'bzhchronicles_esport_badge_v01.png');
const OUT_DIR = join(ROOT, 'assets', 'site');

async function main() {
  const { default: sharp } = await import('sharp');
  mkdirSync(OUT_DIR, { recursive: true });

  const targets = [
    { file: 'favicon-16.png', size: 16 },
    { file: 'favicon-32.png', size: 32 },
    { file: 'apple-touch-icon.png', size: 180 },
  ];
  for (const t of targets) {
    await sharp(SOURCE).resize(t.size, t.size).png().toFile(join(OUT_DIR, t.file));
    console.log(`OK ${t.file} (${t.size}x${t.size})`);
  }

  await sharp(SOURCE).resize(1200, 1200, { fit: 'cover' }).jpeg({ quality: 85 }).toFile(join(OUT_DIR, 'og-image.jpg'));
  console.log('OK og-image.jpg (1200x1200)');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
