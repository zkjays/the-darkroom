-- Fix: daily_goals_proof_type_check was still scoped to the legacy proof_type
-- list (Project/OSS/Video/Thread/Other) and was never updated when the app
-- moved to the current types (Ship/Code/Release/Design/Client/Post/Article/
-- Publish, see app/dashboard/_work-constants.ts). Every work-proof submission
-- using a current type has been failing with a 500 ("Failed to create goal")
-- since that migration never happened. Legacy values are kept for existing
-- rows still carrying them.

ALTER TABLE daily_goals DROP CONSTRAINT IF EXISTS daily_goals_proof_type_check;

ALTER TABLE daily_goals ADD CONSTRAINT daily_goals_proof_type_check
  CHECK (proof_type IN (
    'Ship', 'Code', 'Release', 'Design', 'Client',
    'Post', 'Article', 'Publish',
    'Project', 'OSS', 'Video', 'Thread', 'Other'
  ));
