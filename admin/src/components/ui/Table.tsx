import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="w-full overflow-x-auto rounded-[var(--radius-app)] border bg-surface">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
      {children}
    </thead>
  );
}

export function TR({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "border-b last:border-0",
        onClick && "cursor-pointer hover:bg-muted/40",
        className
      )}
    >
      {children}
    </tr>
  );
}

export function TH({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return <th className={cn("px-3 py-2.5 font-medium", className)}>{children}</th>;
}

export function TD({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return <td className={cn("px-3 py-2.5 align-middle", className)}>{children}</td>;
}
