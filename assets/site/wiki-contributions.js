import {
  getWikiIdentity,
  getWikiPageSlug,
  getWikiPageTitle,
  getWikiServices,
  onWikiIdentityChange,
} from './wiki-auth.js';

const MAX_PROPOSAL_LENGTH = 12000;
const MAX_CURRENT_LENGTH = 12000;

function element(tag, options = {}) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text) node.textContent = options.text;
  if (options.type) node.type = options.type;
  return node;
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function pageText(page) {
  const clone = page.cloneNode(true);
  clone.querySelectorAll('[data-wiki-collaboration]').forEach((node) => node.remove());
  return normalizeText(clone.textContent).slice(0, MAX_CURRENT_LENGTH);
}

function sectionText(heading) {
  const level = Number(heading.tagName.slice(1));
  const chunks = [];
  let node = heading.nextElementSibling;

  while (node) {
    if (/^H[1-6]$/.test(node.tagName) && Number(node.tagName.slice(1)) <= level) break;
    chunks.push(node.textContent || '');
    node = node.nextElementSibling;
  }

  return normalizeText(chunks.join(' ')).slice(0, MAX_CURRENT_LENGTH);
}

function buildTargets(page) {
  const targets = [{ key: 'page', label: 'Page entiere', currentValue: pageText(page) }];

  page.querySelectorAll('h2[id], h3[id]').forEach((heading) => {
    targets.push({
      key: `section:${heading.id}`,
      label: `${heading.tagName === 'H3' ? '↳ ' : ''}${heading.textContent.trim()}`,
      currentValue: sectionText(heading),
    });
  });

  return targets;
}

function setStatus(node, message, kind = 'info') {
  node.textContent = message;
  node.dataset.kind = kind;
  node.hidden = !message;
}

function applyIdentity(identity, ui) {
  const label = identity.available && identity.isAuthenticated
    ? `Connecte comme ${identity.username || 'Agent Nitro'}`
    : 'Contribution anonyme';

  ui.identity.textContent = label;
  ui.identity.dataset.authenticated = String(Boolean(identity.isAuthenticated));
  ui.aliasRow.hidden = Boolean(identity.isAuthenticated);
  ui.alias.required = !identity.isAuthenticated;

  if (!identity.available) {
    setStatus(ui.status, 'Connexion Nitro indisponible. La contribution ne peut pas etre envoyee.', 'error');
    ui.submit.disabled = true;
  } else {
    if (ui.status.dataset.kind === 'error') setStatus(ui.status, '');
    ui.submit.disabled = false;
  }
}

export async function initWikiContributions() {
  const page = document.querySelector('.wiki-page');
  if (!page || page.querySelector('[data-wiki-contributions]')) return;

  const targets = buildTargets(page);
  const section = element('section', { className: 'wiki-collab wiki-contributions' });
  section.dataset.wikiContributions = '';
  section.dataset.wikiCollaboration = '';

  const details = element('details', { className: 'wiki-collab-details' });
  const summary = element('summary', { text: 'Proposer une modification' });
  const intro = element('p', {
    className: 'wiki-collab-intro',
    text: 'Signalez une correction, une precision de canon ou une source manquante. La proposition sera relue avant integration.',
  });

  const identity = element('p', { className: 'wiki-collab-identity', text: 'Verification Nitro…' });
  const form = element('form', { className: 'wiki-collab-form' });
  form.noValidate = true;

  const targetLabel = element('label', { className: 'wiki-collab-field' });
  targetLabel.append(element('span', { text: 'Zone concernee' }));
  const targetSelect = element('select');
  targetSelect.name = 'field_key';
  targets.forEach((target) => {
    const option = element('option', { text: target.label });
    option.value = target.key;
    targetSelect.append(option);
  });
  targetLabel.append(targetSelect);

  const proposalLabel = element('label', { className: 'wiki-collab-field' });
  proposalLabel.append(element('span', { text: 'Texte propose' }));
  const proposal = element('textarea');
  proposal.name = 'proposed_value';
  proposal.rows = 7;
  proposal.maxLength = MAX_PROPOSAL_LENGTH;
  proposal.required = true;
  proposal.placeholder = 'Expliquez clairement le texte a ajouter, corriger ou remplacer…';
  proposalLabel.append(proposal);

  const aliasRow = element('label', { className: 'wiki-collab-field wiki-collab-alias' });
  aliasRow.append(element('span', { text: 'Pseudo public' }));
  const alias = element('input');
  alias.name = 'author_alias';
  alias.type = 'text';
  alias.maxLength = 40;
  alias.autocomplete = 'nickname';
  aliasRow.append(alias);

  const actions = element('div', { className: 'wiki-collab-actions' });
  const submit = element('button', { className: 'wiki-collab-button', text: 'Envoyer la proposition', type: 'submit' });
  const status = element('p', { className: 'wiki-collab-status' });
  status.hidden = true;
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  actions.append(submit);

  form.append(targetLabel, proposalLabel, aliasRow, actions, status);
  details.append(summary, intro, identity, form);
  section.append(details);
  page.append(section);

  const ui = { identity, aliasRow, alias, submit, status };
  let currentIdentity = await getWikiIdentity();
  applyIdentity(currentIdentity, ui);
  onWikiIdentityChange((nextIdentity) => {
    currentIdentity = nextIdentity;
    applyIdentity(nextIdentity, ui);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const proposedValue = proposal.value.trim();
    const authorAlias = alias.value.trim();

    if (!proposedValue) {
      setStatus(status, 'Ajoutez le contenu propose avant envoi.', 'error');
      proposal.focus();
      return;
    }

    if (!currentIdentity.isAuthenticated && !authorAlias) {
      setStatus(status, 'Choisissez un pseudo pour signer la proposition.', 'error');
      alias.focus();
      return;
    }

    submit.disabled = true;
    setStatus(status, 'Envoi en cours…');

    try {
      const { supabase } = await getWikiServices();
      const selected = targets.find((target) => target.key === targetSelect.value) || targets[0];
      const payload = {
        page_slug: getWikiPageSlug(),
        field_key: selected.key,
        current_value: selected.currentValue,
        proposed_value: proposedValue,
        author_nitro_id: currentIdentity.user?.id || null,
        author_nitro: currentIdentity.isAuthenticated
          ? currentIdentity.username || 'Agent Nitro'
          : authorAlias,
      };

      const { error } = await supabase.from('contributions').insert(payload);
      if (error) throw error;

      proposal.value = '';
      setStatus(status, `Proposition envoyee pour « ${getWikiPageTitle()} ». Merci.`, 'success');
    } catch (error) {
      console.error('[bzh-wiki] contribution insert failed:', error);
      setStatus(status, `Envoi impossible : ${error?.message || 'erreur inconnue'}`, 'error');
    } finally {
      submit.disabled = !currentIdentity.available;
    }
  });
}
