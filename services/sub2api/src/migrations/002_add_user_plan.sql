-- Add plan column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'free';

-- Add supabase_token column to users (backfill missing from init)
ALTER TABLE users ADD COLUMN IF NOT EXISTS supabase_token TEXT;
