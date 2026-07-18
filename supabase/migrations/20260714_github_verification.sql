-- Migration: Add GitHub OAuth verification fields to darkroom_ids
-- Run this in the Supabase SQL Editor before deploying the GitHub verification feature.

ALTER TABLE darkroom_ids
  ADD COLUMN IF NOT EXISTS github_username    TEXT,
  ADD COLUMN IF NOT EXISTS github_verified    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS github_verified_at TIMESTAMPTZ;

-- Prevents two Darkroom profiles from claiming the same verified GitHub account.
CREATE UNIQUE INDEX IF NOT EXISTS darkroom_ids_github_username_verified_uidx
  ON darkroom_ids (lower(github_username))
  WHERE github_verified = true;
