"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { sidebarSet } from "@/store/slices/ui.slice";
import { NAV } from "./nav";

export function Sidebar() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const open = useAppSelector((s) => s.ui.sidebarOpen);

  return (
    <aside
      className={cn(
        "z-50 shrink-0 overflow-y-auto border-r bg-surface transition-transform duration-200",
        // mobile: fixed off-canvas drawer
        "fixed inset-y-0 left-0 w-64",
        open ? "translate-x-0" : "-translate-x-full",
        // desktop: in-flow, width collapses instead of sliding
        "lg:static lg:translate-x-0 lg:transition-[width]",
        open ? "lg:w-60" : "lg:w-0 lg:border-r-0"
      )}
    >
      <div className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            T
          </span>
          <span className="text-sm font-semibold">Transit Admin</span>
        </div>
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => dispatch(sidebarSet(false))}
          className="-mr-1 rounded-md p-1.5 text-muted-foreground hover:bg-muted lg:hidden"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <nav className="px-2 py-3">
        {NAV.map((section) => (
          <div key={section.title} className="mb-4">
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </p>
            {section.items.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/");
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
