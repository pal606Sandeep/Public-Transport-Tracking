import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

interface CardProps {
  children: ReactNode;
  className?: string;
  /** raises the card and adds a pressable feel */
  interactive?: boolean;
  href?: string;
  onClick?: () => void;
}

export function Card({
  children,
  className,
  interactive,
  href,
  onClick,
}: CardProps) {
  const cls = cn(
    "rounded-[var(--radius-app)] border bg-card",
    interactive || href
      ? "shadow-[var(--shadow-md)] transition-[transform,box-shadow] duration-150 active:scale-[0.99] hover:shadow-[var(--shadow-lg)]"
      : "shadow-[var(--shadow-sm)]",
    className
  );

  if (href) {
    return (
      <Link href={href} className={cn("block", cls)}>
        {children}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn("block w-full text-left", cls)}>
        {children}
      </button>
    );
  }
  return <div className={cls}>{children}</div>;
}
