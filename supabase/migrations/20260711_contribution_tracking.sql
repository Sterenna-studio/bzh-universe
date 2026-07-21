-- Allow authenticated Nitro users to follow and withdraw only their own wiki contributions.

REVOKE SELECT ON public.contributions FROM anon, authenticated;
REVOKE DELETE ON public.contributions FROM anon, authenticated;

GRANT SELECT (
  id,
  page_slug,
  field_key,
  current_value,
  proposed_value,
  status,
  reviewed_at,
  reviewer_note,
  created_at,
  updated_at
) ON public.contributions TO authenticated;

GRANT DELETE ON public.contributions TO authenticated;

DROP POLICY IF EXISTS contributions_select_own ON public.contributions;
CREATE POLICY contributions_select_own
ON public.contributions
FOR SELECT
TO authenticated
USING ((SELECT auth.uid())::text = author_nitro_id);

DROP POLICY IF EXISTS contributions_delete_own_pending ON public.contributions;
CREATE POLICY contributions_delete_own_pending
ON public.contributions
FOR DELETE
TO authenticated
USING (
  (SELECT auth.uid())::text = author_nitro_id
  AND status = 'pending'::public.contribution_status
);
