"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { clearAllVaultData } from "@/lib/auth-cleanup";
import { useUiStore } from "@/stores/useUiStore";
import { useResetBookmarksStateSafe } from "@/hooks/useBookmarks";

export function AuthHeader() {
  const { isSignedIn, isLoaded, signOut } = useAuth();
  const resetBookmarks = useResetBookmarksStateSafe();
  const resetUiState = useUiStore((state) => state.resetAllState);

  if (!isLoaded) {
    return <div className="w-24 h-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />;
  }

  const handleSignOut = async () => {
    // 1. Clear all vault data from storage synchronously
    clearAllVaultData();

    // 2. Reset React state (triggers immediate re-render to empty UI)
    // This will work if BookmarksProvider is in the DOM tree
    resetBookmarks?.();
    resetUiState();

    // 3. Give React time to re-render before redirect
    await new Promise(resolve => setTimeout(resolve, 100));

    // 4. Then sign out and redirect
    await signOut({ redirectUrl: '/' });
  };

  if (isSignedIn) {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={handleSignOut}
          className="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/sign-in"
      className="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
    >
      Sign In
    </Link>
  );
}
