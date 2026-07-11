import { initWikiContributions } from './wiki-contributions.js';
import { initWikiComments } from './wiki-comments.js';

function injectStylesheet() {
  if (document.querySelector('link[data-wiki-collaboration-style]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./wiki-collaboration.css', import.meta.url).href;
  link.dataset.wikiCollaborationStyle = '';
  document.head.append(link);
}

async function init() {
  if (!document.querySelector('.wiki-page')) return;
  injectStylesheet();

  try {
    await initWikiContributions();
    await initWikiComments();
  } catch (error) {
    console.error('[bzh-wiki] collaboration init failed:', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
