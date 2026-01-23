-- Add unique constraint for UPSERT operations on plaintext records
-- This ensures that INSERT ... ON CONFLICT works correctly for vault disable migration

-- Add record_type column if it doesn't exist
ALTER TABLE records ADD COLUMN IF NOT EXISTS record_type TEXT DEFAULT 'bookmark';

-- Create unique constraint for (user_id, record_id, record_type) combination
-- This prevents duplicate plaintext records and enables atomic UPSERT
CREATE UNIQUE INDEX IF NOT EXISTS idx_records_user_record_type_unique
  ON records(user_id, record_id, record_type);
