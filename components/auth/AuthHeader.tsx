"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { clearAllVaultData } from "@/lib/auth-cleanup";

export function AuthHeader() {
  const { isSignedIn, isLoaded, signOut } = useAuth();

  if (!isLoaded) {
    return <div className="w-24 h-8 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />;
  }

  const handleSignOut = async () => {
    // Clear all vault data synchronously BEFORE redirect
    clearAllVaultData();
    // Then sign out and redirect
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
