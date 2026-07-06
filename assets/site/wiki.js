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

  document.addEventListener('DOMContentLoaded', () => {
    bindControls();
    updateToc();
  });
})();
