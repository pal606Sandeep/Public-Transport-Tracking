import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface ListRowProps {
  href?: string;
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}

export function ListRow({
  href,
  leading,
  title,
  subtitle,
  trailing,
  className,
}: ListRowProps) {
  const inner = (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3",
        href && "transition-colors hover:bg-muted",
        className
      )}
    >
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{title}</div>
        {subtitle && (
          <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
        )}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
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
    <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-[var(--radius-app)] bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
      {children}
    </span>
  );
}
