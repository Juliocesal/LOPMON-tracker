-- Fix the chat_id column to allow NULL values
-- This script makes the chat_id column nullable since not all tickets originate from chats

-- Make chat_id nullable
ALTER TABLE tickets ALTER COLUMN chat_id DROP NOT NULL;

-- Verify the change
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'tickets' AND column_name = 'chat_id';

-- Optional: Update existing records with NULL chat_id to have a generated value
-- UPDATE tickets 
-- SET chat_id = 'manual_' || id::text
-- WHERE chat_id IS NULL;
