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
 *
 *   <Field label="Email" error={errors.email?.message}>
 *     {(p) => <Input type="email" {...p} {...register("email")} />}
 *   </Field>
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
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      {children({ id, invalid: Boolean(error) })}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
