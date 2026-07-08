#!/usr/bin/env node
// Generate a browsable media gallery from repository assets.
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = join(ROOT, 'media', 'gallery');
const OUTPUT_HTML = join(OUTPUT_DIR, 'index.html');
const OUTPUT_JSON = join(OUTPUT_DIR, 'inventory.json');
const SCAN_ROOTS = [
  'assets/cards',
  'assets/characters',
  'assets/logos',
  'assets/merch',
  'media/audio',
  'media/video',
  'media/visual',
];
const EXTENSIONS = new Map([
  ['.gif', 'image'],
  ['.ico', 'image'],
  ['.jpg', 'image'],
  ['.jpeg', 'image'],
  ['.png', 'image'],
  ['.svg', 'image'],
  ['.webp', 'image'],
  ['.flac', 'audio'],
  ['.m4a', 'audio'],
  ['.mp3', 'audio'],
  ['.ogg', 'audio'],
  ['.wav', 'audio'],
  ['.m4v', 'video'],
  ['.mov', 'video'],
  ['.mp4', 'video'],
  ['.webm', 'video'],
]);

const CATEGORY_ORDER = [
  'Logos',
  'Personnages',
  'TCG',
  'Covers et mockups',
  'Webtoon',
  'Merch',
  'Social et stream',
  'Wallpapers',
  'References',
  'Audio',
  'Video',
  'Autres',
];

const CATEGORY_SLUGS = Object.fromEntries(CATEGORY_ORDER.map((name) => [name, slug(name)]));
const READABLE_WORDS = new Map([
  ['ai', 'AI'],
  ['aligax', 'Aligax'],
  ['bzh', 'BZH'],
  ['bzhchronicles', 'BZH Chronicles'],
  ['bzhchronicles64', 'BZH Chronicles 64'],
  ['bzhpower', 'BZH POWER'],
  ['bzhpw', 'BZH PW'],
  ['cd', 'CD'],
  ['drspig', 'DrSpig'],
  ['gabilone', 'Gabilone'],
  ['gabylon', 'Gabylon'],
  ['gif', 'GIF'],
  ['ia', 'IA'],
  ['leme', 'LEME'],
  ['lemegeton', 'LEMEGETON'],
  ['mp3', 'MP3'],
  ['mutenrock', 'MutenRock'],
  ['neo', 'Neo'],
  ['pc', 'PC'],
  ['pw', 'PW'],
  ['rtt', 'RTT'],
  ['sniky', 'Sniky'],
  ['sorn', 'Sorn'],
  ['spirit', 'Spirit'],
  ['spike', 'Spike'],
  ['tcg', 'TCG'],
  ['titan', 'Titan'],
  ['vdt', 'VDT'],
  ['vr', 'VR'],
]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === '.gitkeep' || name === 'Thumbs.db') continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (!full.includes(`${sep}staging${sep}`)) walk(full, out);
    } else {
      const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
      if (EXTENSIONS.has(ext)) out.push(full);
    }
  }
  return out;
}

