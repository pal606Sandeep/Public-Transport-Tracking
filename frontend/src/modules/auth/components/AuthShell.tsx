import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="w-full">
      <div className="mb-8 flex flex-col items-start gap-3">
        <Link
          href="/"
          className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-md)]"
          aria-label="Transit home"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M4 16V7a3 3 0 013-3h10a3 3 0 013 3v9M4 16l-.7 2.1A1 1 0 004.3 19H6M4 16h16m0 0l.7 2.1a1 1 0 01-.95 1.4H18m0 0a2 2 0 11-4 0m4 0h-4M6 19a2 2 0 104 0m-4 0h4M7 8h10"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.02em]">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-[15px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      {children}
      {footer && (
        <div className="mt-7 text-center text-[14px] text-muted-foreground">
          {footer}
        </div>
      )}
    </div>
  );
}
