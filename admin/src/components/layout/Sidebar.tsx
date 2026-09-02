"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useAppSelector } from "@/store/hooks";
import { NAV } from "./nav";

export function Sidebar() {
  const pathname = usePathname();
  const open = useAppSelector((s) => s.ui.sidebarOpen);

  return (
    <aside
      className={cn(
        "shrink-0 overflow-y-auto border-r bg-surface transition-all",
        open ? "w-60" : "w-0 -translate-x-full md:w-0"
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
          T
        </span>
        <span className="text-sm font-semibold">Transit Admin</span>
      </div>

      <nav className="px-2 py-3">
        {NAV.map((section) => (
          <div key={section.title} className="mb-4">
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </p>
            {section.items.map((item) => {
              const active =
                pathname === item.href ||
                pathname.startsWith(item.href + "/");
              if (!item.ready) {
                return (
                  <span
                    key={item.href}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-muted-foreground/60"
                  >
                    {item.label}
                    <span className="text-[9px] uppercase">soon</span>
                  </span>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "block rounded-md px-2 py-1.5 text-sm",
                    active
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
