import { useCallback, useRef, useState } from "react";
import { CreateBookmarkSchema, type CreateBookmarkInput } from "@/lib/validation";
import { Bookmark, BookmarkColor } from "@/lib/types";
import { PERSONAL_SPACE_ID } from "@/lib/spacesStorage";
import { useBookmarks } from "@/hooks/useBookmarks";
import { toast } from "sonner";

export interface BookmarkFormState {
  title: string;
  url: string;
  description: string;
  tags: string;
  color: string;
  spaceId: string;
}

export interface BookmarkFormErrors {
  title?: string;
  url?: string;
  description?: string;
  tags?: string;
  color?: string;
  spaceId?: string;
}

type BookmarkFormMode = "create" | "edit";

const resolveDefaultSpaceId = (defaultSpaceId?: string) => {
  if (!defaultSpaceId || defaultSpaceId === "all") return PERSONAL_SPACE_ID;
  return defaultSpaceId;
};

const buildInitialState = (
  bookmark?: Bookmark | null,
  defaultSpaceId?: string
): BookmarkFormState => ({
  title: bookmark?.title ?? "",
  url: bookmark?.url ?? "",
  description: bookmark?.description ?? "",
  tags: bookmark?.tags?.join(", ") ?? "",
  color: bookmark?.color ?? "",
  spaceId: bookmark?.spaceId ?? resolveDefaultSpaceId(defaultSpaceId),
});

// Order of fields for validation focus
const fieldOrder: (keyof BookmarkFormState)[] = [
  "title",
  "url",
  "spaceId",
  "description",
  "tags",
  "color",
];

export function useBookmarkForm(options?: {
  mode?: BookmarkFormMode;
  initialBookmark?: Bookmark | null;
  defaultSpaceId?: string;
  onSuccess?: (bookmark: CreateBookmarkInput) => void;
}) {
  const { addBookmark, updateBookmark, isLoading, errorMessage, clearError } =
    useBookmarks();
  const [form, setForm] = useState<BookmarkFormState>(() =>
    buildInitialState(options?.initialBookmark, options?.defaultSpaceId)
  );
  const [errors, setErrors] = useState<BookmarkFormErrors>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const successTimeoutRef = useRef<number | null>(null);
  const fieldRefs = useRef<Partial<Record<keyof BookmarkFormState, HTMLInputElement>>>({});

  const resetForm = useCallback(
    (bookmark?: Bookmark | null) => {
      setForm(
        buildInitialState(
          bookmark ?? options?.initialBookmark,
          options?.defaultSpaceId
        )
      );
      setErrors({});
      setShowSuccess(false);
      if (errorMessage) {
        clearError();
      }
      if (successTimeoutRef.current) {
        window.clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = null;
      }
    },
    [clearError, errorMessage, options?.initialBookmark, options?.defaultSpaceId]
  );

  const clearForm = useCallback(() => {
    resetForm();
  }, [resetForm]);

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof BookmarkFormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (errorMessage) {
      clearError();
    }
    if (showSuccess) {
      setShowSuccess(false);
    }
  };

  // Register field ref for focus management
  const registerField = useCallback((fieldName: keyof BookmarkFormState, element: HTMLInputElement | null) => {
    if (element) {
      fieldRefs.current[fieldName] = element;
    }
  }, []);

  // Generate description using AI
  const generateDescription = useCallback(
    async (modificationInstructions?: string) => {
      // Validate URL first
      if (!form.url.trim()) {
        setErrors((prev) => ({ ...prev, url: "Please enter a URL first" }));
        return;
      }

      setIsGeneratingDescription(true);
      setErrors((prev) => ({ ...prev, description: undefined }));

      try {
        const response = await fetch("/api/ai/generate-description", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: form.url,
            currentDescription: form.description || undefined,
            modificationInstructions: modificationInstructions || undefined,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to generate description");
        }

        const data = await response.json();

        if (data.success && data.description) {
          setForm((prev) => ({
            ...prev,
            description: data.description,
          }));
          const message = modificationInstructions
            ? "Description updated!"
            : "Description generated!";
          toast.success(message);
        } else {
          throw new Error("Invalid response from server");
        }
      } catch (error) {
        console.error("Generate description error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to generate description";
        toast.error(errorMessage);
        setErrors((prev) => ({ ...prev, description: errorMessage }));
      } finally {
        setIsGeneratingDescription(false);
      }
    },
    [form.url, form.description]
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setShowSuccess(false);
    if (errorMessage) {
      clearError();
    }

    const tagsArray = form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

     const bookmarkData = {
        title: form.title,
        url: form.url,
        description: form.description || undefined,
        tags: tagsArray,
        color: form.color ? (form.color as BookmarkColor) : undefined,
        spaceId: form.spaceId || resolveDefaultSpaceId(options?.defaultSpaceId),
      };

    const result = CreateBookmarkSchema.safeParse(bookmarkData);

    if (!result.success) {
      const fieldErrors: BookmarkFormErrors = {};
      const firstErrorField: keyof BookmarkFormState | undefined = undefined;

      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof BookmarkFormErrors;
        fieldErrors[field] = issue.message;
      });

      setErrors(fieldErrors);

      // Focus first invalid field
      for (const field of fieldOrder) {
        if (fieldErrors[field] && fieldRefs.current[field]) {
          fieldRefs.current[field]?.focus();
          fieldRefs.current[field]?.select();
          break;
        }
      }
      return;
    }

    if (options?.mode === "edit" && options.initialBookmark) {
      const updateResult = updateBookmark({
        ...options.initialBookmark,
        ...result.data,
      });
      if (!updateResult.success) {
        return;
      }
    } else {
      const addResult = addBookmark(result.data);
      if (!addResult.success) {
        return;
      }
    }

    options?.onSuccess?.(result.data);

    resetForm();
    setShowSuccess(true);

    if (successTimeoutRef.current) {
      window.clearTimeout(successTimeoutRef.current);
    }

    successTimeoutRef.current = window.setTimeout(() => {
      setShowSuccess(false);
      successTimeoutRef.current = null;
    }, 2000);
  };

  // Check if form is currently valid (no errors, required fields filled)
  // Note: Check for truthy error values, not just keys (keys can exist with undefined values)
  const hasAnyError = Object.values(errors).some(Boolean);
  const isValid = Boolean(
    form.title.trim() &&
    form.url.trim() &&
    !hasAnyError
  );

  return {
    form,
    errors,
    isLoading,
    showSuccess,
    errorMessage,
    isValid,
    clearForm,
    resetForm,
    handleChange,
    handleSubmit,
    registerField,
    generateDescription,
    isGeneratingDescription,
  };
}
