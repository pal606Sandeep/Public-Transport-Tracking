"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { sidebarSet } from "@/store/slices/ui.slice";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

const DESKTOP = "(min-width: 1024px)"; // lg

export function AppShell({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const open = useAppSelector((s) => s.ui.sidebarOpen);

  // Open on desktop, keep closed on mobile; follow viewport changes.
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP);
    const apply = () => dispatch(sidebarSet(mq.matches));
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [dispatch]);

  // On mobile, close the drawer after navigating.
  useEffect(() => {
    if (!window.matchMedia(DESKTOP).matches) dispatch(sidebarSet(false));
  }, [pathname, dispatch]);

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />

      {/* mobile drawer backdrop */}
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => dispatch(sidebarSet(false))}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
