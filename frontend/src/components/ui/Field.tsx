"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: (props: { id: string; invalid: boolean }) => ReactNode;
  className?: string;
}

/**
 * Label + control + error/hint. Render-prop passes the generated id and an
 * `invalid` flag to the control.
 */
export function Field({
  label,
  error,
  hint,
  required,
  children,
  className,
}: FieldProps) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label
        htmlFor={id}
        className="text-[13px] font-semibold tracking-[-0.01em] text-foreground"
      >
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      {children({ id, invalid: Boolean(error) })}
      {error ? (
        <p className="text-[12.5px] font-medium text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-[12.5px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
