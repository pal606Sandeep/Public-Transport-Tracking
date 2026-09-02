import type { ReactNode } from "react";
import Link from "next/link";

export function PageHeader({
  title,
  description,
  backHref,
  action,
}: {
  title: string;
  description?: string;
  backHref?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        {backHref && (
          <Link
            href={backHref}
            className="mb-1 inline-block text-xs text-muted-foreground hover:text-foreground"
          >
            ← Back
          </Link>
        )}
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
