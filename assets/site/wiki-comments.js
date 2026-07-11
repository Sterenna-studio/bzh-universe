import {
  getWikiIdentity,
  getWikiPageSlug,
  getWikiServices,
  onWikiIdentityChange,
} from './wiki-auth.js';

const MAX_COMMENT_LENGTH = 2400;
const MAX_COMMENTS = 100;

function element(tag, options = {}) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text) node.textContent = options.text;
  if (options.type) node.type = options.type;
  return node;
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value || '';
  }
}

function displayAuthor(comment) {
  return comment.author_nitro || comment.author_name || 'Anonyme';
}

function renderComment(comment) {
  const item = element('article', { className: 'wiki-comment' });
  const header = element('header', { className: 'wiki-comment-header' });
  const author = element('strong', { text: displayAuthor(comment) });
  const time = element('time', { text: formatDate(comment.created_at) });
  if (comment.created_at) time.dateTime = comment.created_at;
  const body = element('p', { text: comment.content });

  header.append(author, time);
  item.append(header, body);
  return item;
}

function setStatus(node, message, kind = 'info') {
  node.textContent = message;
  node.dataset.kind = kind;
  node.hidden = !message;
}

function applyIdentity(identity, ui) {
  ui.aliasRow.hidden = Boolean(identity.isAuthenticated);
  ui.alias.required = !identity.isAuthenticated;
  ui.identity.textContent = identity.available && identity.isAuthenticated
    ? `Vous commentez comme ${identity.username || 'Agent Nitro'}.`
    : 'Vous commentez sans session Nitro.';

  if (!identity.available) {
    ui.submit.disabled = true;
    setStatus(ui.status, 'Connexion Nitro indisponible. Les commentaires ne peuvent pas etre charges.', 'error');
  } else {
    ui.submit.disabled = false;
    if (ui.status.dataset.kind === 'error') setStatus(ui.status, '');
  }
}

export async function initWikiComments() {
  const page = document.querySelector('.wiki-page');
  if (!page || page.querySelector('[data-wiki-comments]')) return;

  const section = element('section', { className: 'wiki-collab wiki-comments' });
  section.dataset.wikiComments = '';
  section.dataset.wikiCollaboration = '';
  section.setAttribute('aria-labelledby', 'wiki-comments-title');

  const header = element('div', { className: 'wiki-comments-heading' });
  const title = element('h2', { text: 'Commentaires' });
  title.id = 'wiki-comments-title';
  const refresh = element('button', { className: 'wiki-collab-button wiki-collab-button-secondary', text: 'Actualiser', type: 'button' });
  header.append(title, refresh);

  const identity = element('p', { className: 'wiki-collab-identity', text: 'Verification Nitro…' });
  const list = element('div', { className: 'wiki-comments-list' });
  list.setAttribute('aria-live', 'polite');

  const empty = element('p', { className: 'wiki-comments-empty', text: 'Aucun commentaire pour le moment.' });
  const form = element('form', { className: 'wiki-collab-form wiki-comment-form' });
  form.noValidate = true;

  const commentLabel = element('label', { className: 'wiki-collab-field' });
  commentLabel.append(element('span', { text: 'Votre commentaire' }));
  const content = element('textarea');
  content.name = 'content';
  content.rows = 4;
  content.maxLength = MAX_COMMENT_LENGTH;
  content.required = true;
  content.placeholder = 'Question, precision, source ou remarque sur cette page…';
  commentLabel.append(content);

  const aliasRow = element('label', { className: 'wiki-collab-field wiki-collab-alias' });
  aliasRow.append(element('span', { text: 'Pseudo public' }));
  const alias = element('input');
  alias.name = 'author_name';
  alias.type = 'text';
  alias.maxLength = 40;
  alias.autocomplete = 'nickname';
  aliasRow.append(alias);

  const actions = element('div', { className: 'wiki-collab-actions' });
  const submit = element('button', { className: 'wiki-collab-button', text: 'Publier', type: 'submit' });
  actions.append(submit);

  const status = element('p', { className: 'wiki-collab-status' });
  status.hidden = true;
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  form.append(commentLabel, aliasRow, actions, status);
  section.append(header, identity, list, empty, form);
  page.append(section);

  const ui = { aliasRow, alias, identity, submit, status };
  let currentIdentity = await getWikiIdentity();
  applyIdentity(currentIdentity, ui);
  onWikiIdentityChange((nextIdentity) => {
    currentIdentity = nextIdentity;
    applyIdentity(nextIdentity, ui);
  });

  async function loadComments() {
    if (!currentIdentity.available) return;
    refresh.disabled = true;
    setStatus(status, 'Chargement des commentaires…');

    try {
      const { supabase } = await getWikiServices();
      const { data, error } = await supabase
        .from('comments')
        .select('id, content, author_nitro_id, author_nitro, author_name, created_at')
        .eq('page_slug', getWikiPageSlug())
        .eq('status', 'visible')
        .order('created_at', { ascending: true })
        .limit(MAX_COMMENTS);

      if (error) throw error;
      list.replaceChildren(...(data || []).map(renderComment));
      empty.hidden = Boolean(data?.length);
      setStatus(status, '');
    } catch (error) {
      console.error('[bzh-wiki] comments select failed:', error);
      setStatus(status, `Commentaires indisponibles : ${error?.message || 'erreur inconnue'}`, 'error');
    } finally {
      refresh.disabled = false;
    }
  }

  refresh.addEventListener('click', loadComments);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const commentContent = content.value.trim();
    const authorName = alias.value.trim();

    if (!commentContent) {
      setStatus(status, 'Ecrivez un commentaire avant publication.', 'error');
      content.focus();
      return;
    }

    if (!currentIdentity.isAuthenticated && !authorName) {
      setStatus(status, 'Choisissez un pseudo pour publier.', 'error');
      alias.focus();
      return;
    }

    submit.disabled = true;
    setStatus(status, 'Publication en cours…');

    try {
      const { supabase } = await getWikiServices();
      const payload = {
        page_slug: getWikiPageSlug(),
        content: commentContent,
        author_nitro_id: currentIdentity.user?.id || null,
        author_nitro: currentIdentity.isAuthenticated
          ? currentIdentity.username || 'Agent Nitro'
          : null,
        author_name: currentIdentity.isAuthenticated ? null : authorName,
      };

      const { data, error } = await supabase
        .from('comments')
        .insert(payload)
        .select('id, content, author_nitro_id, author_nitro, author_name, created_at')
        .single();

      if (error) throw error;
      content.value = '';
      list.append(renderComment(data));
      empty.hidden = true;
      setStatus(status, 'Commentaire publie.', 'success');
    } catch (error) {
      console.error('[bzh-wiki] comment insert failed:', error);
      setStatus(status, `Publication impossible : ${error?.message || 'erreur inconnue'}`, 'error');
    } finally {
      submit.disabled = !currentIdentity.available;
    }
  });

  await loadComments();
}
