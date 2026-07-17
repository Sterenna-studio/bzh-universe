#!/usr/bin/env node
// BZH Universe - generateur statique Markdown -> HTML.
// Zero dependance externe. Pour chaque *.md, ecrit un *.html frere (memes
// chemins relatifs), reecrit les liens internes .md -> .html, et applique un
// gabarit style coherent avec l'ecosysteme Nitro / Gwen Ha Star.
//
//   node tools/md-to-html.mjs
//
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const IGNORE_DIRS = new Set(['.git', '.github', 'node_modules', 'tools']);
const SEARCH_INDEX_JSON = join(ROOT, 'assets', 'site', 'wiki-search-index.json');
const SEARCH_INDEX_JS = join(ROOT, 'assets', 'site', 'wiki-search-index.js');
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif']);
const VIDEO_EXT = new Set(['.mp4', '.webm', '.mov', '.m4v']);
const AUDIO_EXT = new Set(['.mp3', '.ogg', '.wav', '.m4a', '.flac']);
const ASSET_ROOT_DIRS = ['assets', 'media', 'archives'];
const dirImageCache = new Map();
const extOf = (name) => name.slice(name.lastIndexOf('.')).toLowerCase();
// Sentinelle ASCII pour proteger les spans `code` (jamais present dans les docs)
const PH_OPEN = '@@CODE';
const PH_CLOSE = 'CODE@@';

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!IGNORE_DIRS.has(name)) walk(full, out);
    } else if (name.toLowerCase().endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function rewriteHref(url) {
  if (/^(https?:|mailto:|tel:|#|\/\/)/i.test(url)) return url;
  return url.replace(/\.md(#.*)?$/i, '.html$1');
}

// Aperçus d'assets : detecte les chemins/liens vers assets/media/archives
// (fichiers image ou dossiers qui en contiennent) et affiche des vignettes
// directement dans la page, sans devoir reecrire les .md sources.

function isImageFile(name) {
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
  return IMAGE_EXT.has(ext);
}

function findImages(absDir, limit = 6) {
  if (dirImageCache.has(absDir)) return dirImageCache.get(absDir);
  const out = [];
  let scanned = 0;
  function walk(dir, depth) {
    if (out.length >= limit || depth > 4 || scanned > 600) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (out.length >= limit || scanned > 600) return;
      if (entry.name.startsWith('.')) continue;
      scanned++;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full, depth + 1);
      else if (isImageFile(entry.name)) out.push(full);
    }
  }
  walk(absDir, 0);
  dirImageCache.set(absDir, out);
  return out;
}

function relFromDoc(docDir, absTarget) {
  return relative(docDir, absTarget).split(sep).map(encodeURIComponent).join('/');
}

function assetThumbs(docDir, files) {
  return files
    .map((absImg) => {
      const url = relFromDoc(docDir, absImg);
      return `<a class="wiki-asset-thumb" href="${url}" target="_blank" rel="noopener noreferrer"><img src="${url}" alt="" loading="lazy" decoding="async"></a>`;
    })
    .join('');
}

function resolveAssetCandidate(rawPath, docDir) {
  if (!rawPath) return null;
  const trimmed = rawPath.split('#')[0].split('?')[0].trim();
  if (!trimmed || /^(https?:|mailto:|tel:|data:|\/\/)/i.test(trimmed)) return null;
  let clean;
  try {
    clean = decodeURIComponent(trimmed);
  } catch {
    clean = trimmed;
  }
  let abs;
  if (/^(assets|media|archives)\//i.test(clean)) abs = join(ROOT, clean);
  else if (clean.startsWith('/')) abs = join(ROOT, clean.slice(1));
  else abs = resolve(docDir, clean);
  const relToRoot = relative(ROOT, abs).split(sep).join('/');
  if (relToRoot.startsWith('..')) return null;
  if (!ASSET_ROOT_DIRS.some((d) => relToRoot === d || relToRoot.startsWith(`${d}/`))) return null;
  return abs;
}

function assetPreviewFor(abs, docDir) {
  if (!existsSync(abs)) return null;
  const st = statSync(abs);
  if (st.isFile()) {
    const ext = extOf(abs);
    if (IMAGE_EXT.has(ext)) {
      return `<span class="wiki-asset-preview">${assetThumbs(docDir, [abs])}</span>`;
    }
    const url = relFromDoc(docDir, abs);
    if (VIDEO_EXT.has(ext)) {
      return `<span class="wiki-asset-preview wiki-asset-preview-media"><video class="wiki-asset-media" controls preload="metadata" src="${url}"></video></span>`;
    }
    if (AUDIO_EXT.has(ext)) {
      return `<span class="wiki-asset-preview wiki-asset-preview-media"><audio class="wiki-asset-media" controls preload="none" src="${url}"></audio></span>`;
    }
    return null;
  }
  if (st.isDirectory()) {
    const images = findImages(abs, 6);
    if (!images.length) return null;
    return `<span class="wiki-asset-preview">${assetThumbs(docDir, images)}</span>`;
  }
  return null;
}

function injectAssetPreviews(html, docDir) {
  let out = html.replace(/<code>([^<]*)<\/code>/g, (match, raw) => {
    const abs = resolveAssetCandidate(raw, docDir);
    if (!abs) return match;
    const preview = assetPreviewFor(abs, docDir);
    return preview ? `${match}${preview}` : match;
  });
  out = out.replace(/<a href="([^"]+)"([^>]*)>([^<]*)<\/a>/g, (match, href) => {
    if (/\.html?(#.*)?$/i.test(href)) return match;
    const abs = resolveAssetCandidate(href, docDir);
    if (!abs) return match;
    const preview = assetPreviewFor(abs, docDir);
    return preview ? `${match}${preview}` : match;
  });
  return out;
}

function inline(text) {
  const codes = [];
  let s = text.replace(/`([^`]+)`/g, (_, c) => {
    codes.push(`<code>${escapeHtml(c)}</code>`);
    return `${PH_OPEN}${codes.length - 1}${PH_CLOSE}`;
  });
  s = escapeHtml(s);
  s = s.replace(/(!)?\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, bang, label, url, title) => {
    const href = rewriteHref(url.trim());
    const t = title ? ` title="${escapeHtml(title)}"` : '';
    if (bang) {
      return `<figure class="wiki-embed"><img src="${href}" alt="${label}"${t} loading="lazy" decoding="async"></figure>`;
    }
    const ext = /^https?:/i.test(href);
    const attrs = ext ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${href}"${t}${attrs}>${label}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
       .replace(/__([^_]+)__/g, '<strong>$1</strong>')
       .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
       .replace(/(^|[^_\w])_([^_\n]+)_/g, '$1<em>$2</em>');
  s = s.replace(/@@CODE(\d+)CODE@@/g, (_, i) => codes[+i]);
  return s;
}

function renderList(items) {
  let i = 0;
  function build(minIndent) {
    const ordered = items[i].ordered;
    let out = `<${ordered ? 'ol' : 'ul'}>`;
    while (i < items.length && items[i].indent >= minIndent) {
      const cur = items[i];
      if (cur.indent > minIndent) { out += build(cur.indent); continue; }
      i++;
      let li = `<li>${inline(cur.text)}`;
      if (i < items.length && items[i].indent > cur.indent) li += build(items[i].indent);
      li += '</li>';
      out += li;
    }
    return out + `</${ordered ? 'ol' : 'ul'}>`;
  }
  return build(items[0].indent);
}

function renderTable(rows) {
  const cells = (line) =>
    line.replace(/^\s*\|?|\|?\s*$/g, '').split('|').map((c) => c.trim());
  const header = cells(rows[0]);
  const body = rows.slice(2).map(cells);
  let h = '<table><thead><tr>';
  for (const c of header) h += `<th>${inline(c)}</th>`;
  h += '</tr></thead><tbody>';
  for (const r of body) {
    h += '<tr>';
    for (let k = 0; k < header.length; k++) h += `<td>${inline(r[k] ?? '')}</td>`;
    h += '</tr>';
  }
  return h + '</tbody></table>';
}

const isTableSep = (l) => /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(l) && l.includes('-');

function mdToHtml(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  let out = '';
  let i = 0;
  let firstH1 = null;

  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) { i++; continue; }

    const fence = line.match(/^\s*```+\s*([\w-]*)\s*$/);
    if (fence) {
      const lang = fence[1];
      i++;
      const buf = [];
      while (i < lines.length && !/^\s*```+\s*$/.test(lines[i])) buf.push(lines[i++]);
      i++;
      const cls = lang ? ` class="lang-${lang}"` : '';
      out += `<pre><code${cls}>${escapeHtml(buf.join('\n'))}</code></pre>`;
      continue;
    }

    const h = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (h) {
      const level = h[1].length;
      const txt = h[2];
      if (level === 1 && firstH1 === null) firstH1 = txt;
      const id = txt.toLowerCase().replace(/[^\wÀ-ſ]+/g, '-').replace(/^-+|-+$/g, '');
      out += `<h${level} id="${id}">${inline(txt)}</h${level}>`;
      i++;
      continue;
    }

    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { out += '<hr>'; i++; continue; }

    if (line.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const rows = [line, lines[i + 1]];
      i += 2;
      while (i < lines.length && lines[i].includes('|') && !/^\s*$/.test(lines[i])) rows.push(lines[i++]);
      out += renderTable(rows);
      continue;
    }

    if (/^\s*>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''));
      out += `<blockquote>${mdToHtml(buf.join('\n')).html}</blockquote>`;
      continue;
    }

    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
        const m = lines[i].match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
        items.push({ indent: m[1].length, ordered: /\d+\./.test(m[2]), text: m[3] });
        i++;
      }
      out += renderList(items);
      continue;
    }

    const para = [];
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^(#{1,6})\s/.test(lines[i]) &&
      !/^\s*```+/.test(lines[i]) &&
      !/^\s*>/.test(lines[i]) &&
      !/^\s*([-*+]|\d+\.)\s+/.test(lines[i]) &&
      !/^\s*([-*_])(\s*\1){2,}\s*$/.test(lines[i])
    ) {
      para.push(lines[i++]);
    }
    out += `<p>${inline(para.join(' '))}</p>`;
  }

  return { html: out, title: firstH1 };
}

// Fil d'Ariane cliquable : chaque segment de dossier pointe vers son
// index.md / README.md s'il existe, sinon reste en texte simple.

function humanizeSegment(seg) {
  return seg
    .replace(/^\d+[-_]?/, '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b(bzh|tcg|pw|vdt|ep|3d)\b/gi, (m) => m.toUpperCase())
    .replace(/^\w/, (c) => c.toUpperCase()) || seg;
}

// Landing d'un dossier : index.md / README.md / premiere page 00-*.md /
// page soeur du meme nom. `resolveSynthetic` ajoute les index de section
// generes automatiquement (voir plus bas).
function naturalLandingHtml(dirRel) {
  if (!dirRel) return null;
  const abs = join(ROOT, dirRel);
  for (const cand of ['index.md', 'README.md']) {
    if (existsSync(join(abs, cand))) return `${dirRel}/${cand.replace(/\.md$/i, '.html')}`;
  }
  try {
    const zero = readdirSync(abs).filter((n) => /^00-.*\.md$/i.test(n)).sort()[0];
    if (zero) return `${dirRel}/${zero.replace(/\.md$/i, '.html')}`;
  } catch {
    // dossier absent : ignore.
  }
  if (existsSync(join(ROOT, `${dirRel}.md`))) return `${dirRel}.html`;
  return null;
}

let SYNTHETIC_DIRS = new Set();
function landingHtml(dirRel) {
  return naturalLandingHtml(dirRel) || (SYNTHETIC_DIRS.has(dirRel) ? `${dirRel}/index.html` : null);
}

function buildBreadcrumb(currentHtml, prefix, pageTitle) {
  const parts = currentHtml.split('/');
  parts.pop();
  const folders = [];
  let acc = '';
  for (const seg of parts) {
    acc = acc ? `${acc}/${seg}` : seg;
    const target = landingHtml(acc);
    const isCurrent = target === currentHtml;
    folders.push({
      label: humanizeSegment(seg),
      href: target && !isCurrent ? prefix + target : null,
      isCurrent,
    });
  }

  // Sur une landing dont le dossier porte le meme nom que la page (index de
  // section), on evite le doublon "Identity › Identity".
  const last = folders[folders.length - 1];
  const dupTitle = last && last.isCurrent && last.label.toLowerCase() === String(pageTitle).toLowerCase();

  const items = [`<a href="${prefix}hub/index.html">Hub</a>`];
  folders.forEach((f, idx) => {
    const isLast = idx === folders.length - 1;
    if (f.href) items.push(`<a href="${f.href}">${escapeHtml(f.label)}</a>`);
    else if (dupTitle && isLast) items.push(`<span class="crumb-current" aria-current="page">${escapeHtml(f.label)}</span>`);
    else items.push(`<span>${escapeHtml(f.label)}</span>`);
  });
  if (!dupTitle) items.push(`<span class="crumb-current" aria-current="page">${escapeHtml(pageTitle)}</span>`);
  return items.join('<span class="crumb-sep" aria-hidden="true">›</span>');
}

function pageNavHtml(prev, next, prefix) {
  if (!prev && !next) return '';
  const cell = (item, kind, label) =>
    item
      ? `<a class="page-nav-link page-nav-${kind}" href="${prefix}${item.outRel}"><span class="page-nav-dir">${label}</span><span class="page-nav-title">${escapeHtml(item.pageTitle)}</span></a>`
      : '<span class="page-nav-spacer"></span>';
  return `<nav class="page-nav" aria-label="Pages voisines">${cell(prev, 'prev', '← Précédent')}${cell(next, 'next', 'Suivant →')}</nav>`;
}

function readerControls() {
  return `<div class="reader-controls" aria-label="Options de lecture">
    <button class="reader-control" type="button" data-reader-action="font-down" title="Reduire la taille du texte">A-<span class="reader-control-label">Reduire la taille du texte</span></button>
    <button class="reader-control" type="button" data-reader-action="font-reset" title="Reinitialiser la taille du texte">A<span class="reader-control-label">Reinitialiser la taille du texte</span></button>
    <button class="reader-control" type="button" data-reader-action="font-up" title="Augmenter la taille du texte">A+<span class="reader-control-label">Augmenter la taille du texte</span></button>
    <button class="reader-control" type="button" data-reader-action="dyslexic" aria-pressed="false">Dys<span class="reader-control-label">Activer OpenDyslexic</span></button>
    <div class="theme-switch" role="group" aria-label="Choisir un theme">
      <button class="reader-control" type="button" data-reader-action="theme" data-theme-value="dark" aria-pressed="false" title="Theme sombre lisible">☾<span class="reader-control-label">Theme sombre lisible</span></button>
      <button class="reader-control" type="button" data-reader-action="theme" data-theme-value="light" aria-pressed="false" title="Theme clair lisible">☀<span class="reader-control-label">Theme clair lisible</span></button>
      <button class="reader-control" type="button" data-reader-action="theme" data-theme-value="cyber" aria-pressed="false" title="Theme cyber fruite">⚡<span class="reader-control-label">Theme cyber fruite</span></button>
    </div>
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

function sidebar(prefix) {
  return `<aside class="wiki-sidebar" aria-label="Navigation wiki">
    <section class="sidebar-section">
      <p class="sidebar-title">Demarrer</p>
      <a class="sidebar-link" href="${prefix}hub/index.html">Accueil du hub</a>
      <a class="sidebar-link" href="${prefix}docs/00-index.html">Index documentaire</a>
      <a class="sidebar-link" href="${prefix}docs/projects/00-carte-des-projets.html">Carte des projets</a>
      <a class="sidebar-link" href="${prefix}docs/01-inventaire-source.html">Inventaire source</a>
      <a class="sidebar-link" href="${prefix}docs/02-questions-ouvertes.html">Questions ouvertes</a>
      <a class="sidebar-link" href="${prefix}docs/99-backlog.html">Backlog</a>
    </section>
    <section class="sidebar-section">
      <p class="sidebar-title">Univers</p>
      <a class="sidebar-link" href="${prefix}docs/universe/00-vision-globale.html">Vision globale</a>
      <a class="sidebar-link" href="${prefix}docs/identity/direction-artistique.html">Direction artistique</a>
      <a class="sidebar-link" href="${prefix}docs/identity/statuts-canon.html">Statuts canon</a>
      <a class="sidebar-link" href="${prefix}docs/universe/personnages.html">Personnages</a>
      <a class="sidebar-link" href="${prefix}docs/universe/personnages/lemegeton-dossier.html">LEMEGETON</a>
      <a class="sidebar-link" href="${prefix}docs/universe/scenes-et-micro-lore.html">Scenes et micro-lore</a>
      <a class="sidebar-link" href="${prefix}docs/universe/lexique.html">Lexique</a>
      <a class="sidebar-link" href="${prefix}docs/universe/le-code.html">Le Code</a>
    </section>
    <section class="sidebar-section">
      <p class="sidebar-title">Medias</p>
      <a class="sidebar-link" href="${prefix}media/catalog/media-catalog.html">Catalogue medias</a>
      <a class="sidebar-link" href="${prefix}media/gallery/index.html">Galerie media</a>
      <a class="sidebar-link" href="${prefix}docs/media/musique-et-albums.html">Musique et albums</a>
      <a class="sidebar-link" href="${prefix}docs/media/trailers-et-scripts.html">Trailers et scripts</a>
      <a class="sidebar-link" href="${prefix}docs/media/communication-et-annonces.html">Communication</a>
      <a class="sidebar-link" href="${prefix}docs/archives/import-desktop-bzh.html">Import Desktop BZH</a>
    </section>
    <section class="sidebar-section">
      <p class="sidebar-title">Projets</p>
      <a class="sidebar-link" href="${prefix}docs/projects/00-carte-des-projets.html">Carte des projets</a>
      <a class="sidebar-link" href="${prefix}docs/projects/bzh-card-game/README.html">BZH Card Game</a>
      <a class="sidebar-link" href="${prefix}docs/projects/bzh-card-game/cards.html">Cartes BZH01</a>
      <a class="sidebar-link" href="${prefix}docs/projects/roguelite/README.html">Roguelite</a>
      <a class="sidebar-link" href="${prefix}docs/projects/minitel-hub-3d/README.html">Minitel HUB 3D</a>
      <a class="sidebar-link" href="${prefix}docs/web/mini-site-bzh-power.html">Mini-site BZH POWER</a>
    </section>
    <section class="sidebar-section">
      <p class="sidebar-title">Sources</p>
      <a class="sidebar-link" href="${prefix}docs/conversations/index.html">Conversations</a>
      <a class="sidebar-link" href="${prefix}docs/chronology/chronologie.html">Chronologie</a>
      <a class="sidebar-link" href="${prefix}docs/sources/00-methodologie-citations.html">Tracabilite</a>
      <a class="sidebar-link" href="${prefix}docs/sources/01-couverture-des-citations.html">Couverture citations</a>
      <a class="sidebar-link" href="${prefix}docs/archives/livrables-historiques.html">Livrables historiques</a>
    </section>
    <section class="sidebar-section">
      <p class="sidebar-title">Sommaire</p>
      <nav data-toc aria-label="Sommaire de la page"></nav>
    </section>
  </aside>`;
}

function topbar({ prefix, hubLink, indexLink }) {
  return `<header class="wiki-topbar">
    <a class="wiki-brand" href="${hubLink}">
      <span class="wiki-brand-mark" aria-hidden="true"></span>
      <span><span class="wiki-brand-kicker">Archive numerique</span><span class="wiki-brand-name">BZH Universe</span></span>
    </a>
    <nav class="wiki-toplinks" aria-label="Acces rapides">
      <a class="wiki-pill" href="${indexLink}">Index</a>
      <a class="wiki-pill" href="${prefix}docs/universe/00-vision-globale.html">Univers</a>
      <a class="wiki-pill" href="${prefix}docs/universe/personnages.html">Personnages</a>
      <a class="wiki-pill" href="${prefix}docs/projects/00-carte-des-projets.html">Projets</a>
      <a class="wiki-pill" href="${prefix}media/catalog/media-catalog.html">Medias</a>
      <a class="wiki-pill" href="${prefix}media/gallery/index.html">Galerie</a>
      <a class="wiki-pill" href="${prefix}docs/conversations/index.html">Sources</a>
    </nav>
    ${searchBox()}
    ${readerControls()}
  </header>`;
}

function page({ title, body, hubLink, indexLink, crumb, prefix, version, readingMin, pageNav }) {
  const meta = readingMin
    ? `<p class="page-meta"><span class="page-meta-time">⏱ ${readingMin} min de lecture</span></p>`
    : '';
  return `<!doctype html>
<html lang="fr" data-theme="cyber">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} - BZH Universe</title>
<link rel="stylesheet" href="${prefix}assets/site/wiki.css?v=${version}">
<script defer src="${prefix}assets/site/wiki-search-index.js?v=${version}"></script>
<script defer src="${prefix}assets/site/wiki.js?v=${version}"></script>
</head>
<body>
<a class="skip-link" href="#content">Aller au contenu</a>
${topbar({ prefix, hubLink, indexLink })}
<div class="wiki-layout">
${sidebar(prefix)}
<main class="wiki-page" id="content">
<nav class="breadcrumb" aria-label="Fil d'Ariane">${crumb}</nav>
${meta}
${body}
${pageNav || ''}
</main>
</div>
<footer class="wiki-footer">BZH CHRONICLES - genere depuis Markdown - ne pas editer le .html, modifier le .md source</footer>
</body>
</html>
`;
}

function plainText(md) {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/[|*_>#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function headings(md) {
  return [...md.matchAll(/^#{1,3}\s+(.*?)\s*#*\s*$/gm)]
    .map((m) => m[1].trim())
    .filter(Boolean);
}

// Meme algorithme d'id que le rendu des titres (mdToHtml).
const slugifyHeading = (txt) =>
  txt.toLowerCase().replace(/[^\wÀ-ſ]+/g, '-').replace(/^-+|-+$/g, '');

function headingAnchors(md, url) {
  return [...md.matchAll(/^(#{2,3})\s+(.*?)\s*#*\s*$/gm)]
    .map((m) => ({ t: m[2].trim(), u: `${url}#${slugifyHeading(m[2].trim())}` }))
    .filter((h) => h.t)
    .slice(0, 14);
}

function readingMinutes(md) {
  const words = plainText(md).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function pageBoost(relPath) {
  const file = relPath.replace(/.*\//, '');
  if (/^00-/.test(file) || /^(index|readme)\.md$/i.test(file)) return 6;
  if (relPath.startsWith('docs/universe/') || relPath.startsWith('docs/projects/')) return 3;
  return 0;
}

function sectionForPath(relPath) {
  if (relPath.startsWith('docs/universe/')) return 'Univers';
  if (relPath.startsWith('docs/identity/')) return 'Identite';
  if (relPath.startsWith('docs/projects/')) return 'Projets';
  if (relPath.startsWith('docs/media/')) return 'Media';
  if (relPath.startsWith('docs/merch/')) return 'Merchandising';
  if (relPath.startsWith('docs/sources/')) return 'Sources';
  if (relPath.startsWith('docs/conversations/')) return 'Conversations';
  if (relPath.startsWith('docs/archives/')) return 'Archives';
  if (relPath.startsWith('media/')) return 'Media';
  if (relPath.startsWith('archives/')) return 'Archives';
  return 'Wiki';
}

function searchEntryForMarkdown(relPath, title, md) {
  const text = plainText(md);
  const h = headings(md).slice(0, 8);
  const url = relPath.replace(/\.md$/i, '.html');
  return {
    type: 'page',
    title: title || relPath.replace(/.*\//, '').replace(/\.md$/i, ''),
    url,
    path: relPath,
    section: sectionForPath(relPath),
    summary: text.slice(0, 220),
    keywords: [...new Set([...relPath.split(/[\/._-]+/), ...h])].join(' '),
    anchors: headingAnchors(md, url),
    boost: pageBoost(relPath),
  };
}

function isSearchExcluded(relPath) {
  return relPath.startsWith('archives/web/lol-team-stats/');
}

function mediaSearchEntries() {
  const inventoryPath = join(ROOT, 'media', 'gallery', 'inventory.json');
  if (!existsSync(inventoryPath)) return [];
  try {
    const items = JSON.parse(readFileSync(inventoryPath, 'utf8'));
    if (!Array.isArray(items)) return [];
    return items.map((item) => {
      const status = item.status || 'reference';
      // Pondere la fraicheur/fiabilite : canon remonte, "a confirmer" descend.
      const boost = /canon/i.test(status) ? 4 : /confirmer/i.test(status) ? -3 : -1;
      return {
        type: 'media',
        title: item.title || item.path,
        url: item.path,
        path: item.path,
        section: `Media / ${item.category || 'Sans categorie'}`,
        summary: `${item.category || 'Media'} - ${item.collection || 'Sans collection'} - ${status} - ${item.type || 'fichier'} - ${item.sizeLabel || ''}`.trim(),
        keywords: `${item.path || ''} ${item.title || ''} ${item.collection || ''} ${item.category || ''} ${status} ${item.type || ''}`,
        anchors: [],
        boost,
      };
    });
  } catch {
    return [];
  }
}

function writeSearchIndex(entries) {
  // Tri total (titre puis url) AVANT l'attribution des id : l'ordre du
  // systeme de fichiers ne doit pas influencer la sortie (build reproductible).
  const full = [...entries, ...mediaSearchEntries()]
    .sort((a, b) => a.title.localeCompare(b.title, 'fr') || String(a.url).localeCompare(String(b.url)))
    .map((entry, index) => ({ id: index + 1, ...entry }));
  const json = `${JSON.stringify(full, null, 2)}\n`;
  writeFileSync(SEARCH_INDEX_JSON, json, 'utf8');
  writeFileSync(SEARCH_INDEX_JS, `window.BZH_WIKI_SEARCH_INDEX = ${json};\n`, 'utf8');
  return full.length;
}

// Passe 1 : rendu en memoire + index de recherche.
// Passe 2 : ecriture des pages avec un ?v= derive du contenu des assets
// (cache-busting : les visiteurs recuperent le bon CSS/JS apres deploiement).
const files = walk(ROOT);
const rendered = [];
const searchEntries = [];
for (const file of files) {
  const relPath = relative(ROOT, file).split(sep).join('/');
  const md = readFileSync(file, 'utf8');
  const { html, title } = mdToHtml(md);
  const enrichedHtml = injectAssetPreviews(html, dirname(file));
  const depth = relPath.split('/').length - 1;
  const prefix = '../'.repeat(depth);
  const outPath = file.replace(/\.md$/i, '.html');
  const outRel = relPath.replace(/\.md$/i, '.html');
  const pageTitle = title || relPath.replace(/.*\//, '').replace(/\.md$/i, '');
  if (!isSearchExcluded(relPath)) {
    searchEntries.push(searchEntryForMarkdown(relPath, pageTitle, md));
  }
  const dir = relPath.includes('/') ? relPath.replace(/\/[^/]*$/, '') : '';
  rendered.push({ relPath, outPath, outRel, pageTitle, enrichedHtml, prefix, dir, readingMin: readingMinutes(md) });
}

// Regroupe les pages par dossier (tri naturel) pour prev/next et index de section.
const pagesByDir = new Map();
for (const r of rendered) {
  if (!pagesByDir.has(r.dir)) pagesByDir.set(r.dir, []);
  pagesByDir.get(r.dir).push(r);
}
for (const list of pagesByDir.values()) {
  list.sort((a, b) => a.outRel.localeCompare(b.outRel, 'fr', { numeric: true }));
}

// Dossiers sous docs/ ou media/ sans landing naturelle -> index de section genere.
SYNTHETIC_DIRS = new Set();
for (const [dir, list] of pagesByDir) {
  if (!dir || !/^(docs|media)(\/|$)/.test(dir)) continue;
  if (list.length && !naturalLandingHtml(dir)) SYNTHETIC_DIRS.add(dir);
}

function childDirsOf(dirRel) {
  const prefixDir = dirRel ? `${dirRel}/` : '';
  const names = new Set();
  for (const d of pagesByDir.keys()) {
    if (!d.startsWith(prefixDir) || d === dirRel) continue;
    const rest = d.slice(prefixDir.length).split('/')[0];
    if (rest) names.add(rest);
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
}

function sectionIndexPages() {
  const pages = [];
  for (const dir of SYNTHETIC_DIRS) {
    const outRel = `${dir}/index.html`;
    const depth = outRel.split('/').length - 1;
    const prefix = '../'.repeat(depth);
    const title = humanizeSegment(dir.split('/').pop());
    const children = pagesByDir.get(dir) || [];
    const subdirs = childDirsOf(dir);
    let body = `<h1 id="${slugifyHeading(title)}">${escapeHtml(title)}</h1>`;
    body += `<p class="section-index-lead">Index de section — ${children.length} page${children.length > 1 ? 's' : ''}${subdirs.length ? ` et ${subdirs.length} sous-section${subdirs.length > 1 ? 's' : ''}` : ''}.</p>`;
    if (subdirs.length) {
      body += '<h2 id="sous-sections">Sous-sections</h2><ul class="section-index-list">';
      for (const sub of subdirs) {
        const target = landingHtml(`${dir}/${sub}`);
        const href = target ? target.slice(dir.length + 1) : `${sub}/`;
        body += `<li><a href="${href}">${escapeHtml(humanizeSegment(sub))}</a></li>`;
      }
      body += '</ul>';
    }
    if (children.length) {
      body += '<h2 id="pages">Pages</h2><ul class="section-index-list">';
      for (const c of children) {
        body += `<li><a href="${c.outRel.slice(dir.length + 1)}">${escapeHtml(c.pageTitle)}</a></li>`;
      }
      body += '</ul>';
    }
    pages.push({ dir, outRel, outPath: join(ROOT, ...outRel.split('/')), prefix, title, body });
    searchEntries.push({
      type: 'page',
      title,
      url: outRel,
      path: outRel,
      section: sectionForPath(outRel),
      summary: `Index de section : ${children.length} pages.`,
      keywords: `${dir} index section ${title}`,
      anchors: [],
      boost: 4,
    });
  }
  return pages;
}

const sectionPages = sectionIndexPages();
const searchCount = writeSearchIndex(searchEntries);

const version = createHash('md5')
  .update(readFileSync(join(ROOT, 'assets', 'site', 'wiki.css')))
  .update(readFileSync(join(ROOT, 'assets', 'site', 'wiki.js')))
  .update(readFileSync(SEARCH_INDEX_JS))
  .digest('hex')
  .slice(0, 10);

for (const r of rendered) {
  const siblings = pagesByDir.get(r.dir) || [];
  const idx = siblings.indexOf(r);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;
  writeFileSync(
    r.outPath,
    page({
      title: r.pageTitle,
      body: r.enrichedHtml,
      hubLink: r.prefix + 'hub/index.html',
      indexLink: r.prefix + 'docs/00-index.html',
      crumb: buildBreadcrumb(r.outRel, r.prefix, r.pageTitle),
      prefix: r.prefix,
      version,
      readingMin: r.readingMin,
      pageNav: pageNavHtml(prev, next, r.prefix),
    }),
    'utf8',
  );
}

// Index de section generes (dossiers sans landing naturelle).
for (const s of sectionPages) {
  writeFileSync(
    s.outPath,
    page({
      title: s.title,
      body: s.body,
      hubLink: s.prefix + 'hub/index.html',
      indexLink: s.prefix + 'docs/00-index.html',
      crumb: buildBreadcrumb(s.outRel, s.prefix, s.title),
      prefix: s.prefix,
      version,
    }),
    'utf8',
  );
}
// Pages ecrites a la main : on synchronise juste leur ?v= d'assets.
const HAND_AUTHORED = ['hub/index.html', 'hub/admin/index.html', 'docs/media/fil-audio.html', 'index.html'];
let patched = 0;
for (const relFile of HAND_AUTHORED) {
  const full = join(ROOT, relFile);
  if (!existsSync(full)) continue;
  const src = readFileSync(full, 'utf8');
  const out = src.replace(
    /(assets\/site\/(?:wiki\.css|wiki\.js|wiki-search-index\.js))(?:\?v=[a-z0-9]+)?/g,
    `$1?v=${version}`,
  );
  if (out !== src) {
    writeFileSync(full, out, 'utf8');
    patched++;
  }
}

console.log(`OK ${rendered.length} fichiers Markdown convertis en HTML (assets v=${version}).`);
if (sectionPages.length) console.log(`OK ${sectionPages.length} index de section generes.`);
console.log(`OK ${searchCount} entrees ecrites dans assets/site/wiki-search-index.json.`);
if (patched) console.log(`OK ${patched} pages manuelles synchronisees sur v=${version}.`);
