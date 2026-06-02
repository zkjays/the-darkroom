import { createClient } from "@supabase/supabase-js";

// Client-side supabase (uses anon key)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Server-side supabase (uses service key, for API routes only)
export function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
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
