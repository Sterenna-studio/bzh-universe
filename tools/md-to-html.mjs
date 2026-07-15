#!/usr/bin/env node
// BZH Universe - generateur statique Markdown -> HTML.
// Zero dependance externe. Pour chaque *.md, ecrit un *.html frere (memes
// chemins relatifs), reecrit les liens internes .md -> .html, et applique un
// gabarit style coherent avec l'ecosysteme Nitro / Gwen Ha Star.
//
//   node tools/md-to-html.mjs
//
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const IGNORE_DIRS = new Set(['.git', '.github', 'node_modules', 'tools']);
const SEARCH_INDEX_JSON = join(ROOT, 'assets', 'site', 'wiki-search-index.json');
const SEARCH_INDEX_JS = join(ROOT, 'assets', 'site', 'wiki-search-index.js');
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

function inline(text) {
  const codes = [];
  let s = text.replace(/`([^`]+)`/g, (_, c) => {
    codes.push(`<code>${escapeHtml(c)}</code>`);
    return `${PH_OPEN}${codes.length - 1}${PH_CLOSE}`;
  });
  s = escapeHtml(s);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, label, url, title) => {
    const href = rewriteHref(url.trim());
    const ext = /^https?:/i.test(href);
    const t = title ? ` title="${escapeHtml(title)}"` : '';
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

function page({ title, body, hubLink, indexLink, crumb, prefix }) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} - BZH Universe</title>
<link rel="stylesheet" href="${prefix}assets/site/wiki.css">
<script defer src="${prefix}assets/site/wiki-search-index.js"></script>
<script defer src="${prefix}assets/site/wiki.js"></script>
</head>
<body>
<a class="skip-link" href="#content">Aller au contenu</a>
${topbar({ prefix, hubLink, indexLink })}
<div class="wiki-layout">
${sidebar(prefix)}
<main class="wiki-page" id="content">
<div class="breadcrumb">${escapeHtml(crumb)}</div>
${body}
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
  return {
    type: 'page',
    title: title || relPath.replace(/.*\//, '').replace(/\.md$/i, ''),
    url: relPath.replace(/\.md$/i, '.html'),
    path: relPath,
    section: sectionForPath(relPath),
    summary: text.slice(0, 220),
    keywords: [...new Set([...relPath.split(/[\/._-]+/), ...h])].join(' '),
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
    return items.map((item) => ({
      type: 'media',
      title: item.title || item.path,
      url: item.path,
      path: item.path,
      section: `Media / ${item.category || 'Sans categorie'}`,
      summary: `${item.category || 'Media'} - ${item.collection || 'Sans collection'} - ${item.status || 'reference'} - ${item.type || 'fichier'} - ${item.sizeLabel || ''}`.trim(),
      keywords: `${item.path || ''} ${item.title || ''} ${item.collection || ''} ${item.category || ''} ${item.status || ''} ${item.type || ''}`,
    }));
  } catch {
    return [];
  }
}

function writeSearchIndex(entries) {
  const full = [...entries, ...mediaSearchEntries()]
    .map((entry, index) => ({ id: index + 1, ...entry }))
    .sort((a, b) => a.title.localeCompare(b.title, 'fr'));
  const json = `${JSON.stringify(full, null, 2)}\n`;
  writeFileSync(SEARCH_INDEX_JSON, json, 'utf8');
  writeFileSync(SEARCH_INDEX_JS, `window.BZH_WIKI_SEARCH_INDEX = ${json};\n`, 'utf8');
  return full.length;
}

const files = walk(ROOT);
let count = 0;
const searchEntries = [];
for (const file of files) {
  const relPath = relative(ROOT, file).split(sep).join('/');
  const md = readFileSync(file, 'utf8');
  const { html, title } = mdToHtml(md);
  const depth = relPath.split('/').length - 1;
  const prefix = '../'.repeat(depth);
  const outPath = file.replace(/\.md$/i, '.html');
  const pageTitle = title || relPath.replace(/.*\//, '').replace(/\.md$/i, '');
  if (!isSearchExcluded(relPath)) {
    searchEntries.push(searchEntryForMarkdown(relPath, pageTitle, md));
  }
  writeFileSync(
    outPath,
    page({
      title: pageTitle,
      body: html,
      hubLink: prefix + 'hub/index.html',
      indexLink: prefix + 'docs/00-index.html',
      crumb: relPath,
      prefix,
    }),
    'utf8',
  );
  count++;
}
const searchCount = writeSearchIndex(searchEntries);
console.log(`OK ${count} fichiers Markdown convertis en HTML.`);
console.log(`OK ${searchCount} entrees ecrites dans assets/site/wiki-search-index.json.`);
