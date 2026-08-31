import Link from "next/link";
import { AuthShell } from "@/modules/auth/components/AuthShell";
import { RegisterForm } from "@/modules/auth/components/RegisterForm";

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create account"
      subtitle="Track your bus in real time."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
