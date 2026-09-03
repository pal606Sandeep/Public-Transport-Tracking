import type { ReactNode } from "react";
import { RequireArea } from "@/components/RequireArea";
import { BottomNav } from "@/components/layout/BottomNav";

export default function PassengerLayout({ children }: { children: ReactNode }) {
  return (
    <RequireArea area="passenger">
      <div className="mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden">
        <main
          id="main-content"
          className="relative flex min-h-0 flex-1 flex-col overflow-y-auto"
        >
          {children}
        </main>
        <BottomNav />
      </div>
    </RequireArea>
  );
}
