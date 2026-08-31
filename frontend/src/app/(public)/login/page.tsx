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
          <Link href="/register" className="font-medium text-foreground">
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm />

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="flex flex-col gap-2">
        <Link
          href="/otp"
          className="inline-flex h-11 items-center justify-center rounded-[var(--radius-app)] bg-muted text-sm font-medium hover:bg-border"
        >
          Sign in with a code
        </Link>
        <GuestButton />
      </div>
    </AuthShell>
  );
}
