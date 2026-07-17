#!/usr/bin/env node
// BZH Universe - verificateur de liens internes.
// Scanne les pages HTML gerees par le wiki et signale les href/src locaux
// qui pointent vers un fichier absent. Zero dependance externe.
//
//   node tools/check-links.mjs
//
// Sortie non nulle si au moins un lien casse est trouve (utilisable en CI).
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Racines gerees par les generateurs (on ignore les imports/legacy bruts).
const SCAN_ROOTS = ['docs', 'media', 'hub', 'templates'];
const ROOT_FILES = ['index.html', '404.html'];
// Dossiers de contenu importe/legacy : liens non garantis, hors perimetre.
const IGNORE_DIRS = new Set(['node_modules', '.git', '.github']);
const IGNORE_PREFIXES = ['media/gallery', 'archives/web', 'docs/web/legacy'];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (IGNORE_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (name.toLowerCase().endsWith('.html')) out.push(full);
  }
  return out;
}

function collectFiles() {
  const files = [];
  for (const rootDir of SCAN_ROOTS) {
    const full = join(ROOT, rootDir);
    if (existsSync(full)) walk(full, files);
  }
  for (const f of ROOT_FILES) {
    const full = join(ROOT, f);
    if (existsSync(full)) files.push(full);
  }
  return files;
}

function isExternal(url) {
  return /^(https?:|mailto:|tel:|data:|javascript:|#|\/\/)/i.test(url);
}

function extractRefs(html) {
  const refs = [];
  const re = /(?:href|src)\s*=\s*"([^"]*)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) refs.push(m[1].trim());
  return refs;
}

function targetPath(fileDir, url) {
  const clean = url.split('#')[0].split('?')[0];
  if (!clean) return null;
  let decoded;
  try {
    decoded = decodeURIComponent(clean);
  } catch {
    decoded = clean;
  }
  return decoded.startsWith('/') ? join(ROOT, decoded.slice(1)) : resolve(fileDir, decoded);
}

// Un lien vers une page (.html / dossier) casse = erreur bloquante (navigation).
// Un lien vers un asset (image, audio, video, pdf...) absent = simple avertissement
// (certains medias lourds ne sont volontairement pas versionnes).
const isPageTarget = (url) => {
  const clean = url.split('#')[0].split('?')[0];
  return /\.html?$/i.test(clean) || clean === '' || clean.endsWith('/');
};

const files = collectFiles();
const brokenPages = [];
const brokenAssets = [];
let checked = 0;

for (const file of files) {
  const rel = relative(ROOT, file).split(sep).join('/');
  if (IGNORE_PREFIXES.some((p) => rel.startsWith(p))) continue;
  const html = readFileSync(file, 'utf8');
  const seen = new Set();
  for (const url of extractRefs(html)) {
    if (isExternal(url) || seen.has(url)) continue;
    seen.add(url);
    const target = targetPath(dirname(file), url);
    if (!target) continue;
    checked++;
    if (!existsSync(target)) {
      const entry = { file: rel, url, target: relative(ROOT, target).split(sep).join('/') };
      (isPageTarget(url) ? brokenPages : brokenAssets).push(entry);
    }
  }
}

if (brokenAssets.length) {
  console.warn(`WARN ${brokenAssets.length} asset(s) reference(s) mais absent(s) du disque :`);
  for (const b of brokenAssets) console.warn(`  [${b.file}] -> ${b.url}`);
  console.warn('');
}

if (brokenPages.length) {
  console.error(`KO ${brokenPages.length} lien(s) de page casse(s) sur ${checked} verifie(s) dans ${files.length} pages :\n`);
  for (const b of brokenPages) console.error(`  [${b.file}] -> ${b.url}  (cible manquante: ${b.target})`);
  process.exit(1);
}

console.log(`OK ${checked} liens internes verifies dans ${files.length} pages, aucun lien de page casse.`);
