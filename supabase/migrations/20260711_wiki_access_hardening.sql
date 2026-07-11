-- ============================================================
-- BZH Universe Wiki — Public access hardening
-- Follow-up to 20260711_wiki_contributions.sql
-- ============================================================

-- The public wiki only needs SELECT + INSERT on its two public tables.
REVOKE ALL ON TABLE public.contributions FROM anon, authenticated;
REVOKE ALL ON TABLE public.comments      FROM anon, authenticated;
REVOKE ALL ON TABLE public.admin_users   FROM anon, authenticated;

GRANT SELECT, INSERT ON TABLE public.contributions TO anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.comments      TO anon, authenticated;

-- admin_users is legacy and must not be exposed through the Data API.
DROP POLICY IF EXISTS "admin_users_select_public" ON public.admin_users;

-- Authenticated attribution must match the JWT user id.
DROP POLICY IF EXISTS "contributions_insert_public" ON public.contributions;
CREATE POLICY "contributions_insert_public"
  ON public.contributions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    ((SELECT auth.uid()) IS NULL AND author_nitro_id IS NULL)
    OR
    ((SELECT auth.uid()) IS NOT NULL AND author_nitro_id = (SELECT auth.uid())::text)
  );

DROP POLICY IF EXISTS "comments_insert_public" ON public.comments;
CREATE POLICY "comments_insert_public"
  ON public.comments
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    ((SELECT auth.uid()) IS NULL AND author_nitro_id IS NULL)
    OR
    ((SELECT auth.uid()) IS NOT NULL AND author_nitro_id = (SELECT auth.uid())::text)
  );
