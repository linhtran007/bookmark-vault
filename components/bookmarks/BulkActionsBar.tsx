"use client";

import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";

interface BulkActionsBarProps {
  selectedCount: number;
  visibleCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
}

/**
 * Floating bar showing when bookmarks are selected with bulk action buttons.
 * Fixed position at bottom of viewport with animation.
 */
export default function BulkActionsBar({
  selectedCount,
  visibleCount,
  onSelectAll,
  onClearSelection,
  onDeleteSelected,
}: BulkActionsBarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
      >
        <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white px-6 py-3 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {selectedCount} selected
          </span>
          <div className="h-4 w-px bg-zinc-300 dark:bg-slate-700" />
          <div className="flex items-center gap-2">
            {selectedCount < visibleCount && (
              <Button variant="ghost" onClick={onSelectAll}>
                Select all ({visibleCount})
              </Button>
            )}
            <Button variant="ghost" onClick={onClearSelection}>
              Clear selection
            </Button>
            <Button
              variant="ghost"
              onClick={onDeleteSelected}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
            >
              Delete selected
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
