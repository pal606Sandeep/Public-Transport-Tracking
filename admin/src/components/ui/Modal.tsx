"use client";

import { useEffect, type ReactNode } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[var(--radius-app)] border bg-surface shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <div className="p-4 text-sm">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t px-4 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
