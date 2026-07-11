import {
  getWikiIdentity,
  getWikiServices,
  onWikiIdentityChange,
} from '../../assets/site/wiki-auth.js';

const wikiRootUrl = new URL('../../', import.meta.url);

const gate = document.querySelector('[data-contribution-gate]');
const dashboard = document.querySelector('[data-contribution-dashboard]');
const contributorName = document.querySelector('[data-contributor-name]');
const refreshButton = document.querySelector('[data-contribution-refresh]');
const globalStatus = document.querySelector('[data-contribution-status]');
const pendingCount = document.querySelector('[data-pending-count]');
const approvedCount = document.querySelector('[data-approved-count]');
const rejectedCount = document.querySelector('[data-rejected-count]');
const contributionList = document.querySelector('[data-contribution-list]');

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

function pageUrl(slug) {
  const clean = String(slug || '').replace(/^\/+|\/+$/g, '');
  if (!clean || clean === 'index' || clean === 'hub') return new URL('hub/', wikiRootUrl).href;

  const directRoot = /^(hub|media|web)\//.test(clean);
  const path = directRoot ? clean : `docs/${clean}`;
  if (/\.(?:html?|pdf)$/i.test(path)) return new URL(path, wikiRootUrl).href;
  return new URL(`${path}.html`, wikiRootUrl).href;
}

function statusInfo(status) {
  const values = {
    pending: { label: 'EN ATTENTE', className: 'wiki-admin-badge-pending' },
    approved: { label: 'APPROUVEE', className: 'wiki-admin-badge-approved' },
    rejected: { label: 'REJETEE', className: 'wiki-admin-badge-rejected' },
  };
  return values[status] || { label: String(status || 'INCONNU').toUpperCase(), className: '' };
}

function targetLabel(fieldKey) {
  if (!fieldKey || fieldKey === 'page') return 'Page entiere';
  if (fieldKey.startsWith('section:')) return `Section · ${fieldKey.slice('section:'.length)}`;
  return fieldKey;
}

function recordMeta(record) {
  const meta = element('div', { className: 'wiki-admin-meta' });
  const page = element('a', { text: record.page_slug || 'page inconnue' });
  page.href = pageUrl(record.page_slug);
  const created = element('time', { text: `Envoyee le ${formatDate(record.created_at)}` });
  if (record.created_at) created.dateTime = record.created_at;
  meta.append(page, created);

  if (record.reviewed_at) {
    const reviewed = element('time', { text: `Traitee le ${formatDate(record.reviewed_at)}` });
    reviewed.dateTime = record.reviewed_at;
    meta.append(reviewed);
  }

  return meta;
}

function textDetails(title, value, className = '') {
  const details = element('details', { className: `wiki-contribution-details ${className}`.trim() });
  details.append(
    element('summary', { text: title }),
    element('pre', { text: value || 'Aucun contenu capture.' }),
  );
  return details;
}

async function withdrawContribution(record, card) {
  const confirmed = window.confirm('Retirer cette proposition en attente ? Cette action est definitive.');
  if (!confirmed) return;

  card.querySelectorAll('button').forEach((button) => {
    button.disabled = true;
  });
  setStatus('Retrait de la proposition…');

  try {
    const { supabase } = await getWikiServices();
    const { error } = await supabase
      .from('contributions')
      .delete()
      .eq('id', record.id)
      .eq('status', 'pending')
      .select('id')
      .single();

    if (error) throw error;
    setStatus('Proposition retiree.', 'success');
    await loadContributions(activeUserId);
  } catch (error) {
    console.error('[bzh-wiki] contribution withdrawal failed:', error);
    setStatus('Retrait impossible. La proposition a peut-etre deja ete traitee.', 'error');
    card.querySelectorAll('button').forEach((button) => {
      button.disabled = false;
    });
  }
}

function renderContribution(record) {
  const card = element('article', { className: 'wiki-admin-card wiki-contribution-card' });
  card.dataset.recordId = record.id;

  const heading = element('div', { className: 'wiki-admin-card-heading' });
  const title = element('h3', { text: targetLabel(record.field_key) });
  const info = statusInfo(record.status);
  const badge = element('span', {
    className: `wiki-admin-badge ${info.className}`.trim(),
    text: info.label,
  });
  heading.append(title, badge);

  card.append(
    heading,
    recordMeta(record),
    textDetails('Voir le texte propose', record.proposed_value),
  );

  if (record.current_value) {
    card.append(textDetails('Voir le texte capture lors de l’envoi', record.current_value, 'wiki-contribution-current'));
  }

  if (record.reviewer_note) {
    const review = element('section', { className: 'wiki-contribution-review' });
    review.append(
      element('strong', { text: 'Note de la moderation' }),
      element('p', { text: record.reviewer_note }),
    );
    card.append(review);
  }

  if (record.status === 'approved') {
    card.append(element('p', {
      className: 'wiki-contribution-help',
      text: 'La proposition a ete acceptee editorialement. Son integration dans les fichiers du wiki reste une operation Git distincte.',
    }));
  }

  if (record.status === 'pending') {
    const actions = element('div', { className: 'wiki-admin-actions wiki-contribution-actions' });
    const withdraw = element('button', {
      className: 'wiki-admin-button wiki-admin-button-danger',
      text: 'Retirer la proposition',
      type: 'button',
    });
    withdraw.addEventListener('click', () => withdrawContribution(record, card));
    actions.append(withdraw);
    card.append(actions);
  }

  return card;
}

function renderList(records) {
  if (!records.length) {
    contributionList.replaceChildren(element('p', {
      className: 'wiki-admin-empty',
      text: 'Aucune contribution liee a cette session Nitro.',
    }));
    return;
  }
  contributionList.replaceChildren(...records.map(renderContribution));
}

function updateCounts(records) {
  pendingCount.textContent = String(records.filter((record) => record.status === 'pending').length);
  approvedCount.textContent = String(records.filter((record) => record.status === 'approved').length);
  rejectedCount.textContent = String(records.filter((record) => record.status === 'rejected').length);
}

async function loadContributions(userId) {
  if (!userId) return;
  const generation = ++loadGeneration;
  refreshButton.disabled = true;
  setStatus('Chargement de vos contributions…');

  try {
    const { supabase } = await getWikiServices();
    const { data, error } = await supabase
      .from('contributions')
      .select('id, page_slug, field_key, current_value, proposed_value, status, reviewed_at, reviewer_note, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (generation !== loadGeneration) return;

    const records = data || [];
    updateCounts(records);
    renderList(records);
    setStatus('Contributions synchronisees.', 'success');
  } catch (error) {
    console.error('[bzh-wiki] contribution tracking failed:', error);
    setStatus(`Chargement impossible : ${error?.message || 'erreur inconnue'}`, 'error');
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
    activeUserId = null;
    gate.replaceChildren(
      element('h2', { text: 'Authentification requise' }),
      element('p', { text: 'Le suivi est reserve aux propositions envoyees avec une session Nitro. Les contributions anonymes ne disposent pas d’un historique.' }),
    );
    const link = element('a', { className: 'wiki-admin-button', text: 'Se connecter a Nitro' });
    link.href = loginHref();
    gate.append(link);
    return;
  }

  gate.hidden = true;
  dashboard.hidden = false;
  contributorName.textContent = identity.username || 'connecte';

  if (activeUserId !== identity.user.id) {
    activeUserId = identity.user.id;
    loadContributions(activeUserId);
  }
}

refreshButton.addEventListener('click', () => loadContributions(activeUserId));

getWikiIdentity().then(renderGate);
onWikiIdentityChange(renderGate);