function slug(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function relativeUrl(fromDir, targetRel) {
  const from = fromDir.split('/').filter(Boolean);
  const up = '../'.repeat(from.length);
  return up + targetRel.split('/').map(encodeURIComponent).join('/');
}

function categoryFor(rel, type) {
  if (type === 'audio') return 'Audio';
  if (type === 'video') return 'Video';
  if (rel.startsWith('assets/logos/')) return 'Logos';
  if (rel.startsWith('assets/characters/')) return 'Personnages';
  if (rel.startsWith('assets/cards/')) return 'TCG';
  if (rel.startsWith('assets/merch/') || rel.startsWith('media/visual/merch/')) return 'Merch';
  if (rel.startsWith('media/visual/covers/')) return 'Covers et mockups';
  if (rel.startsWith('media/visual/webtoon/')) return 'Webtoon';
  if (rel.startsWith('media/visual/social/')) return 'Social et stream';
  if (rel.startsWith('media/visual/wallpapers/')) return 'Wallpapers';
  if (rel.startsWith('media/visual/references/')) return 'References';
  return 'Autres';
}

function titleFor(rel) {
  const file = rel.split('/').pop() ?? rel;
  return readableText(file);
}

function readableWord(word) {
  const lower = word.toLowerCase();
  if (READABLE_WORDS.has(lower)) return READABLE_WORDS.get(lower);
  if (/^v\d+$/i.test(word)) return lower;
  if (/^\d+$/.test(word)) return word;
  if (word.length <= 2 && word === word.toUpperCase()) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function readableText(value) {
  return String(value)
    .replace(/\.[^.]+$/, '')
    .replace(/bzhchronicles64/gi, 'BZH Chronicles 64')
    .replace(/bzhchronicles/gi, 'BZH Chronicles')
    .replace(/bzhpower/gi, 'BZH POWER')
    .replace(/bzhpw/gi, 'BZH PW')
    .replace(/[_-]+/g, ' ')
    .replace(/\bv(\d+)\b/gi, 'v$1')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(readableWord)
    .join(' ');
}

function collectionFor(rel, category) {
  const parts = rel.split('/');
  if (rel.startsWith('assets/logos/')) return readableText(parts[2] || 'Logos');
  if (rel.startsWith('assets/characters/')) return readableText(parts[2] || 'Personnages');
  if (rel.startsWith('assets/cards/')) return readableText(parts[2] || 'TCG');
  if (rel.startsWith('media/audio/')) return readableText(parts.slice(2, -1).join(' / ') || 'Audio');
  if (rel.startsWith('media/video/')) return readableText(parts.slice(2, -1).join(' / ') || 'Video');
  if (rel.startsWith('media/visual/')) return readableText(parts.slice(2, -1).join(' / ') || category);
  return category;
}

function statusFor(rel, category, type) {
  if (rel.startsWith('assets/cards/bzh01/cards/')) return 'canon';
  if (rel.startsWith('assets/cards/bzh02/cards/')) return 'a confirmer';
  if (rel.startsWith('assets/cards/reference/') || rel.includes('/reference/')) return 'reference';
  if (rel.startsWith('media/audio/masters/')) return 'master';
  if (type === 'audio') return 'reference';
  if (type === 'video') return 'reference';
  if (rel.startsWith('assets/logos/')) return 'canon / variante';
  if (rel.startsWith('assets/characters/')) return 'reference';
  if (rel.startsWith('media/visual/merch/')) return 'piste / reference';
  if (category === 'TCG') return 'canon / a confirmer';
  return 'reference';
}

function mediaMarkup(item) {
  const src = escapeHtml(item.url);
  const title = escapeHtml(item.title);
  if (item.type === 'audio') {
    return `<audio controls preload="none" src="${src}"></audio>`;
  }
  if (item.type === 'video') {
    return `<video controls preload="metadata" src="${src}"></video>`;
  }
  return `<img src="${src}" alt="${title}" loading="lazy" decoding="async">`;
}

function card(item) {
  const category = escapeHtml(CATEGORY_SLUGS[item.category] ?? slug(item.category));
  const title = escapeHtml(item.title);
  const path = escapeHtml(item.path);
  const type = escapeHtml(item.type);
  const size = escapeHtml(item.sizeLabel);
  const collection = escapeHtml(item.collection);
  const status = escapeHtml(item.status);
  return `<article class="media-card" data-media-card data-category="${category}" data-search="${title.toLowerCase()} ${collection.toLowerCase()} ${status.toLowerCase()} ${path.toLowerCase()}">
  <a class="media-thumb" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" aria-label="Ouvrir ${title}">
    ${mediaMarkup(item)}
  </a>
  <div class="media-card-body">
    <h3>${title}</h3>
    <p class="media-collection">${collection}</p>
    <p class="media-path">${path}</p>
    <div class="media-meta"><span>${escapeHtml(item.category)}</span><span>${status}</span><span>${type}</span><span>${size}</span></div>
  </div>
</article>`;
}

function statusSummary(items) {
  const statuses = [...new Set(items.map((item) => item.status))];
  if (statuses.length <= 2) return statuses.join(' / ');
  return `${statuses.slice(0, 2).join(' / ')} / mixte`;
}

function atlas(grouped) {
  const entries = CATEGORY_ORDER
    .filter((name) => grouped.has(name))
    .map((name) => {
      const id = CATEGORY_SLUGS[name] ?? slug(name);
      const items = grouped.get(name);
      return `<a class="media-atlas-item" href="#${escapeHtml(id)}">
        <strong>${escapeHtml(name)}</strong>
        <span>${items.length} fichier${items.length > 1 ? 's' : ''}</span>
        <small>${escapeHtml(statusSummary(items))}</small>
      </a>`;
    })
    .join('\n    ');
  return `<div class="media-atlas" aria-label="Atlas media rapide">
    ${entries}
  </div>`;
}

function section(name, items) {
  const id = CATEGORY_SLUGS[name] ?? slug(name);
  return `<section class="media-section" data-media-section data-category="${escapeHtml(id)}" aria-labelledby="${escapeHtml(id)}">
  <div class="media-section-heading">
    <h2 id="${escapeHtml(id)}">${escapeHtml(name)}</h2>
    <span>${items.length} fichier${items.length > 1 ? 's' : ''}</span>
  </div>
  <div class="media-grid">
    ${items.map(card).join('\n    ')}
  </div>
</section>`;
}

function readerControls() {
  return `<div class="reader-controls" aria-label="Options de lecture">
    <button class="reader-control" type="button" data-reader-action="font-down" title="Reduire la taille du texte">A-<span class="reader-control-label">Reduire la taille du texte</span></button>
    <button class="reader-control" type="button" data-reader-action="font-reset" title="Reinitialiser la taille du texte">A<span class="reader-control-label">Reinitialiser la taille du texte</span></button>
    <button class="reader-control" type="button" data-reader-action="font-up" title="Augmenter la taille du texte">A+<span class="reader-control-label">Augmenter la taille du texte</span></button>
    <button class="reader-control" type="button" data-reader-action="dyslexic" aria-pressed="false">Dys<span class="reader-control-label">Activer OpenDyslexic</span></button>
    <button class="reader-control" type="button" data-reader-action="theme" aria-pressed="false">☼<span class="reader-control-label">Changer de theme</span></button>
  </div>`;
}

function searchBox() {
  return `<form class="wiki-search" data-wiki-search-form role="search" autocomplete="off">
    <label>
      <span class="reader-control-label">Recherche globale</span>
      <input type="search" data-wiki-search-input placeholder="Recherche" aria-label="Recherche globale">
    </label>
    <div class="wiki-search-results" data-wiki-search-results hidden></div>
  </form>`;
}

function sidebar(grouped) {
  const links = CATEGORY_ORDER
    .filter((name) => grouped.has(name))
    .map((name) => `<a class="sidebar-link" href="#${CATEGORY_SLUGS[name]}">${escapeHtml(name)}</a>`)
    .join('\n      ');

  return `<aside class="wiki-sidebar" aria-label="Navigation galerie">
    <section class="sidebar-section">
      <p class="sidebar-title">Demarrer</p>
      <a class="sidebar-link" href="../../hub/index.html">Accueil du hub</a>
      <a class="sidebar-link" href="../../docs/00-index.html">Index documentaire</a>
      <a class="sidebar-link" href="../catalog/media-catalog.html">Catalogue medias</a>
      <a class="sidebar-link" href="./index.html">Galerie consultable</a>
      <a class="sidebar-link" href="../README.html">README media</a>
    </section>
    <section class="sidebar-section">
      <p class="sidebar-title">Rattachements</p>
      <a class="sidebar-link" href="../../docs/media/musique-et-albums.html">Musique et albums</a>
      <a class="sidebar-link" href="../../docs/media/trailers-et-scripts.html">Trailers et scripts</a>
      <a class="sidebar-link" href="../../docs/identity/direction-artistique.html">Direction artistique</a>
      <a class="sidebar-link" href="../../docs/archives/import-desktop-bzh.html">Import Desktop BZH</a>
    </section>
    <section class="sidebar-section">
      <p class="sidebar-title">Sections</p>
      ${links}
    </section>
  </aside>`;
}

function page(items, grouped) {
  const options = CATEGORY_ORDER
    .filter((name) => grouped.has(name))
    .map((name) => `<option value="${CATEGORY_SLUGS[name]}">${escapeHtml(name)}</option>`)
    .join('\n        ');
  const sections = CATEGORY_ORDER
    .filter((name) => grouped.has(name))
    .map((name) => section(name, grouped.get(name)))
    .join('\n');

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Galerie media - BZH Universe</title>
<link rel="stylesheet" href="../../assets/site/wiki.css">
<script defer src="../../assets/site/wiki-search-index.js"></script>
<script defer src="../../assets/site/wiki.js"></script>
</head>
<body>
<a class="skip-link" href="#content">Aller au contenu</a>
<header class="wiki-topbar">
  <a class="wiki-brand" href="../../hub/index.html">
    <span class="wiki-brand-mark" aria-hidden="true"></span>
    <span><span class="wiki-brand-kicker">Archive numerique</span><span class="wiki-brand-name">BZH Universe</span></span>
  </a>
  <nav class="wiki-toplinks" aria-label="Acces rapides">
    <a class="wiki-pill" href="../../docs/00-index.html">Index</a>
    <a class="wiki-pill" href="../../docs/universe/00-vision-globale.html">Univers</a>
    <a class="wiki-pill" href="../../docs/universe/personnages.html">Personnages</a>
    <a class="wiki-pill" href="../../docs/projects/00-carte-des-projets.html">Projets</a>
    <a class="wiki-pill" href="../catalog/media-catalog.html">Medias</a>
    <a class="wiki-pill" href="./index.html">Galerie</a>
    <a class="wiki-pill" href="../../docs/conversations/index.html">Sources</a>
  </nav>
  ${searchBox()}
  ${readerControls()}
</header>
<div class="wiki-layout">
${sidebar(grouped)}
<main class="wiki-page gallery-page" id="content">
  <div class="breadcrumb">media/gallery/index.html</div>
  <h1>Galerie media</h1>
  <p>Vue consultable des logos, personnages, covers, webtoon, merch, social, wallpapers et references. Chaque carte ouvre le fichier original.</p>
  <div class="media-gallery-summary" aria-label="Resume de la galerie">
    <span><strong>${items.length}</strong> fichiers</span>
    <span><strong>${grouped.size}</strong> sections</span>
    <span>Noms lisibles sans renommer les sources</span>
    <a href="./inventory.json">Inventaire JSON</a>
  </div>
  ${atlas(grouped)}
  <form class="media-toolbar" data-media-toolbar role="search">
    <label>
      <span>Recherche</span>
      <input type="search" data-media-search placeholder="Nom, chemin, type">
    </label>
    <label>
      <span>Categorie</span>
      <select data-media-category>
        <option value="all">Toutes</option>
        ${options}
      </select>
    </label>
    <p class="media-result-count" data-media-result-count>${items.length} fichiers visibles</p>
  </form>
  ${sections}
</main>
</div>
<footer class="wiki-footer">BZH CHRONICLES - galerie generee depuis les fichiers suivis du repo</footer>
</body>
</html>
`;
}

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${bytes} o`;
}

const files = [];
for (const scanRoot of SCAN_ROOTS) {
  const full = join(ROOT, scanRoot);
  try {
    if (statSync(full).isDirectory()) files.push(...walk(full));
  } catch {
    // Missing roots are allowed for future media families.
  }
}

const items = files
  .map((full) => {
    const rel = relative(ROOT, full).split(sep).join('/');
    const ext = rel.slice(rel.lastIndexOf('.')).toLowerCase();
    const type = EXTENSIONS.get(ext);
    const category = categoryFor(rel, type);
    const collection = collectionFor(rel, category);
    const status = statusFor(rel, category, type);
    const size = statSync(full).size;
    return {
      path: rel,
      url: relativeUrl('media/gallery', rel),
      title: titleFor(rel),
      collection,
      category,
      status,
      type,
      size,
      sizeLabel: formatSize(size),
    };
  })
  .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) || a.path.localeCompare(b.path, 'en'));

const grouped = new Map();
for (const item of items) {
  if (!grouped.has(item.category)) grouped.set(item.category, []);
  grouped.get(item.category).push(item);
}

mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(OUTPUT_JSON, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
writeFileSync(OUTPUT_HTML, page(items, grouped), 'utf8');
console.log(`OK ${items.length} medias ecrits dans media/gallery/index.html`);
