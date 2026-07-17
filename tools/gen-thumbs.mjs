#!/usr/bin/env node
// BZH Universe - generateur de miniatures pour les apercus d'assets.
// Script de maintenance execute localement uniquement : ni md-to-html.mjs,
// ni media-gallery.mjs, ni la CI n'importent sharp. Les deux generateurs se
// contentent de verifier (fs.existsSync) si une miniature existe deja sous
// assets/site/thumbs/ et l'utilisent si present, sinon retombent sur
// l'image source complete. Le site reste donc "zero dependance" au build ;
// sharp n'intervient que quand un contributeur lance ce script a la main
// apres avoir ajoute des assets.
//
//   node tools/gen-thumbs.mjs
//
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, extname, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const THUMBS_DIR = join(ROOT, 'assets', 'site', 'thumbs');
const SCAN_ROOTS = ['assets', 'media', 'archives'];
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif']);
const IGNORE_NAMES = new Set(['staging', 'thumbs']);
const MIN_SIZE = 40 * 1024; // en dessous, la source est deja assez legere
const THUMB_WIDTH = 480;

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') || IGNORE_NAMES.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (IMAGE_EXT.has(extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

export function thumbPathFor(absSourcePath) {
  const rel = relative(ROOT, absSourcePath).split(sep).join('/');
  return join(THUMBS_DIR, `${rel}.webp`);
}

async function main() {
  const { default: sharp } = await import('sharp');

  const files = SCAN_ROOTS.flatMap((r) => walk(join(ROOT, r)));
  let created = 0;
  let skippedSmall = 0;
  let skippedFresh = 0;
  let failed = 0;

  for (const src of files) {
    const srcStat = statSync(src);
    if (srcStat.size < MIN_SIZE) {
      skippedSmall++;
      continue;
    }
    const dest = thumbPathFor(src);
    if (existsSync(dest) && statSync(dest).mtimeMs >= srcStat.mtimeMs) {
      skippedFresh++;
      continue;
    }
    try {
      mkdirSync(dirname(dest), { recursive: true });
      await sharp(src)
        .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
        .webp({ quality: 72 })
        .toFile(dest);
      created++;
    } catch (err) {
      failed++;
      console.error(`KO  ${relative(ROOT, src)} : ${err.message}`);
    }
  }

  console.log(
    `OK ${created} miniature(s) generee(s), ${skippedFresh} deja a jour, ` +
      `${skippedSmall} source(s) trop legere(s) pour valoir une miniature, ${failed} echec(s).`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
