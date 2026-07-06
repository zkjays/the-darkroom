import { createClient } from "@supabase/supabase-js";

// NOTE: no module-level createClient here. A top-level client evaluates at
// import time — if its env var is missing, EVERY route importing this module
// crashes at load (the "supabaseUrl is required" failure seen on /api/chat
// during page-data collection). Keep client creation inside functions.

// Server-side supabase (uses service key, for API routes only)
export function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error(
      `Supabase env missing: ${!url ? "NEXT_PUBLIC_SUPABASE_URL " : ""}${!key ? "SUPABASE_SERVICE_KEY" : ""}`.trim()
    );
  }
  return createClient(url, key);
}

/*
  ── SUPABASE RLS POLICIES ─────────────────────────────────────────────────
  Run these in the Supabase SQL Editor to lock down direct table access.
  All writes go through the service-key API routes (which bypass RLS).
  Anon/authenticated users should only be able to read public rows.

  -- darkroom_ids: anyone can read public profiles; only service key can write
  ALTER TABLE darkroom_ids ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "public profiles readable" ON darkroom_ids
    FOR SELECT USING (profile_public = true OR profile_public IS NULL);

  -- daily_goals: anyone can read public completed proofs; only service key writes
  ALTER TABLE daily_goals ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "public proofs readable" ON daily_goals
    FOR SELECT USING (is_public = true AND status = 'completed');

  -- goal_endorsements: anyone can read; only service key writes
  ALTER TABLE goal_endorsements ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "endorsements readable" ON goal_endorsements
    FOR SELECT USING (true);
  ──────────────────────────────────────────────────────────────────────────
*/
