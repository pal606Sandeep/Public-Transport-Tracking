import Link from "next/link";
import { AuthShell } from "@/modules/auth/components/AuthShell";
import { OtpForm } from "@/modules/auth/components/OtpForm";

export default function OtpPage() {
  return (
    <AuthShell
      title="Sign in with a code"
      subtitle="We'll text you a one-time code."
      footer={
        <Link href="/login" className="font-medium text-foreground">
          Use email &amp; password instead
        </Link>
      }
    >
      <OtpForm />
    </AuthShell>
  );
}
