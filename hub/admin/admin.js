import {
  getWikiIdentity,
  getWikiServices,
  onWikiIdentityChange,
} from '../../assets/site/wiki-auth.js';

const FUNCTION_NAME = 'wiki-moderation';
const wikiRootUrl = new URL('../../', import.meta.url);

const gate = document.querySelector('[data-admin-gate]');
const dashboard = document.querySelector('[data-admin-dashboard]');
const moderatorName = document.querySelector('[data-admin-moderator]');
const refreshButton = document.querySelector('[data-admin-refresh]');
const globalStatus = document.querySelector('[data-admin-status]');
const contributionCount = document.querySelector('[data-contribution-count]');
const flaggedCount = document.querySelector('[data-flagged-count]');
const recentCount = document.querySelector('[data-recent-count]');
const contributionList = document.querySelector('[data-contribution-list]');
const flaggedList = document.querySelector('[data-flagged-list]');
const recentList = document.querySelector('[data-recent-list]');

let activeUserId = null;
let loadGeneration = 0;

function element(tag, options = {}) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.type) node.type = options.type;
  return node;
}

function setStatus(message, kind = 'info') {
  globalStatus.textContent = message;
  globalStatus.dataset.kind = kind;
  globalStatus.hidden = !message;
}

function formatDate(value) {
  if (!value) return 'Date inconnue';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function authorLabel(record) {
  return record.author_nitro || record.author_name || 'Anonyme';
}

function pageUrl(slug) {
  const clean = String(slug || '').replace(/^\/+|\/+$/g, '');
  if (!clean || clean === 'index') return new URL('hub/', wikiRootUrl).href;
  if (clean === 'hub') return new URL('hub/', wikiRootUrl).href;

  const directRoot = /^(hub|media|web)\//.test(clean);
  const path = directRoot ? clean : `docs/${clean}`;
  if (/\.(?:html?|pdf)$/i.test(path)) return new URL(path, wikiRootUrl).href;
  return new URL(`${path}.html`, wikiRootUrl).href;
}

function queueEmpty(text) {
  return element('p', { className: 'wiki-admin-empty', text });
}

async function invoke(action, payload = {}) {
  const { supabase } = await getWikiServices();
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: { action, ...payload },
  });

  if (error) {
    const message = data?.error || error.message || 'Edge Function indisponible';
    throw new Error(message);
  }

  if (data?.error) throw new Error(data.error);
  return data;
}

function setButtonsBusy(container, busy) {
  container.querySelectorAll('button, textarea').forEach((control) => {
    control.disabled = busy;
  });
}

function recordMeta(record) {
  const meta = element('div', { className: 'wiki-admin-meta' });
  const page = element('a', { text: record.page_slug || 'page inconnue' });
  page.href = pageUrl(record.page_slug);
  page.target = '_blank';
  page.rel = 'noopener';
  const author = element('span', { text: authorLabel(record) });
  const date = element('time', { text: formatDate(record.created_at) });
  if (record.created_at) date.dateTime = record.created_at;
  meta.append(page, author, date);
  return meta;
}

function textPanel(title, value, className = '') {
  const panel = element('section', { className: `wiki-admin-text-panel ${className}`.trim() });
  panel.append(
    element('h3', { text: title }),
    element('pre', { text: value || 'Aucun contenu capture.' }),
  );
  return panel;
}

function renderContribution(record) {
  const card = element('article', { className: 'wiki-admin-card' });
  card.dataset.recordId = record.id;

  const heading = element('div', { className: 'wiki-admin-card-heading' });
  const title = element('h3', { text: record.field_key || 'Modification de page' });
  const badge = element('span', { className: 'wiki-admin-badge wiki-admin-badge-pending', text: 'PENDING' });
  heading.append(title, badge);

  const comparison = element('div', { className: 'wiki-admin-comparison' });
  comparison.append(
    textPanel('Valeur actuelle', record.current_value, 'wiki-admin-current'),
    textPanel('Proposition', record.proposed_value, 'wiki-admin-proposed'),
  );

  const noteLabel = element('label', { className: 'wiki-admin-note' });
  noteLabel.append(element('span', { text: 'Note de refus optionnelle' }));
  const note = element('textarea');
  note.rows = 2;
  note.maxLength = 1000;
  note.placeholder = 'Motif ou precision pour l’auteur…';
  noteLabel.append(note);

  const actions = element('div', { className: 'wiki-admin-actions' });
  const approve = element('button', { className: 'wiki-admin-button', text: 'Approuver', type: 'button' });
  const reject = element('button', { className: 'wiki-admin-button wiki-admin-button-danger', text: 'Rejeter', type: 'button' });
  actions.append(approve, reject);

  approve.addEventListener('click', async () => {
    setButtonsBusy(card, true);
    setStatus('Approbation en cours…');
    try {
      await invoke('approve_contribution', { id: record.id });
      setStatus('Contribution approuvee. Le statut est enregistre ; le contenu statique reste a integrer dans Git.', 'success');
      await loadQueues();
    } catch (error) {
      setStatus(`Approbation impossible : ${error.message}`, 'error');
      setButtonsBusy(card, false);
    }
  });

  reject.addEventListener('click', async () => {
    setButtonsBusy(card, true);
    setStatus('Rejet en cours…');
    try {
      await invoke('reject_contribution', {
        id: record.id,
        reviewer_note: note.value.trim(),
      });
      setStatus('Contribution rejetee.', 'success');
      await loadQueues();
    } catch (error) {
      setStatus(`Rejet impossible : ${error.message}`, 'error');
      setButtonsBusy(card, false);
    }
  });

  card.append(heading, recordMeta(record), comparison, noteLabel, actions);
  return card;
}

