import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface ListRowProps {
  href?: string;
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  /** show a chevron affordance (defaults on when href is set) */
  chevron?: boolean;
  className?: string;
}

function Chevron() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="text-muted-foreground"
    >
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ListRow({
  href,
  leading,
  title,
  subtitle,
  trailing,
  chevron,
  className,
}: ListRowProps) {
  const showChevron = chevron ?? Boolean(href);
  const inner = (
    <div
      className={cn(
        "flex items-center gap-3.5 px-4 py-3.5",
        href && "transition-colors active:bg-muted",
        className
      )}
    >
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-medium leading-tight">
          {title}
        </div>
        {subtitle && (
          <div className="mt-0.5 truncate text-[13px] text-muted-foreground">
            {subtitle}
          </div>
        )}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
      {showChevron && !trailing && <Chevron />}
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export function RouteBadge({ children }: { children: ReactNode }) {
  return (
    <span className="tnum inline-flex h-9 min-w-9 items-center justify-center rounded-[var(--radius-app-sm)] bg-accent px-2 text-[13px] font-bold text-accent-foreground">
      {children}
    </span>
  );
}
