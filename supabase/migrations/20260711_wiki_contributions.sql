-- ============================================================
-- BZH Universe Wiki — Contributions & Commentaires
-- Migration : 2026-07-11
-- NE TOUCHE PAS aux tables existantes.
-- Crée uniquement : contributions, comments, admin_users
-- ============================================================

-- ── 1. ENUM statuts ─────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE contribution_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE comment_status AS ENUM ('visible', 'hidden', 'flagged');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE admin_role AS ENUM ('superadmin', 'moderator');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. TABLE contributions ───────────────────────────────────
-- Stocke les propositions d'edit de contenu wiki
-- Un edit = une modification sur un champ identifié d'une page

CREATE TABLE IF NOT EXISTS contributions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug       text        NOT NULL,  -- ex: 'universe/personnages'
  field_key       text        NOT NULL,  -- ex: 'description', 'lore-intro'
  current_value   text,                  -- valeur au moment de la proposition
  proposed_value  text        NOT NULL,
  status          contribution_status NOT NULL DEFAULT 'pending',
  -- Auteur
  author_nitro_id text,                  -- id Nitro depuis cookie sterenna.fr (null si anonyme)
  author_nitro    text,                  -- pseudo Nitro affiché
  author_ip_hash  text,                  -- SHA256 de l'IP — jamais en clair
  -- Modération
  reviewed_at     timestamptz,
  reviewed_by     uuid,                  -- admin_users.id
  reviewer_note   text,
  -- Timestamps
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contributions_page    ON contributions(page_slug);
CREATE INDEX IF NOT EXISTS idx_contributions_status  ON contributions(status);
CREATE INDEX IF NOT EXISTS idx_contributions_nitro   ON contributions(author_nitro_id);

-- ── 3. TABLE comments ────────────────────────────────────────
-- Commentaires libres en bas de chaque page wiki

CREATE TABLE IF NOT EXISTS comments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug       text        NOT NULL,
  content         text        NOT NULL,
  -- Auteur
  author_nitro_id text,                  -- null si anonyme
  author_nitro    text,                  -- pseudo Nitro
  author_name     text,                  -- nom saisi si anonyme
  author_ip_hash  text,
  -- Modération
  status          comment_status NOT NULL DEFAULT 'visible',
  flagged_reason  text,
  -- Timestamps
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_page    ON comments(page_slug);
CREATE INDEX IF NOT EXISTS idx_comments_status  ON comments(status);
CREATE INDEX IF NOT EXISTS idx_comments_nitro   ON comments(author_nitro_id);

-- ── 4. TABLE admin_users ────────────────────────────────────
-- Super users autorisés à modérer (indépendant de Supabase Auth)

CREATE TABLE IF NOT EXISTS admin_users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nitro_id        text        NOT NULL UNIQUE,  -- id Nitro = source de vérité
  nitro_username  text        NOT NULL,
  role            admin_role  NOT NULL DEFAULT 'moderator',
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 5. TRIGGER updated_at auto ──────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contributions_updated ON contributions;
CREATE TRIGGER trg_contributions_updated
  BEFORE UPDATE ON contributions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_comments_updated ON comments;
CREATE TRIGGER trg_comments_updated
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 6. ROW LEVEL SECURITY ────────────────────────────────────
-- Politique conservative : tout est fermé par défaut,
-- on ouvre uniquement ce qui est nécessaire au public.

ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users   ENABLE ROW LEVEL SECURITY;

-- contributions : INSERT public (anonyme ou connecté)
CREATE POLICY IF NOT EXISTS "contributions_insert_public"
  ON contributions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- contributions : SELECT uniquement les pending/approved pour le public
-- (rejected invisible côté wiki, visible seulement en admin)
CREATE POLICY IF NOT EXISTS "contributions_select_public"
  ON contributions FOR SELECT
  TO anon, authenticated
  USING (status IN ('pending', 'approved'));

-- comments : INSERT public
CREATE POLICY IF NOT EXISTS "comments_insert_public"
  ON comments FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- comments : SELECT uniquement les visibles
CREATE POLICY IF NOT EXISTS "comments_select_public"
  ON comments FOR SELECT
  TO anon, authenticated
  USING (status = 'visible');

-- admin_users : SELECT public (pour vérifier le rôle côté client)
CREATE POLICY IF NOT EXISTS "admin_users_select_public"
  ON admin_users FOR SELECT
  TO anon, authenticated
  USING (true);

-- ── 7. PURGE automatique des rejected (30 jours) ────────────
-- À activer via pg_cron dans le dashboard Supabase :
-- SELECT cron.schedule('purge-rejected', '0 3 * * *',
--   $$ DELETE FROM contributions WHERE status = 'rejected'
--      AND updated_at < now() - interval '30 days' $$);
-- (commenté ici car pg_cron s'active manuellement dans le dashboard)

-- ── FIN MIGRATION ─────────────────────────────────────────────
-- Tables créées : contributions, comments, admin_users
-- Tables existantes : NON MODIFIÉES
