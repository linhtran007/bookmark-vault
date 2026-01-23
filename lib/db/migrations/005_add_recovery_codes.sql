-- Add recovery codes support to vaults table
ALTER TABLE vaults
ADD COLUMN IF NOT EXISTS recovery_wrappers JSONB;

-- recovery_wrappers format:
-- [
--   {
--     "id": "uuid-string",
--     "wrappedKey": "base64-encoded-wrapped-vault-key",
--     "salt": "base64-encoded-salt",
--     "codeHash": "base64-encoded-sha256-hash",
--     "usedAt": "ISO-timestamp or null"
--   },
--   ...
-- ]

-- Add comment explaining the column
COMMENT ON COLUMN vaults.recovery_wrappers IS 'JSON array of recovery code wrappers. Each wrapper can be used to unwrap the vault key as an alternative to the passphrase. One-time use recommended (marked as used with usedAt timestamp).';
