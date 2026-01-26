"use client";

/**
 * VaultInitializer
 * 
 * Initializes the vault store with the current user ID.
 * - On sign-in: loads the user's vault envelope from server ONLY if syncMode='e2e'
 * - Falls back to localStorage if server fetch fails
 * - On sign-out: clears session state (but keeps envelope in localStorage)
 * - On browser close: sessionStorage clears automatically (vault locks)
 */

import { useEffect, useRef } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useVaultStore, fetchEnvelopeFromServer } from '@/stores/vault-store';
import { useSyncSettingsStore } from '@/stores/sync-settings-store';
import { clearAllVaultData } from '@/lib/auth-cleanup';
import { useUiStore } from '@/stores/useUiStore';

export function VaultInitializer({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const initialize = useVaultStore((s) => s.initialize);
  const clearSession = useVaultStore((s) => s.clearSession);
  const currentUserId = useVaultStore((s) => s.currentUserId);
  const { syncMode } = useSyncSettingsStore();
  const resetUiState = useUiStore((state) => state.resetAllState);

  // Track previous sign-in state to detect sign-out
  const wasSignedIn = useRef<boolean | null>(null);

  const fetchAttempted = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    const userId = isSignedIn && user ? user.id : null;

    // Detect sign-out: was signed in, now not signed in
    if (wasSignedIn.current === true && !isSignedIn) {
      // 1. Clear all vault data from storage
      clearAllVaultData();
      // 2. Clear session state in store
      clearSession();
      // 3. Reset UI state (the BookmarksProvider reset will happen in AuthHeader/DisableVaultDialog)
      resetUiState();
      fetchAttempted.current = null;
    } 
    // Initialize with current user (or null if not signed in)
    else if (userId !== currentUserId) {
      // First, do synchronous initialization (loads from localStorage)
      initialize(userId);
      
      // Then, if signed in AND syncMode is 'e2e', fetch envelope from server (async)
      // This avoids unnecessary /api/vault calls when user is in plaintext mode
      if (userId && syncMode === 'e2e' && fetchAttempted.current !== userId) {
        fetchAttempted.current = userId;
        fetchEnvelopeFromServer(userId)
          .catch((error) => {
            console.error('[VaultInitializer] Failed to fetch envelope from server:', error);
          })
          .finally(() => {
            fetchAttempted.current = userId;
          });
      }
    }

    // Update ref for next render
    wasSignedIn.current = isSignedIn;
  }, [isLoaded, isSignedIn, user, initialize, clearSession, currentUserId, syncMode, resetUiState]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    if (syncMode !== 'e2e') return;
    if (fetchAttempted.current === user.id) return;

    fetchAttempted.current = user.id;
    fetchEnvelopeFromServer(user.id)
      .catch((error) => {
        console.error('[VaultInitializer] Failed to fetch envelope from server:', error);
      })
      .finally(() => {
        fetchAttempted.current = user.id;
      });
  }, [isLoaded, isSignedIn, user, syncMode]);

  // Don't block rendering while fetching - the UI will update when envelope arrives
  return <>{children}</>;
}
