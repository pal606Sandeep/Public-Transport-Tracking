import type { ReactNode } from "react";
import { RequireArea } from "@/components/RequireArea";

export default function OperationsLayout({ children }: { children: ReactNode }) {
  return (
    <RequireArea area="operations">
      <main id="main-content" className="flex min-h-dvh flex-col">
        {children}
      </main>
    </RequireArea>
  );
}
