import type { ReactNode } from "react";
import { RequireArea } from "@/components/RequireArea";
import { BottomNav } from "@/components/layout/BottomNav";

export default function PassengerLayout({ children }: { children: ReactNode }) {
  return (
    <RequireArea area="passenger">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
        <div className="flex flex-1 flex-col">{children}</div>
        <BottomNav />
      </div>
    </RequireArea>
  );
}
