import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-[var(--success)]/12 text-[var(--success)]",
  warning: "bg-[var(--warning)]/12 text-[var(--warning)]",
  danger: "bg-destructive/12 text-destructive",
  info: "bg-primary/12 text-primary",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
