"use client";

import { useVaultStore } from '@/stores/vault-store';
import { VaultStatusIndicator } from './VaultStatusIndicator';
import { VaultToggle } from '@/components/settings/VaultToggle';

export function VaultSettings() {
  const { vaultEnvelope } = useVaultStore();

  if (vaultEnvelope) {
    return (
      <div className="space-y-4">
        <VaultToggle />
        <div className="mt-4">
          <VaultStatusIndicator />
        </div>
      </div>
    );
  }

  return (
    <div>
      <VaultToggle />
    </div>
  );
}
