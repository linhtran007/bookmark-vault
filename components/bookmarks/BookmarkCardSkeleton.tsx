import Card from "@/components/ui/Card";

export default function BookmarkCardSkeleton() {
  return (
    <Card className="space-y-3 animate-pulse">
      {/* Header row */}
      <div className="flex items-center gap-3">
        {/* Checkbox placeholder */}
        <div className="h-4 w-4 rounded bg-zinc-200 dark:bg-slate-700 flex-shrink-0" />

        {/* Title with dot */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="h-2.5 w-2.5 rounded-full bg-zinc-200 dark:bg-slate-700 flex-shrink-0" />
          <div className="h-5 w-3/4 rounded bg-zinc-200 dark:bg-slate-700" />
        </div>

        {/* Menu button placeholder */}
        <div className="h-8 w-8 rounded-lg bg-zinc-200 dark:bg-slate-700 flex-shrink-0" />
      </div>

      {/* URL */}
      <div className="h-4 w-1/2 rounded bg-zinc-200 dark:bg-slate-700" />

      {/* Description */}
      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-zinc-200 dark:bg-slate-700" />
        <div className="h-4 w-2/3 rounded bg-zinc-200 dark:bg-slate-700" />
      </div>

      {/* Tags */}
      <div className="flex gap-2">
        <div className="h-6 w-16 rounded-full bg-zinc-200 dark:bg-slate-700" />
        <div className="h-6 w-20 rounded-full bg-zinc-200 dark:bg-slate-700" />
        <div className="h-6 w-14 rounded-full bg-zinc-200 dark:bg-slate-700" />
      </div>
    </Card>
  );
}

export function BookmarkListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <BookmarkCardSkeleton key={i} />
      ))}
    </div>
  );
}
