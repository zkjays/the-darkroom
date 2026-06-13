-- Migration: Create agent_feedback table for ChatWidget
-- Run this in the Supabase SQL Editor before deploying the chat widget

CREATE TABLE IF NOT EXISTS agent_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  handle TEXT,
  session_id TEXT NOT NULL,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  command TEXT,
  feedback_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE agent_feedback ENABLE ROW LEVEL SECURITY;

-- Service key only — no public reads or writes
CREATE POLICY "service_only" ON agent_feedback USING (false);
