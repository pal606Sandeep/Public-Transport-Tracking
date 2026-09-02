"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/tickets", label: "Tickets" },
  { href: "/passes", label: "Passes" },
  { href: "/payments", label: "Payments" },
];

export function TicketTabs() {
  const pathname = usePathname();
  return (
    <div className="p-4 pb-2">
      <div className="flex gap-1 rounded-full bg-muted p-1">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={
                "flex-1 rounded-full py-2 text-center text-[13px] font-semibold transition-colors " +
                (active
                  ? "bg-card text-foreground shadow-[var(--shadow-sm)]"
                  : "text-muted-foreground")
              }
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
