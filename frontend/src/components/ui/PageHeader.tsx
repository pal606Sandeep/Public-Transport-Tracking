"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  back = false,
  action,
  large = false,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  action?: ReactNode;
  /** oversized greeting-style heading (home screens) */
  large?: boolean;
}) {
  const router = useRouter();
  return (
    <header
      className="sticky top-0 z-20 flex items-center gap-2.5 border-b border-border/70 bg-background/80 px-4 py-3 backdrop-blur-xl"
      style={{ paddingTop: "calc(0.75rem + var(--safe-t))" }}
    >
      {back && (
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="-ml-1.5 grid h-9 w-9 place-items-center rounded-full text-foreground transition-colors hover:bg-muted active:scale-90"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1
          className={
            large
              ? "truncate text-[22px] font-bold"
              : "truncate text-[17px] font-semibold"
          }
        >
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-[13px] text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </header>
  );
}
