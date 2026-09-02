import type { ReactNode } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export default function DashLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </RequireAuth>
  );
}
