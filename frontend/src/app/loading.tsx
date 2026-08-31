export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <span
        aria-label="Loading"
        role="status"
        className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-foreground dark:border-zinc-700 dark:border-t-foreground"
      />
    </div>
  );
}
