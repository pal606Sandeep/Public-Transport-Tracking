import Link from "next/link";
import { AuthShell } from "@/modules/auth/components/AuthShell";
import { LoginForm } from "@/modules/auth/components/LoginForm";
import { GuestButton } from "@/modules/auth/components/GuestButton";

export default function LoginPage() {
  return (
    <AuthShell
      title="Sign in"
      subtitle="Welcome back."
      footer={
        <>
          New here?{" "}
          <Link href="/register" className="font-semibold text-foreground">
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm />

      <div className="my-6 flex items-center gap-3 text-[12px] font-medium text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        OR
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="flex flex-col gap-2.5">
        <Link
          href="/otp"
          className="inline-flex h-14 items-center justify-center rounded-[var(--radius-app)] border border-border bg-card text-[15px] font-semibold transition-colors hover:bg-muted active:scale-[0.98]"
        >
          Sign in with a code
        </Link>
        <GuestButton />
      </div>
    </AuthShell>
  );
}
