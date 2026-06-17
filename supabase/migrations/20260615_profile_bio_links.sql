-- Migration: Add bio + external links to darkroom_ids (public profile polish)
-- Run this in the Supabase SQL Editor before deploying the profile changes.

ALTER TABLE darkroom_ids
  ADD COLUMN IF NOT EXISTS bio         TEXT,
  ADD COLUMN IF NOT EXISTS link_x      TEXT,
  ADD COLUMN IF NOT EXISTS link_github TEXT,
  ADD COLUMN IF NOT EXISTS link_site   TEXT;
