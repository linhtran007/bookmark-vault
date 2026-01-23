/**
 * Vault Disable Backup Utility
 *
 * Manages backup/restore of encrypted vault data before disable operations.
 * Enables atomic two-phase commit with complete rollback capability.
 *
 * Backup is stored in localStorage and includes:
 * - All encrypted bookmarks
 * - All encrypted spaces
 * - All encrypted pinned views
 * - Vault envelope
 * - Sync mode
 * - Checksum for integrity validation
 */

import type { StoredEncryptedRecord } from '@/lib/encrypted-storage';
import type { VaultKeyEnvelope } from '@/lib/types';

const BACKUP_PREFIX = 'vault-disable-backup-';
const BACKUP_RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface BackupData {
  timestamp: number;
  encryptedBookmarks: StoredEncryptedRecord[];
  encryptedSpaces: StoredEncryptedRecord[];
  encryptedPinnedViews: StoredEncryptedRecord[];
  vaultEnvelope: VaultKeyEnvelope;
  syncMode: 'e2e';
  checksum: string;
}

/**
 * Create a backup checkpoint of all encrypted vault data
 * @param checksum SHA-256 checksum of encrypted data for integrity validation
 * @returns Backup ID for recovery if needed
 */
export function createBackupCheckpoint(
  encryptedBookmarks: StoredEncryptedRecord[],
  encryptedSpaces: StoredEncryptedRecord[],
  encryptedPinnedViews: StoredEncryptedRecord[],
  vaultEnvelope: VaultKeyEnvelope,
  checksum: string
): string {
  const timestamp = Date.now();
  const backupId = `${BACKUP_PREFIX}${timestamp}`;

  const backupData: BackupData = {
    timestamp,
    encryptedBookmarks,
    encryptedSpaces,
    encryptedPinnedViews,
    vaultEnvelope,
    syncMode: 'e2e',
    checksum,
  };

  try {
    localStorage.setItem(backupId, JSON.stringify(backupData));
    return backupId;
  } catch (error) {
    // localStorage quota exceeded or other storage error
    throw new Error(
      `Failed to create backup: ${error instanceof Error ? error.message : 'Storage error'}`
    );
  }
}

/**
 * Restore all encrypted vault data from a backup
 * @param backupId Backup ID returned from createBackupCheckpoint
 * @returns Restored backup data or null if backup not found
 */
export function restoreFromBackup(backupId: string): BackupData | null {
  try {
    const data = localStorage.getItem(backupId);
    if (!data) {
      return null;
    }
    return JSON.parse(data) as BackupData;
  } catch (error) {
    console.error(`Failed to restore backup ${backupId}:`, error);
    return null;
  }
}

/**
 * Delete a backup checkpoint after successful completion
 * @param backupId Backup ID to delete
 */
export function deleteBackup(backupId: string): void {
  try {
    localStorage.removeItem(backupId);
  } catch (error) {
    console.error(`Failed to delete backup ${backupId}:`, error);
    // Don't throw - cleanup failure shouldn't block completion
  }
}

/**
 * List all existing backups
 * @returns Array of backup IDs
 */
export function listBackups(): string[] {
  const backups: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(BACKUP_PREFIX)) {
      backups.push(key);
    }
  }
  return backups;
}

/**
 * Clean up backups older than retention period
 * @returns Number of backups deleted
 */
export function cleanupOldBackups(): number {
  const backups = listBackups();
  const now = Date.now();
  let deletedCount = 0;

  for (const backupId of backups) {
    try {
      const data = localStorage.getItem(backupId);
      if (!data) continue;

      const backup = JSON.parse(data) as BackupData;
      const age = now - backup.timestamp;

      if (age > BACKUP_RETENTION_MS) {
        localStorage.removeItem(backupId);
        deletedCount++;
      }
    } catch (error) {
      console.error(`Failed to clean backup ${backupId}:`, error);
    }
  }

  return deletedCount;
}

/**
 * Validate a backup's integrity using checksum
 * @param backup Backup data to validate
 * @param expectedChecksum Expected checksum value
 * @returns true if backup is valid
 */
export function validateBackupIntegrity(
  backup: BackupData,
  expectedChecksum: string
): boolean {
  return backup.checksum === expectedChecksum;
}

/**
 * Get size estimate of a backup in bytes
 * @param backup Backup data
 * @returns Estimated size in bytes
 */
export function estimateBackupSize(backup: BackupData): number {
  try {
    return JSON.stringify(backup).length;
  } catch {
    return 0;
  }
}
