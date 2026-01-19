"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/useUiStore";

interface BottomSheetProps {
  isOpen?: boolean; // Optional override for non-store controlled sheets
  onClose?: () => void; // Optional callback for non-store controlled sheets
  children: React.ReactNode;
  className?: string;
}

export default function BottomSheet({
  isOpen: isOpenProp,
  onClose: onCloseProp,
  children,
  className,
}: BottomSheetProps) {
  const [isMounted, setIsMounted] = useState(false);

  // Read from store for spaces sheet
  const isSpacesOpen = useUiStore((s) => s.isSpacesOpen);
  const closeSpaces = useUiStore((s) => s.closeSpaces);

  // Use props if provided, otherwise use store (for spaces sheet)
  const isOpen = isOpenProp !== undefined ? isOpenProp : isSpacesOpen;
  const onClose = onCloseProp !== undefined ? onCloseProp : closeSpaces;

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isMounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Close sheet"
            className="absolute inset-0 bg-slate-900/50"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn(
              "relative w-full max-w-xl rounded-t-2xl bg-white p-6 shadow-md dark:bg-slate-900",
              className
            )}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-zinc-300 dark:bg-slate-700" />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
