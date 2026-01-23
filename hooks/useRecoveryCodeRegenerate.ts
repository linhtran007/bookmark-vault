"use client";

import { useCallback } from 'react';
import { useVaultStore } from '@/stores/vault-store';
import {
  unwrapVaultKeyFromEnvelope,
  generateRecoveryCodes,
  hashRecoveryCode,
  wrapVaultKeyWithRecoveryCode,
} from '@/lib/crypto';
import type { VaultKeyEnvelope, RecoveryCodeWrapper } from '@/lib/types';

export function useRecoveryCodeRegenerate() {
  const { vaultEnvelope, updateEnvelope } = useVaultStore();

  const regenerateRecoveryCodes = useCallback(
    async (passphrase: string): Promise<string[]> => {
      if (!vaultEnvelope) {
        throw new Error('No vault envelope found');
      }

      // Verify passphrase by unwrapping vault key
      const vaultKey = await unwrapVaultKeyFromEnvelope(vaultEnvelope, passphrase);

      // Generate new recovery codes
      const newCodes = await generateRecoveryCodes(8);
      const newWrappers: RecoveryCodeWrapper[] = [];

      for (const code of newCodes) {
        const { wrappedKey: recoveryWrapped, salt: recoverySalt } = await wrapVaultKeyWithRecoveryCode(
          vaultKey,
          code
        );
        const codeHash = await hashRecoveryCode(code);

        newWrappers.push({
          id: crypto.getRandomValues(new Uint8Array(16)).toString(),
          wrappedKey: recoveryWrapped,
          salt: recoverySalt,
          codeHash,
          usedAt: null,
        });
      }

      // Update envelope with new recovery wrappers
      const updatedEnvelope: VaultKeyEnvelope = {
        ...vaultEnvelope,
        recoveryWrappers: newWrappers,
      };

      // Save to server
      const response = await fetch('/api/vault/envelope', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedEnvelope),
      });

      if (!response.ok) {
        throw new Error('Failed to update recovery codes on server');
      }

      // Update local vault store
      updateEnvelope(updatedEnvelope);

      return newCodes;
    },
    [vaultEnvelope, updateEnvelope]
  );

  return { regenerateRecoveryCodes };
}
