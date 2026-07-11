-- ============================================================
-- BZH Universe Wiki — Contributions & Commentaires
-- Migration : 2026-07-11
-- NE TOUCHE PAS aux tables existantes.
-- Cree uniquement : contributions, comments, admin_users
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

CREATE TABLE IF NOT EXISTS contributions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug       text        NOT NULL,
  field_key       text        NOT NULL,
  current_value   text,
  proposed_value  text        NOT NULL,
  status          contribution_status NOT NULL DEFAULT 'pending',
  author_nitro_id text,
  author_nitro    text,
  author_ip_hash  text,
  reviewed_at     timestamptz,
  reviewed_by     uuid,
  reviewer_note   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contributions_page   ON contributions(page_slug);
CREATE INDEX IF NOT EXISTS idx_contributions_status ON contributions(status);
CREATE INDEX IF NOT EXISTS idx_contributions_nitro  ON contributions(author_nitro_id);

-- ── 3. TABLE comments ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS comments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug       text        NOT NULL,
  content         text        NOT NULL,
  author_nitro_id text,
  author_nitro    text,
  author_name     text,
  author_ip_hash  text,
  status          comment_status NOT NULL DEFAULT 'visible',
  flagged_reason  text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_page   ON comments(page_slug);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
CREATE INDEX IF NOT EXISTS idx_comments_nitro  ON comments(author_nitro_id);

-- ── 4. TABLE admin_users ────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nitro_id        text        NOT NULL UNIQUE,
  nitro_username  text        NOT NULL,
  role            admin_role  NOT NULL DEFAULT 'moderator',
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 5. TRIGGER updated_at ────────────────────────────────────

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

ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users   ENABLE ROW LEVEL SECURITY;

-- DROP avant CREATE pour eviter les conflits si re-run
DROP POLICY IF EXISTS "contributions_insert_public" ON contributions;
DROP POLICY IF EXISTS "contributions_select_public" ON contributions;
DROP POLICY IF EXISTS "comments_insert_public"      ON comments;
DROP POLICY IF EXISTS "comments_select_public"      ON comments;
DROP POLICY IF EXISTS "admin_users_select_public"   ON admin_users;

CREATE POLICY "contributions_insert_public"
  ON contributions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "contributions_select_public"
  ON contributions FOR SELECT
  TO anon, authenticated
  USING (status IN ('pending', 'approved'));

CREATE POLICY "comments_insert_public"
  ON comments FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "comments_select_public"
  ON comments FOR SELECT
  TO anon, authenticated
  USING (status = 'visible');

CREATE POLICY "admin_users_select_public"
  ON admin_users FOR SELECT
  TO anon, authenticated
  USING (true);

-- ── FIN MIGRATION ─────────────────────────────────────────────
-- Tables crees     : contributions, comments, admin_users
-- Tables existantes : NON MODIFIEES
-- Idempotent        : safe a re-executer
