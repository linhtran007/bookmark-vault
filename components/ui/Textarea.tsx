"use client";

import { forwardRef, useId, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
  autoResize?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({
    label,
    error,
    helperText,
    containerClassName,
    className,
    id,
    autoResize = false,
    value,
    onChange,
    ...props
  }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const helperId = helperText ? `${textareaId}-helper` : undefined;
    const errorId = error ? `${textareaId}-error` : undefined;
    const describedBy = [helperId, errorId].filter(Boolean).join(" ") || undefined;
    
    const internalRef = useRef<HTMLTextAreaElement>(null);
    
    const adjustHeight = useCallback(() => {
      const textarea = internalRef.current;
      if (textarea && autoResize) {
        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    }, [autoResize]);
    
    // Adjust height on mount and when autoResize changes
    useEffect(() => {
      adjustHeight();
    }, [adjustHeight]);
    
    // Adjust height when value changes (e.g., AI-generated content)
    const valueLength = typeof value === "string" ? value.length : 0;
    useEffect(() => {
      if (autoResize && internalRef.current && valueLength >= 0) {
        internalRef.current.style.height = "auto";
        internalRef.current.style.height = `${internalRef.current.scrollHeight}px`;
      }
    }, [autoResize, valueLength]);
    
    const handleRef = (element: HTMLTextAreaElement | null) => {
      (internalRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = element;
      if (typeof ref === "function") {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
      // Adjust height on mount
      if (element && autoResize) {
        element.style.height = "auto";
        element.style.height = `${element.scrollHeight}px`;
      }
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e);
      adjustHeight();
    };

    return (
      <div className={cn("space-y-1", containerClassName)}>
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={handleRef}
          value={value}
          onChange={handleChange}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed",
            error ? "border-red-500 focus-visible:ring-red-500" : "",
            autoResize && "resize-none overflow-hidden",
            className
          )}
          {...props}
        />
        {helperText && !error && (
          <p id={helperId} className="text-xs text-slate-500 dark:text-slate-400">
            {helperText}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export default Textarea;
