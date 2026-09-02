import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-lg font-semibold">Page not found</p>
      <Link href="/dashboard" className="text-sm text-primary hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}
