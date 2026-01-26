import Link from "next/link";
import Card from "@/components/ui/Card";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-white to-rose-50 px-4 py-16 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      <Card className="relative w-full max-w-xl border border-amber-100/80 bg-white/95 text-center shadow-lg ring-1 ring-white/60 dark:border-slate-800 dark:bg-slate-950/90 dark:ring-slate-900">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">
            404
          </p>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
            This page went missing
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            The link you followed does not exist. Jump back home and keep your bookmarks organized.
          </p>
          <div className="flex justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
            >
              Back to home
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
