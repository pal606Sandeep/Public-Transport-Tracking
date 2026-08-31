import type { ReactNode } from "react";
import { RequireArea } from "@/components/RequireArea";

export default function OperationsLayout({ children }: { children: ReactNode }) {
  return (
    <RequireArea area="operations">
      <div className="flex min-h-dvh flex-col">{children}</div>
    </RequireArea>
  );
}
