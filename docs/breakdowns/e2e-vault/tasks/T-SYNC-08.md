# T-SYNC-08: Implement Encrypted Import/Export UI

**Epic:** Vault Sync Engine + Encrypted Backup
**Type:** Frontend
**State:** pending
**Dependencies:** T-SYNC-03, T-CRYPTO-06

---

## Action

Create user interface for encrypted backups

---

## Business Summary

Allow users to backup and restore encrypted vaults

---

## Logic

1. Modify existing import/export modal for encrypted mode
2. Add passphrase input for encrypted imports
3. Implement encrypted file download/upload
4. Show progress indicators for large files
5. Validate backup format before importing
6. Support both merge and replace modes
7. Show warnings about data overwriting

---

## Technical Logic

**Export Flow:**
1. Call `/api/vault/export`
2. Trigger file download with timestamp filename
3. Show success toast

**Import Flow:**
1. Upload file
2. Validate format (version, envelope, records)
3. Prompt for passphrase
4. Validate passphrase by decrypting envelope
5. Show preview (record count, export date)
6. Choose merge/replace mode
7. Call `/api/vault/import`
8. Show progress and success toast

---

## Implementation

```typescript
// hooks/useEncryptedImportExport.ts
"use client";

import { useState, useCallback } from 'react';
import { useVaultStore } from '@/stores/vault-store';
import * as crypto from '@/lib/crypto';

export function useEncryptedImportExport() {
  const { vaultEnvelope } = useVaultStore();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const exportVault = useCallback(async () => {
    setExporting(true);

    try {
      const response = await fetch('/api/vault/export');

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get filename from headers
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `vault-backup-${Date.now()}.json`;

      // Download file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { success: true, filename };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed',
      };
    } finally {
      setExporting(false);
    }
  }, []);

  const validateBackup = useCallback((file: File) => {
    return new Promise<{
      valid: boolean;
      data?: any;
      error?: string;
    }>((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);

          // Validate structure
          if (!data.version || !data.vaultEnvelope || !Array.isArray(data.records)) {
            resolve({
              valid: false,
              error: 'Invalid backup format',
            });
            return;
          }

          resolve({ valid: true, data });
        } catch {
          resolve({ valid: false, error: 'Failed to parse file' });
        }
      };

      reader.onerror = () => {
        resolve({ valid: false, error: 'Failed to read file' });
      };

      reader.readAsText(file);
    });
  }, []);

  const importVault = useCallback(async (
    file: File,
    passphrase: string,
    mode: 'merge' | 'replace'
  ) => {
    setImporting(true);

    try {
      // Validate file
      const validation = await validateBackup(file);
      if (!validation.valid || !validation.data) {
        throw new Error(validation.error || 'Invalid backup file');
      }

      const backup = validation.data;

      // Validate passphrase by decrypting envelope
      try {
        await crypto.unwrapVaultKeyFromEnvelope(backup.vaultEnvelope, passphrase);
      } catch {
        throw new Error('Incorrect passphrase');
      }

      // Import to server
      const response = await fetch(`/api/vault/import?mode=${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backup),
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const result = await response.json();

      return {
        success: true,
        imported: result.imported,
        updated: result.updated,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Import failed',
      };
    } finally {
      setImporting(false);
    }
  }, [validateBackup]);

  return {
    exportVault,
    importVault,
    validateBackup,
    exporting,
    importing,
  };
}
```

---

## UI Component

```typescript
// components/bookmarks/ImportExportModal.tsx (modified)
"use client";

