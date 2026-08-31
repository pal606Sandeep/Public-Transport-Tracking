import { cn } from "@/lib/cn";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-current border-t-transparent",
        "h-4 w-4",
        className
      )}
    />
  );
}

export function FullScreenLoader() {
  return (
    <div className="flex min-h-dvh flex-1 items-center justify-center text-muted-foreground">
      <Spinner className="h-6 w-6" />
    </div>
  );
}
