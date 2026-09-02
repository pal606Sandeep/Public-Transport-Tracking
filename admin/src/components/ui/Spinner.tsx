import { cn } from "@/lib/cn";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className
      )}
      aria-hidden
    />
  );
}

export function FullScreenLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex h-full min-h-[60vh] w-full flex-col items-center justify-center gap-3 text-muted-foreground">
      <Spinner className="h-6 w-6" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
