-- Migration: automated GitHub ownership check on Builder work proofs.
-- Run this in the Supabase SQL Editor before deploying the feature.
--
-- No CHECK constraint on github_check_status — validated in application code
-- instead (app/lib/github-verify.ts), per the daily_goals_proof_type_check
-- lesson from 20260715_fix_proof_type_check.sql (a DB-level enum drifts out
-- of sync with app code silently and breaks writes with no visible diff).

ALTER TABLE daily_goals
  ADD COLUMN IF NOT EXISTS github_check_status TEXT,
  ADD COLUMN IF NOT EXISTS github_checked_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS github_repo_owner   TEXT;
