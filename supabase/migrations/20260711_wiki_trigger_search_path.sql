-- ============================================================
-- BZH Universe Wiki — Trigger function hardening
-- ============================================================

-- The function only uses pg_catalog.now() and the trigger NEW record.
-- Pinning search_path prevents object-shadowing through mutable schemas.
ALTER FUNCTION public.update_updated_at()
  SET search_path = pg_catalog;
