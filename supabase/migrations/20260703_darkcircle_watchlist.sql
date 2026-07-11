-- Migration: DarkCircle — personal builder watchlist
-- Run this in the Supabase SQL Editor before deploying the DarkCircle feature.
-- NOT applied automatically — local file only, apply manually.

CREATE TABLE IF NOT EXISTS darkcircle_watchlist (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_handle   TEXT NOT NULL,
  watched_handle TEXT NOT NULL,
  added_at       TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT darkcircle_watchlist_no_self_watch CHECK (owner_handle <> watched_handle),
  CONSTRAINT darkcircle_watchlist_owner_watched_unique UNIQUE (owner_handle, watched_handle)
);

CREATE INDEX IF NOT EXISTS darkcircle_watchlist_owner_idx ON darkcircle_watchlist (owner_handle);

ALTER TABLE darkcircle_watchlist ENABLE ROW LEVEL SECURITY;

-- Service key only — the watchlist is private to its owner, enforced in
-- app/api/darkcircle/route.ts via session-handle checks. No public/anon
-- reads or writes: nobody's watchlist is a shared feed.
CREATE POLICY "service_only" ON darkcircle_watchlist USING (false);
