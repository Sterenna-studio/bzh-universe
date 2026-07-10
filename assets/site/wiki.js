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

  function applyPrefs(prefs) {
    const theme = prefs.theme === 'light' ? 'light' : 'dark';
    const scale = String(clamp(Number(prefs.fontScale ?? 0), -1, 2));
    const dyslexic = prefs.dyslexic === true;
    root.dataset.theme = theme;
    root.dataset.fontScale = scale;
    root.dataset.dyslexic = String(dyslexic);

    document.querySelectorAll('[data-reader-action="theme"]').forEach((button) => {
      button.setAttribute('aria-pressed', String(theme === 'light'));
      button.title = theme === 'light' ? 'Passer au theme sombre' : 'Passer au theme clair';
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
    return score;
  }

  function renderSearchResults(container, entries, rootUrl) {
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
        renderSearchResults(results, matches, rootUrl);
      }

      input.addEventListener('input', updateResults);
      input.addEventListener('focus', updateResults);
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const first = results.querySelector('a[href]');
        if (first) window.location.href = first.href;
      });
    });

    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-wiki-search-form]')) return;
      forms.forEach((form) => {
        const results = form.querySelector('[data-wiki-search-results]');
        if (results) results.hidden = true;
      });
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
        prefs.theme = prefs.theme === 'light' ? 'dark' : 'light';
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

  /**
   * Injecte audio-player.js sur toutes les pages du wiki.
   * - Si la page a deja un <script data-bzh-playlist> ou src*=audio-player,
   *   on ne fait rien (elle gere son propre chargement, ex: musique-et-albums).
   * - Sinon on charge le lecteur depuis assets/site/audio-player.js resolu
   *   via wikiRootUrl(), avec la playlist globale media/audio/playlist.json.
   */
  function injectAudioPlayer() {
    if (document.querySelector('script[data-bzh-playlist], script[src*="audio-player"]')) return;

    const wikiRoot   = wikiRootUrl();
    const playerSrc  = new URL('assets/site/audio-player.js', wikiRoot).href;
    const playlistSrc = new URL('media/audio/playlist.json',  wikiRoot).href;

    const script = document.createElement('script');
    script.src = playerSrc;
    script.defer = true;
    script.dataset.bzhPlaylist = playlistSrc;
    document.head.appendChild(script);
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindControls();
    markCurrentNavigation();
    bindWikiSearch();
    updateToc();
    bindMediaGallery();
    injectAudioPlayer();
  });
})();
