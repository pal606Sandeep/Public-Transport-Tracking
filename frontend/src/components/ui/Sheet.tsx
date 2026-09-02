"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A bottom sheet that floats above the content (Ola / Uber style). Not a modal —
 * it doesn't trap focus or block the map behind it. Give it `className` to size.
 */
export function Sheet({
  children,
  className,
  grabber = true,
}: {
  children: ReactNode;
  className?: string;
  grabber?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-t-[var(--radius-app-lg)] border-t border-x bg-elevated",
        "shadow-[var(--shadow-xl)]",
        "pb-[max(1rem,var(--safe-b))]",
        className
      )}
    >
      {grabber && (
        <div className="flex justify-center pt-2.5">
          <span className="h-1 w-9 rounded-full bg-border" />
        </div>
      )}
      {children}
    </div>
  );
}

/** A card-shaped panel that floats over a full-bleed map (search bar, etc.). */
export function FloatingPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-app)] border bg-elevated shadow-[var(--shadow-lg)]",
        className
      )}
    >
      {children}
    </div>
  );
}
