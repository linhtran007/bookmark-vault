"use client";

import { useEffect } from "react";
import { useVaultStore } from "@/stores/vault-store";
import { loadAndDecryptAllBookmarks, saveEncryptedRecord } from "@/lib/encrypted-storage";
import type { StoredEncryptedRecord } from "@/lib/encrypted-storage";
import * as crypto from "@/lib/crypto";

export function useIncomingSync() {
  const { vaultEnvelope, isUnlocked, vaultKey } = useVaultStore();

  useEffect(() => {
    if (!isUnlocked || !vaultKey) return;

    const channel = new BroadcastChannel('vault-sync');

    const handleMessage = async (event: MessageEvent) => {
      if (event.data.type === 'RECORD_RECEIVED') {
        const { record } = event.data;

        const localRecords: StoredEncryptedRecord[] = JSON.parse(
          localStorage.getItem('bookmark-vault-encrypted') || '[]'
        );

        const existing = localRecords.find(r => r.recordId === record.recordId);

        if (!existing || existing.version < record.version) {
          // Incoming server ciphertext is base64 of [iv][ciphertext][tag].
          const combined = crypto.base64ToArray(record.ciphertext);
          const iv = combined.slice(0, 12);
          const tag = combined.slice(-16);
          const ciphertext = combined.slice(12, -16);

          if (iv.length !== 12 || tag.length !== 16 || ciphertext.length === 0) {
            console.warn('[e2e-sync] received invalid ciphertext payload', {
              recordId: record.recordId,
              recordType: record.recordType,
              length: combined.length,
            });
            return;
          }

          const encryptedRecord: StoredEncryptedRecord = {
            recordId: record.recordId,
            recordType: record.recordType || 'bookmark', // Default to bookmark for backward compatibility
            ciphertext: crypto.arrayToBase64(ciphertext),
            iv: crypto.arrayToBase64(iv),
            tag: crypto.arrayToBase64(tag),
            version: record.version,
            deleted: record.deleted,
            createdAt: record.updatedAt,
            updatedAt: record.updatedAt,
          };

          saveEncryptedRecord(encryptedRecord);

          if (typeof window !== 'undefined') {
            const bookmarks = await loadAndDecryptAllBookmarks(vaultKey);
            window.dispatchEvent(new CustomEvent('bookmarks-updated', { detail: bookmarks }));
          }
        }
      }
    };

    channel.addEventListener('message', handleMessage);

    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, [isUnlocked, vaultKey]);
}
