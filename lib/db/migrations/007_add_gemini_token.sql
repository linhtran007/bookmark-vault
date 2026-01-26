-- Migration: Add Gemini API token column to sync_settings
-- Stores encrypted Gemini API token for AI-powered features

ALTER TABLE sync_settings
ADD COLUMN gemini_api_token TEXT;

COMMENT ON COLUMN sync_settings.gemini_api_token IS 'Encrypted Gemini API token for AI features (generate bookmark descriptions)';
