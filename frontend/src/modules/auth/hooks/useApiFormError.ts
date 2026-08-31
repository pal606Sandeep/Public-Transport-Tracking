"use client";

import { useState, useCallback } from "react";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError, errorMessage } from "@/lib/error/apiError";

/**
 * Bridges an ApiError into react-hook-form:
 *  - `{ details: { field: [msg] } }` -> setError(field, ...)
 *  - anything else -> a form-level message string
 */
export function useApiFormError<T extends FieldValues>(
  setError: UseFormSetError<T>
) {
  const [formError, setFormError] = useState<string | null>(null);

  const handle = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError) {
        const fieldErrors = err.fieldErrors();
        const entries = Object.entries(fieldErrors);
        if (entries.length > 0) {
          for (const [field, messages] of entries) {
            setError(field as Path<T>, {
              type: "server",
              message: messages[0],
            });
          }
          setFormError(null);
          return;
        }
        setFormError(err.message);
        return;
      }
      setFormError(errorMessage(err));
    },
    [setError]
  );

  const reset = useCallback(() => setFormError(null), []);

  return { formError, handle, reset };
}
