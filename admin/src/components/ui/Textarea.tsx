import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-[var(--radius-app)] border bg-surface p-3 text-sm outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
        invalid && "border-destructive",
        className
      )}
      {...props}
    />
  )
);

Textarea.displayName = "Textarea";
