"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  back = false,
  action,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  action?: ReactNode;
}) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-card/95 px-4 py-3 backdrop-blur">
      {back && (
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="-ml-1 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action}
    </header>
  );
}
