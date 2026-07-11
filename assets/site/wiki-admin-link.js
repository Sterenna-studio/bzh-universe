import { getWikiIdentity, onWikiIdentityChange } from './wiki-auth.js';

function updateAdminLinks(identity) {
  const visible = Boolean(identity?.available && identity?.isAdmin);
  document.querySelectorAll('[data-wiki-admin-link]').forEach((node) => {
    node.hidden = !visible;
  });
}

getWikiIdentity().then(updateAdminLinks);
onWikiIdentityChange(updateAdminLinks);
