import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "error" | "info" | "success" | "warning";

const tones: Record<Tone, string> = {
  error: "border-destructive/30 bg-destructive/[0.08] text-destructive",
  info: "border-border bg-muted text-foreground",
  success:
    "border-[var(--success)]/30 bg-[var(--success)]/[0.08] text-[var(--success)]",
  warning:
    "border-[var(--warning)]/30 bg-[var(--warning)]/[0.10] text-[color:var(--warning)]",
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
        "rounded-[var(--radius-app)] border px-3.5 py-2.5 text-[13.5px] leading-relaxed",
        tones[tone],
        className
      )}
    >
      {children}
    </div>
  );
}
