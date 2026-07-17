(function () {
  const root = document.documentElement;
  const storageKey = 'bzh-wiki-reader';
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function readPrefs() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch {
      return {};
    }
  }

  function writePrefs(prefs) {
    localStorage.setItem(storageKey, JSON.stringify(prefs));
  }

  const THEMES = ['dark', 'light', 'cyber'];

  function applyPrefs(prefs) {
    const theme = THEMES.includes(prefs.theme) ? prefs.theme : 'cyber';
    const scale = String(clamp(Number(prefs.fontScale ?? 0), -1, 2));
    const dyslexic = prefs.dyslexic === true;
    root.dataset.theme = theme;
    root.dataset.fontScale = scale;
    root.dataset.dyslexic = String(dyslexic);

    document.querySelectorAll('[data-reader-action="theme"]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.themeValue === theme));
    });
    document.querySelectorAll('[data-reader-action="dyslexic"]').forEach((button) => {
      button.setAttribute('aria-pressed', String(dyslexic));
      button.title = dyslexic ? 'Desactiver OpenDyslexic' : 'Activer OpenDyslexic';
    });
  }

  function updateToc() {
    const toc = document.querySelector('[data-toc]');
    const page = document.querySelector('.wiki-page');
    if (!toc || !page) return;

    const headings = [...page.querySelectorAll('h2[id], h3[id]')].slice(0, 24);
    if (!headings.length) {
      toc.closest('.sidebar-section')?.remove();
      return;
    }

    const list = document.createElement('ul');
    list.className = 'toc-list';
    headings.forEach((heading) => {
      const item = document.createElement('li');
      item.className = heading.tagName === 'H3' ? 'toc-h3' : 'toc-h2';
      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent;
      item.appendChild(link);
      list.appendChild(item);
    });
    toc.replaceChildren(list);
  }

  function setupScrollSpy() {
    const tocLinks = [...document.querySelectorAll('.toc-list a')];
    if (!tocLinks.length) return;
    const targets = tocLinks
      .map((link) => ({ link, el: document.getElementById(decodeURIComponent(link.hash.slice(1))) }))
      .filter((t) => t.el);
    if (!targets.length) return;

    let ticking = false;
    function highlight() {
      ticking = false;
      const y = window.scrollY + 130;
      let active = targets[0];
      for (const t of targets) {
        if (t.el.getBoundingClientRect().top + window.scrollY <= y) active = t;
        else break;
      }
      tocLinks.forEach((l) => l.removeAttribute('aria-current'));
      active.link.setAttribute('aria-current', 'true');
    }
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(highlight); }
    }, { passive: true });
    highlight();
  }

  function enhanceHeadings() {
    const page = document.querySelector('.wiki-page');
    if (!page) return;
    page.querySelectorAll('h2[id], h3[id], h4[id]').forEach((heading) => {
      if (heading.querySelector('.heading-anchor')) return;
      const anchor = document.createElement('a');
      anchor.className = 'heading-anchor';
      anchor.href = `#${heading.id}`;
      anchor.setAttribute('aria-label', 'Lien direct vers cette section');
      anchor.textContent = '#';
      heading.appendChild(anchor);
    });
  }

  function setupBackToTop() {
    if (!document.querySelector('.wiki-page')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'back-to-top';
    button.setAttribute('aria-label', 'Remonter en haut de page');
    button.textContent = '↑';
    button.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    document.body.appendChild(button);
    const onScroll = () => button.classList.toggle('is-visible', window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function setupProgressBar() {
    if (!document.querySelector('.wiki-page')) return;
    const bar = document.createElement('div');
    bar.className = 'reading-progress';
    bar.setAttribute('aria-hidden', 'true');
    const fill = document.createElement('span');
    bar.appendChild(fill);
    document.body.appendChild(bar);
    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      fill.style.width = max > 0 ? `${(doc.scrollTop / max) * 100}%` : '0';
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  function setupLightbox() {
    const page = document.querySelector('.wiki-page');
    if (!page) return;

    let overlay = null;
    function ensureOverlay() {
      if (overlay) return overlay;
      overlay = document.createElement('div');
      overlay.className = 'wiki-lightbox';
      overlay.hidden = true;
      overlay.innerHTML =
        '<button type="button" class="wiki-lightbox-close" aria-label="Fermer">✕</button>' +
        '<figure class="wiki-lightbox-figure"><img alt=""><figcaption></figcaption></figure>' +
        '<a class="wiki-lightbox-open" target="_blank" rel="noopener noreferrer">Ouvrir l\'original ↗</a>';
      document.body.appendChild(overlay);
      const close = () => {
        overlay.hidden = true;
        document.body.classList.remove('wiki-lightbox-open-body');
      };
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay || event.target.closest('.wiki-lightbox-close')) close();
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !overlay.hidden) close();
      });
      return overlay;
    }

    function open(src, caption) {
      const box = ensureOverlay();
      box.querySelector('img').src = src;
      box.querySelector('figcaption').textContent = caption || '';
      box.querySelector('.wiki-lightbox-open').href = src;
      box.hidden = false;
      document.body.classList.add('wiki-lightbox-open-body');
    }

    page.addEventListener('click', (event) => {
      const img = event.target.closest('img');
      if (!img || !page.contains(img)) return;
      const anchor = img.closest('a');
      // Vignette d'apercu (assetThumbs) : l'<img> pointe vers une miniature
      // generee (assets/site/thumbs/...webp) mais le lien href garde la
      // pleine resolution expres, pour l'ouverture directe. La lightbox doit
      // afficher cette pleine resolution, pas la vignette.
      if (anchor && anchor.classList.contains('wiki-asset-thumb')) {
        event.preventDefault();
        open(anchor.href, img.getAttribute('alt') || '');
        return;
      }
      // Ne pas intercepter les liens qui pointent ailleurs que vers l'image.
      if (anchor) {
        const href = anchor.getAttribute('href') || '';
        const imgSrc = img.getAttribute('src') || '';
        if (href && href !== imgSrc && !href.startsWith('#')) {
          const sameFile = decodeURIComponent(href).split('/').pop() === decodeURIComponent(imgSrc).split('/').pop();
          if (!sameFile) return;
        }
      }
      event.preventDefault();
      open(img.currentSrc || img.src, img.getAttribute('alt') || '');
    });
  }

  function setupSidebarCollapse() {
    const sidebar = document.querySelector('.wiki-sidebar');
    if (!sidebar) return;
    const currentLink = sidebar.querySelector('.sidebar-link[aria-current="page"]');

    sidebar.querySelectorAll('.sidebar-section').forEach((section) => {
      const title = section.querySelector('.sidebar-title');
      if (!title || section.querySelector('[data-toc]')) return; // le sommaire reste ouvert

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sidebar-toggle';
      btn.innerHTML = `${title.textContent}<span class="sidebar-toggle-caret" aria-hidden="true">▾</span>`;
      const hasCurrent = currentLink && section.contains(currentLink);
      const collapsed = window.matchMedia('(max-width: 980px)').matches && !hasCurrent;
      btn.setAttribute('aria-expanded', String(!collapsed));
      section.classList.toggle('is-collapsed', collapsed);
      title.replaceWith(btn);

      btn.addEventListener('click', () => {
        const nowCollapsed = section.classList.toggle('is-collapsed');
        btn.setAttribute('aria-expanded', String(!nowCollapsed));
      });
    });
  }

  function setupFocusMode() {
    if (!document.querySelector('.wiki-layout .wiki-sidebar')) return;
    const controls = document.querySelector('.reader-controls');
    if (!controls) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'reader-control';
    button.dataset.readerAction = 'focus';
    button.setAttribute('aria-pressed', 'false');
    button.title = 'Mode lecture (masquer la navigation)';
    button.innerHTML = '⊟<span class="reader-control-label">Mode lecture</span>';
    controls.appendChild(button);

    const apply = (on) => {
      document.body.classList.toggle('focus-reading', on);
      button.setAttribute('aria-pressed', String(on));
    };
    apply(readPrefs().focus === true);

    button.addEventListener('click', () => {
      const prefs = readPrefs();
      const next = prefs.focus !== true;
      prefs.focus = next;
      writePrefs(prefs);
      apply(next);
    });
  }

  function normalizePath(pathname) {
    return decodeURIComponent(pathname)
      .replace(/\\/g, '/')
      .replace(/\/index\.html$/i, '/')
      .replace(/\/README\.html$/i, '/')
      .replace(/\/+$/g, '');
  }

  function markCurrentNavigation() {
    const current = normalizePath(window.location.pathname);
    document.querySelectorAll('.wiki-pill[href], .sidebar-link[href], .hub-card[href]').forEach((link) => {
      const target = new URL(link.getAttribute('href'), window.location.href);
      if (normalizePath(target.pathname) !== current) return;
      link.setAttribute('aria-current', 'page');
    });
  }

  function wikiRootUrl() {
    const script = document.querySelector('script[src$="assets/site/wiki.js"], script[src$="wiki.js"]');
    if (!script) return new URL('./', window.location.href);
    return new URL('../../', script.src);
  }

  function normalizeSearchText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function searchIndex() {
    return Array.isArray(window.BZH_WIKI_SEARCH_INDEX) ? window.BZH_WIKI_SEARCH_INDEX : [];
  }

  function scoreSearchEntry(entry, terms) {
    const title = normalizeSearchText(entry.title);
    const path = normalizeSearchText(entry.path);
    const section = normalizeSearchText(entry.section);
    const keywords = normalizeSearchText(entry.keywords);
    const summary = normalizeSearchText(entry.summary);
    let score = 0;
    for (const term of terms) {
      if (title.includes(term)) score += title === term ? 80 : 35;
      if (path.includes(term)) score += 18;
      if (section.includes(term)) score += 14;
      if (keywords.includes(term)) score += 10;
      if (summary.includes(term)) score += 5;
    }
    // Pondere par fraicheur/fiabilite (canon > reference) une fois qu'il y a match.
    if (score > 0) score += Number(entry.boost) || 0;
    return score;
  }

  function matchingAnchors(entry, terms) {
    if (!Array.isArray(entry.anchors) || !entry.anchors.length) return [];
    return entry.anchors
      .filter((anchor) => {
        const t = normalizeSearchText(anchor.t);
        return terms.some((term) => t.includes(term));
      })
      .slice(0, 3);
  }

  function renderSearchResults(container, entries, rootUrl, terms) {
    if (!entries.length) {
      container.innerHTML = '<p class="wiki-search-empty">Aucun resultat.</p>';
      container.hidden = false;
      return;
    }

    const list = document.createElement('div');
    list.className = 'wiki-search-list';
    entries.slice(0, 10).forEach((entry) => {
      const link = document.createElement('a');
      link.className = 'wiki-search-result';
      link.href = new URL(entry.url, rootUrl).href;
      const title = document.createElement('strong');
      title.textContent = entry.title;
      const meta = document.createElement('span');
      meta.textContent = `${entry.section} - ${entry.path}`;
      const summary = document.createElement('small');
      summary.textContent = entry.summary || entry.keywords || '';
      link.append(title, meta, summary);
      list.appendChild(link);

      const anchors = matchingAnchors(entry, terms || []);
      if (anchors.length) {
        const anchorRow = document.createElement('div');
        anchorRow.className = 'wiki-search-anchors';
        anchors.forEach((anchor) => {
          const chip = document.createElement('a');
          chip.className = 'wiki-search-anchor';
          chip.href = new URL(anchor.u, rootUrl).href;
          chip.textContent = `# ${anchor.t}`;
          anchorRow.appendChild(chip);
        });
        list.appendChild(anchorRow);
      }
    });
    container.replaceChildren(list);
    container.hidden = false;
  }

  function bindWikiSearch() {
    const forms = [...document.querySelectorAll('[data-wiki-search-form]')];
    if (!forms.length) return;

    const rootUrl = wikiRootUrl();
    const entries = searchIndex();

    forms.forEach((form) => {
      const input = form.querySelector('[data-wiki-search-input]');
      const results = form.querySelector('[data-wiki-search-results]');
      if (!input || !results) return;

      function updateResults() {
        const terms = normalizeSearchText(input.value).split(/\s+/).filter((term) => term.length >= 2);
        if (!terms.length) {
          results.hidden = true;
          results.replaceChildren();
          return;
        }
        if (!entries.length) {
          results.innerHTML = '<p class="wiki-search-empty">Index de recherche indisponible.</p>';
          results.hidden = false;
          return;
        }
        const matches = entries
          .map((entry) => ({ entry, score: scoreSearchEntry(entry, terms) }))
          .filter((item) => item.score > 0)
          .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title, 'fr'))
          .map((item) => item.entry);
        renderSearchResults(results, matches, rootUrl, terms);
      }

      input.addEventListener('input', updateResults);
      input.addEventListener('focus', updateResults);
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const first = results.querySelector('a[href]');
        if (first) window.location.href = first.href;
      });

      input.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowDown') return;
        const first = results.querySelector('a[href]');
        if (first) { event.preventDefault(); first.focus(); }
      });
      results.addEventListener('keydown', (event) => {
        const links = [...results.querySelectorAll('a[href]')];
        const index = links.indexOf(document.activeElement);
        if (index === -1) return;
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          (links[index + 1] || links[0]).focus();
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          if (index === 0) input.focus();
          else links[index - 1].focus();
        }
      });
    });

    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-wiki-search-form]')) return;
      forms.forEach((form) => {
        const results = form.querySelector('[data-wiki-search-results]');
        if (results) results.hidden = true;
      });
    });

    document.addEventListener('keydown', (event) => {
      const tag = document.activeElement?.tagName || '';
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(tag) || document.activeElement?.isContentEditable;
      if (event.key === '/' && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const input = document.querySelector('[data-wiki-search-input]');
        if (input) { event.preventDefault(); input.focus(); input.select(); }
      } else if (event.key === 'Escape') {
        const open = document.querySelector('[data-wiki-search-results]:not([hidden])');
        if (open) {
          open.hidden = true;
          if (tag === 'INPUT' || open.contains(document.activeElement)) document.activeElement.blur();
        }
      }
    });
  }

  function bindControls() {
    let prefs = readPrefs();
    applyPrefs(prefs);

    document.addEventListener('click', (event) => {
      const button = event.target.closest('[data-reader-action]');
      if (!button) return;

      const action = button.dataset.readerAction;
      prefs = readPrefs();
      if (action === 'theme') {
        if (button.dataset.themeValue) prefs.theme = button.dataset.themeValue;
      } else if (action === 'font-up') {
        prefs.fontScale = clamp(Number(prefs.fontScale ?? 0) + 1, -1, 2);
      } else if (action === 'font-down') {
        prefs.fontScale = clamp(Number(prefs.fontScale ?? 0) - 1, -1, 2);
      } else if (action === 'font-reset') {
        prefs.fontScale = 0;
      } else if (action === 'dyslexic') {
        prefs.dyslexic = prefs.dyslexic !== true;
      }
      writePrefs(prefs);
      applyPrefs(prefs);
    });
  }

  function bindMediaGallery() {
    const toolbar = document.querySelector('[data-media-toolbar]');
    if (!toolbar) return;

    const search = toolbar.querySelector('[data-media-search]');
    const category = toolbar.querySelector('[data-media-category]');
    const resultCount = toolbar.querySelector('[data-media-result-count]');
    const cards = [...document.querySelectorAll('[data-media-card]')];
    const sections = [...document.querySelectorAll('[data-media-section]')];

    toolbar.addEventListener('submit', (event) => event.preventDefault());

    function applyFilter() {
      const query = (search?.value || '').trim().toLowerCase();
      const selected = category?.value || 'all';
      let visible = 0;

      cards.forEach((card) => {
        const matchesCategory = selected === 'all' || card.dataset.category === selected;
        const matchesSearch = !query || (card.dataset.search || '').includes(query);
        const show = matchesCategory && matchesSearch;
        card.hidden = !show;
        if (show) visible++;
      });

      sections.forEach((section) => {
        const hasVisibleCard = Boolean(section.querySelector('[data-media-card]:not([hidden])'));
        section.hidden = !hasVisibleCard;
      });

      if (resultCount) {
        resultCount.textContent = `${visible} fichier${visible > 1 ? 's' : ''} visible${visible > 1 ? 's' : ''}`;
      }
    }

    search?.addEventListener('input', applyFilter);
    category?.addEventListener('change', applyFilter);
    applyFilter();
  }

  function injectAudioPlayer() {
    if (document.querySelector('script[data-bzh-playlist], script[src*="audio-player"]')) return;

    const wikiRoot = wikiRootUrl();
    const playerSrc = new URL('assets/site/audio-player.js', wikiRoot).href;
    const playlistSrc = new URL('media/audio/playlist.json', wikiRoot).href;

    const script = document.createElement('script');
    script.src = playerSrc;
    script.defer = true;
    script.dataset.bzhPlaylist = playlistSrc;
    document.head.appendChild(script);
  }

  function injectWikiCollaboration() {
    if (!document.querySelector('.wiki-page')) return;
    if (document.querySelector('script[data-wiki-collaboration-loader]')) return;

    const script = document.createElement('script');
    script.type = 'module';
    script.src = new URL('assets/site/wiki-collaboration.js', wikiRootUrl()).href;
    script.dataset.wikiCollaborationLoader = '';
    document.head.appendChild(script);
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindControls();
    markCurrentNavigation();
    bindWikiSearch();
    updateToc();
    setupScrollSpy();
    enhanceHeadings();
    setupBackToTop();
    setupProgressBar();
    setupLightbox();
    setupSidebarCollapse();
    setupFocusMode();
    bindMediaGallery();
    injectAudioPlayer();
    injectWikiCollaboration();
  });
})();