import { useState, useCallback } from "react";
import { Modal } from "@/components/ui";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { useVaultStore } from "@/stores/vault-store";
import { useEncryptedImportExport } from "@/hooks/useEncryptedImportExport";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportExportModal({ isOpen, onClose }: Props) {
  const { vaultEnvelope } = useVaultStore();
  const { exportVault, importVault, validateBackup, exporting, importing } =
    useEncryptedImportExport();

  const [tab, setTab] = useState<'export' | 'import'>('export');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [preview, setPreview] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isEncrypted = !!vaultEnvelope;

  const handleExport = async () => {
    const result = await exportVault();

    if (result.success) {
      setSuccess('Backup exported successfully');
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 2000);
    } else {
      setError(result.error || 'Export failed');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setImportFile(file);

    // Validate and preview
    const validation = await validateBackup(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      setPreview(null);
      return;
    }

    setPreview(validation.data);
  };

  const handleImport = async () => {
    if (!importFile || !passphrase) {
      setError('Please select a file and enter passphrase');
      return;
    }

    setError(null);
    const result = await importVault(importFile, passphrase, mode);

    if (result.success) {
      setSuccess(
        `Imported ${result.imported} new bookmarks, updated ${result.updated}`
      );
      setTimeout(() => {
        setSuccess(null);
        setImportFile(null);
        setPassphrase('');
        setPreview(null);
        onClose();
      }, 3000);
    } else {
      setError(result.error || 'Import failed');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import / Export Bookmarks">
      <div className="space-y-4">
        {/* Tab Selection */}
        <div className="flex border-b">
          <button
            onClick={() => setTab('export')}
            className={`px-4 py-2 ${
              tab === 'export'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600'
            }`}
          >
            Export
          </button>
          <button
            onClick={() => setTab('import')}
            className={`px-4 py-2 ${
              tab === 'import'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600'
            }`}
          >
            Import
          </button>
        </div>

        {tab === 'export' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {isEncrypted
                ? 'Export your encrypted vault backup. This file contains all your bookmarks in encrypted format.'
                : 'Export your bookmarks as a JSON file.'}
            </p>

            {isEncrypted && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> Your backup is encrypted with your
                  passphrase. Keep it safe!
                </p>
              </div>
            )}

            <Button
              variant="primary"
              onClick={handleExport}
              disabled={exporting}
              className="w-full"
            >
              {exporting ? 'Exporting...' : 'Export Bookmarks'}
            </Button>
          </div>
        )}

        {tab === 'import' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Import bookmarks from a backup file.
            </p>

            <div>
              <label className="block text-sm font-medium mb-1">
                Select backup file
              </label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-gray-100 file:text-gray-700"
              />
            </div>

            {isEncrypted && importFile && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Backup passphrase
                </label>
                <Input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter backup passphrase"
                />
              </div>
            )}

            {preview && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm">
                  <strong>Backup contains:</strong> {preview.records.length}{' '}
                  bookmarks
                </p>
                <p className="text-sm text-gray-600">
                  Exported: {new Date(preview.exportedAt).toLocaleString()}
                </p>
              </div>
            )}

            {preview && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Import mode
                </label>
                <select
                  value={mode}
                  onChange={(e) =>
                    setMode(e.target.value as 'merge' | 'replace')
                  }
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="merge">
                    Merge - Add new, update existing
                  </option>
                  <option value="replace">
                    Replace - Delete all, import backup
                  </option>
                </select>

                {mode === 'replace' && (
                  <p className="text-xs text-red-600 mt-1">
                    Warning: This will delete all existing bookmarks!
                  </p>
                )}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
                {success}
              </div>
            )}

            <Button
              variant="primary"
              onClick={handleImport}
              disabled={!importFile || (isEncrypted && !passphrase) || importing}
              className="w-full"
            >
              {importing ? 'Importing...' : 'Import Bookmarks'}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
```

---

## Testing

**Integration Test:**
- Verify export downloads file
- Verify import validates format
- Verify passphrase check works
- Verify merge mode works
- Verify replace mode works

---

## Files

**MODIFY:**
- `components/bookmarks/ImportExportModal.tsx`
- `hooks/useEncryptedImportExport.ts` (create)

---

## Patterns

- Follow existing import/export patterns
- Show clear warnings for destructive actions
- Provide preview before import

---

## Verification Checklist

- [ ] Export downloads file
- [ ] Export has timestamp in filename
- [ ] Import validates file format
- [ ] Passphrase validation works
- [ ] Preview shows record count
- [ ] Merge mode works correctly
- [ ] Replace mode works correctly
- [ ] Warnings shown for replace
- [ ] Progress indicators work
- [ ] Success/error toasts show
- [ ] File size limits enforced

---

## Notes

- Consider adding file size limit (50MB)
- Consider adding compression for exports
- Show import progress for large files
- Consider adding incremental import
- Add file verification checksum
- Test with very large exports (10000+ records)
- Consider adding export scheduling
- Add export encryption indicator in UI
