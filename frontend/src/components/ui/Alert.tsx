import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "error" | "info" | "success";

const tones: Record<Tone, string> = {
  error: "border-destructive/40 bg-destructive/10 text-destructive",
  info: "border-border bg-muted text-foreground",
  success: "border-[var(--success)]/40 bg-[var(--success)]/10 text-[var(--success)]",
};

export function Alert({
  tone = "info",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-[var(--radius-app)] border px-3 py-2 text-sm",
        tones[tone],
        className
      )}
    >
      {children}
    </div>
  );
}
