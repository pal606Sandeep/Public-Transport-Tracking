"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

type Item = { href: string; label: string; icon: React.ReactNode; match: RegExp };

const icon = (d: string) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d={d}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ITEMS: Item[] = [
  {
    href: "/map",
    label: "Map",
    match: /^\/map/,
    icon: icon("M9 3L4 5v16l5-2 6 2 5-2V3l-5 2-6-2z M9 3v16 M15 5v16"),
  },
  {
    href: "/routes",
    label: "Routes",
    match: /^\/routes/,
    icon: icon("M4 7h16 M4 12h16 M4 17h16"),
  },
  {
    href: "/stops",
    label: "Stops",
    match: /^\/stops/,
    icon: icon(
      "M12 21s7-5.6 7-11a7 7 0 10-14 0c0 5.4 7 11 7 11z M12 12a2 2 0 100-4 2 2 0 000 4z"
    ),
  },
  {
    href: "/favourites",
    label: "Saved",
    match: /^\/favourites/,
    icon: icon("M12 17.3l-5.5 3 1-6.1L3 9.9l6.1-.9L12 3.5l2.9 5.5 6.1.9-4.5 4.3 1 6.1z"),
  },
  {
    href: "/profile",
    label: "Profile",
    match: /^\/profile/,
    icon: icon(
      "M12 12a4 4 0 100-8 4 4 0 000 8z M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5"
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 z-10 grid grid-cols-5 border-t bg-card/95 backdrop-blur">
      {ITEMS.map((item) => {
        const active = item.match.test(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 text-[11px]",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
