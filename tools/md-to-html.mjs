#!/usr/bin/env node
// BZH Universe - generateur statique Markdown -> HTML.
// Zero dependance externe. Pour chaque *.md, ecrit un *.html frere (memes
// chemins relatifs), reecrit les liens internes .md -> .html, et applique un
// gabarit style coherent avec l'ecosysteme Nitro / Gwen Ha Star.
//
//   node tools/md-to-html.mjs
//
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const IGNORE_DIRS = new Set(['.git', '.github', 'node_modules', 'tools']);
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

function sidebar(prefix) {
  return `<aside class="wiki-sidebar" aria-label="Navigation wiki">
    <section class="sidebar-section">
      <p class="sidebar-title">Cartographie</p>
      <a class="sidebar-link" href="${prefix}docs/00-index.html">Index documentaire</a>
      <a class="sidebar-link" href="${prefix}docs/01-inventaire-source.html">Inventaire source</a>
      <a class="sidebar-link" href="${prefix}docs/chronology/chronologie.html">Chronologie</a>
      <a class="sidebar-link" href="${prefix}media/catalog/media-catalog.html">Catalogue medias</a>
    </section>
    <section class="sidebar-section">
      <p class="sidebar-title">Univers</p>
      <a class="sidebar-link" href="${prefix}docs/universe/00-vision-globale.html">Vision globale</a>
      <a class="sidebar-link" href="${prefix}docs/universe/personnages.html">Personnages</a>
      <a class="sidebar-link" href="${prefix}docs/universe/lexique.html">Lexique</a>
      <a class="sidebar-link" href="${prefix}docs/universe/le-code.html">Le Code</a>
    </section>
    <section class="sidebar-section">
      <p class="sidebar-title">Projets</p>
      <a class="sidebar-link" href="${prefix}docs/projects/bzh-card-game/README.html">BZH Card Game</a>
      <a class="sidebar-link" href="${prefix}docs/projects/bzh-card-game/cards.html">Cartes BZH01</a>
      <a class="sidebar-link" href="${prefix}docs/projects/roguelite/README.html">Roguelite</a>
      <a class="sidebar-link" href="${prefix}docs/projects/minitel-hub-3d/README.html">Minitel HUB 3D</a>
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
      <a class="wiki-pill" href="${prefix}docs/universe/personnages.html">Personnages</a>
      <a class="wiki-pill" href="${prefix}docs/projects/bzh-card-game/README.html">TCG</a>
      <a class="wiki-pill" href="${prefix}media/catalog/media-catalog.html">Medias</a>
      <a class="wiki-pill" href="${prefix}docs/conversations/index.html">Conversations</a>
    </nav>
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

const files = walk(ROOT);
let count = 0;
for (const file of files) {
  const relPath = relative(ROOT, file).split(sep).join('/');
  const { html, title } = mdToHtml(readFileSync(file, 'utf8'));
  const depth = relPath.split('/').length - 1;
  const prefix = '../'.repeat(depth);
  const outPath = file.replace(/\.md$/i, '.html');
  const pageTitle = title || relPath.replace(/.*\//, '').replace(/\.md$/i, '');
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
console.log(`OK ${count} fichiers Markdown convertis en HTML.`);
