const DEFAULT_SHARED_BASE = '/shared/';
const wikiRootUrl = new URL('../../', import.meta.url);

let servicesPromise = null;
let identityPromise = null;
let identityState = null;
let authSubscription = null;
const identityListeners = new Set();

function sharedBaseUrl() {
  const configured = document.querySelector('meta[name="nitro-shared-base"]')?.content?.trim();
  return new URL(configured || DEFAULT_SHARED_BASE, window.location.href);
}

export async function getWikiServices() {
  if (!servicesPromise) {
    servicesPromise = Promise.all([
      import(new URL('supabase-client.js', sharedBaseUrl()).href),
      import(new URL('profile.js', sharedBaseUrl()).href),
    ]).then(([clientModule, profileModule]) => {
      if (!clientModule?.supabase || typeof profileModule?.getProfile !== 'function') {
        throw new Error('Modules Nitro partages incomplets.');
      }

      return {
        supabase: clientModule.supabase,
        getProfile: profileModule.getProfile,
      };
    });
  }

  return servicesPromise;
}

function fallbackUsername(user) {
  return (
    user?.user_metadata?.username ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    null
  );
}

async function buildIdentity(userOverride) {
  const { supabase, getProfile } = await getWikiServices();
  let user = userOverride;

  if (typeof userOverride === 'undefined') {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    user = data?.session?.user || null;
  }

  const profile = user ? await getProfile(user.id) : null;
  const username = profile?.username || fallbackUsername(user);
  const role = profile?.role || 'guest';

  return {
    available: true,
    user,
    profile,
    username,
    role,
    isAuthenticated: Boolean(user),
    isAdmin: role === 'superuser',
    error: null,
  };
}

function unavailableIdentity(error) {
  return {
    available: false,
    user: null,
    profile: null,
    username: null,
    role: 'guest',
    isAuthenticated: false,
    isAdmin: false,
    error,
  };
}

function publishIdentity(identity) {
  identityState = identity;
  identityListeners.forEach((listener) => {
    try {
      listener(identity);
    } catch (error) {
      console.warn('[bzh-wiki] identity listener failed:', error);
    }
  });
  return identity;
}

async function refreshIdentity(userOverride) {
  identityPromise = buildIdentity(userOverride)
    .then(publishIdentity)
    .catch((error) => publishIdentity(unavailableIdentity(error)));
  return identityPromise;
}

async function installAuthWatcher() {
  if (authSubscription) return;

  try {
    const { supabase } = await getWikiServices();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => refreshIdentity(session?.user || null));
    });
    authSubscription = data?.subscription || null;
  } catch (error) {
    console.warn('[bzh-wiki] auth watcher unavailable:', error?.message || error);
  }
}

export async function getWikiIdentity(options = {}) {
  if (!identityPromise || options.force === true) {
    await refreshIdentity(undefined);
    installAuthWatcher();
  }

  return identityPromise;
}

export function onWikiIdentityChange(listener) {
  if (typeof listener !== 'function') return () => {};
  identityListeners.add(listener);
  if (identityState) listener(identityState);
  return () => identityListeners.delete(listener);
}

export function getWikiPageSlug() {
  const pageUrl = new URL(window.location.href);
  const rootPath = decodeURIComponent(wikiRootUrl.pathname).replace(/\/+$/, '/');
  let relativePath = decodeURIComponent(pageUrl.pathname);

  if (relativePath.startsWith(rootPath)) {
    relativePath = relativePath.slice(rootPath.length);
  } else {
    relativePath = relativePath.replace(/^\/+/, '');
  }

  return relativePath
    .replace(/\/(?:index|README)\.html$/i, '')
    .replace(/\.html$/i, '')
    .replace(/^docs\//i, '')
    .replace(/^hub\/?$/i, 'hub')
    .replace(/^\/+|\/+$/g, '') || 'index';
}

export function getWikiPageTitle() {
  return document.querySelector('.wiki-page h1')?.textContent?.trim() || document.title;
}
