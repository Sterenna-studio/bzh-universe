-- ============================================================
-- BZH Universe Wiki — Public access hardening
-- Follow-up to 20260711_wiki_contributions.sql
-- ============================================================

-- The public wiki only inserts proposals. Moderation reads use the
-- service role from the protected Edge Function.
REVOKE ALL ON TABLE public.contributions FROM anon, authenticated;
REVOKE ALL ON TABLE public.comments      FROM anon, authenticated;
REVOKE ALL ON TABLE public.admin_users   FROM anon, authenticated;

GRANT INSERT         ON TABLE public.contributions TO anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.comments      TO anon, authenticated;

-- Legacy admin table and pending proposals are not public Data API resources.
DROP POLICY IF EXISTS "admin_users_select_public"       ON public.admin_users;
DROP POLICY IF EXISTS "contributions_select_public"     ON public.contributions;

-- Anonymous submissions keep a free public alias. Authenticated submissions
-- must use both the JWT UUID and the canonical username stored in profiles.
DROP POLICY IF EXISTS "contributions_insert_public" ON public.contributions;
CREATE POLICY "contributions_insert_public"
  ON public.contributions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (
      (SELECT auth.uid()) IS NULL
      AND author_nitro_id IS NULL
    )
    OR
    (
      (SELECT auth.uid()) IS NOT NULL
      AND author_nitro_id = (SELECT auth.uid())::text
      AND author_nitro = (
        SELECT p.username
        FROM public.profiles AS p
        WHERE p.id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "comments_insert_public" ON public.comments;
CREATE POLICY "comments_insert_public"
  ON public.comments
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    (
      (SELECT auth.uid()) IS NULL
      AND author_nitro_id IS NULL
      AND author_nitro IS NULL
    )
    OR
    (
      (SELECT auth.uid()) IS NOT NULL
      AND author_nitro_id = (SELECT auth.uid())::text
      AND author_nitro = (
        SELECT p.username
        FROM public.profiles AS p
        WHERE p.id = (SELECT auth.uid())
      )
      AND author_name IS NULL
    )
  );
