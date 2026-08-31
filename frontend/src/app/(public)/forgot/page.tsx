import Link from "next/link";
import { AuthShell } from "@/modules/auth/components/AuthShell";
import { ForgotPasswordForm } from "@/modules/auth/components/ForgotPasswordForm";

export default function ForgotPage() {
  return (
    <AuthShell
      title="Reset password"
      subtitle="Enter your email and we'll send a reset link."
      footer={
        <Link href="/login" className="font-medium text-foreground">
          Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