function renderComment(record, isFlagged) {
  const card = element('article', { className: 'wiki-admin-card wiki-admin-comment-card' });
  card.dataset.recordId = record.id;

  const heading = element('div', { className: 'wiki-admin-card-heading' });
  heading.append(
    element('h3', { text: isFlagged ? 'Commentaire signale' : 'Commentaire visible' }),
    element('span', {
      className: `wiki-admin-badge ${isFlagged ? 'wiki-admin-badge-flagged' : 'wiki-admin-badge-visible'}`,
      text: isFlagged ? 'FLAGGED' : 'VISIBLE',
    }),
  );

  const body = element('blockquote', { className: 'wiki-admin-comment', text: record.content || '' });
  const actions = element('div', { className: 'wiki-admin-actions' });
  const hide = element('button', { className: 'wiki-admin-button wiki-admin-button-danger', text: 'Masquer', type: 'button' });
  actions.append(hide);

  if (isFlagged) {
    const reason = element('p', {
      className: 'wiki-admin-flag-reason',
      text: `Signalement : ${record.flagged_reason || 'raison non renseignee'}`,
    });
    card.append(heading, recordMeta(record), reason, body);

    const clear = element('button', { className: 'wiki-admin-button wiki-admin-button-secondary', text: 'Conserver visible', type: 'button' });
    actions.prepend(clear);
    clear.addEventListener('click', async () => {
      setButtonsBusy(card, true);
      setStatus('Suppression du signalement…');
      try {
        await invoke('clear_comment_flag', { id: record.id });
        setStatus('Signalement retire, commentaire conserve.', 'success');
        await loadQueues();
      } catch (error) {
        setStatus(`Action impossible : ${error.message}`, 'error');
        setButtonsBusy(card, false);
      }
    });
  } else {
    card.append(heading, recordMeta(record), body);
  }

  hide.addEventListener('click', async () => {
    setButtonsBusy(card, true);
    setStatus('Masquage du commentaire…');
    try {
      await invoke('hide_comment', { id: record.id });
      setStatus('Commentaire masque.', 'success');
      await loadQueues();
    } catch (error) {
      setStatus(`Masquage impossible : ${error.message}`, 'error');
      setButtonsBusy(card, false);
    }
  });

  card.append(actions);
  return card;
}

function renderQueue(container, records, renderer, emptyText) {
  if (!records.length) {
    container.replaceChildren(queueEmpty(emptyText));
    return;
  }
  container.replaceChildren(...records.map(renderer));
}

async function loadQueues() {
  const generation = ++loadGeneration;
  refreshButton.disabled = true;
  setStatus('Chargement des files de moderation…');

  try {
    const data = await invoke('list');
    if (generation !== loadGeneration) return;

    const contributions = data.contributions || [];
    const flagged = data.flagged_comments || [];
    const recent = data.recent_comments || [];

    moderatorName.textContent = data.moderator?.username || 'Superuser';
    contributionCount.textContent = String(contributions.length);
    flaggedCount.textContent = String(flagged.length);
    recentCount.textContent = String(recent.length);

    renderQueue(contributionList, contributions, renderContribution, 'Aucune contribution en attente.');
    renderQueue(flaggedList, flagged, (record) => renderComment(record, true), 'Aucun commentaire signale.');
    renderQueue(recentList, recent, (record) => renderComment(record, false), 'Aucun commentaire visible recent.');
    setStatus('Files de moderation synchronisees.', 'success');
  } catch (error) {
    setStatus(`Chargement impossible : ${error.message}`, 'error');
  } finally {
    refreshButton.disabled = false;
  }
}

function loginHref() {
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  return `/login.html?next=${next}`;
}

function renderGate(identity) {
  dashboard.hidden = true;
  gate.hidden = false;

  if (!identity.available) {
    gate.replaceChildren(
      element('h2', { text: 'Connexion Nitro indisponible' }),
      element('p', { text: 'Les modules partages n’ont pas pu etre charges.' }),
    );
    return;
  }

  if (!identity.isAuthenticated) {
    gate.replaceChildren(
      element('h2', { text: 'Authentification requise' }),
      element('p', { text: 'Connectez-vous avec votre compte Nitro pour ouvrir la console.' }),
    );
    const link = element('a', { className: 'wiki-admin-button', text: 'Se connecter a Nitro' });
    link.href = loginHref();
    gate.append(link);
    return;
  }

  if (!identity.isAdmin) {
    gate.replaceChildren(
      element('h2', { text: 'Acces refuse' }),
      element('p', { text: `Le profil ${identity.username || 'connecte'} ne possede pas le role superuser.` }),
    );
    return;
  }

  gate.hidden = true;
  dashboard.hidden = false;
  moderatorName.textContent = identity.username || 'Superuser';

  if (activeUserId !== identity.user.id) {
    activeUserId = identity.user.id;
    loadQueues();
  }
}

refreshButton.addEventListener('click', loadQueues);

getWikiIdentity().then(renderGate);
onWikiIdentityChange(renderGate);
