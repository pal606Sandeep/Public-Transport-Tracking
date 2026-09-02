"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useSession, useLogin } from "@/modules/auth/hooks/useAuth";
import {
  loginSchema,
  type LoginValues,
} from "@/modules/auth/constant/auth.validation";

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession();
  const loginM = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  const onSubmit = (values: LoginValues) => {
    loginM.mutate(values, {
      onSuccess: () => router.replace("/dashboard"),
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-[var(--radius-app)] border bg-surface p-6 shadow-sm">
        <div className="mb-6">
          <div className="mb-3 grid h-9 w-9 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            T
          </div>
          <h1 className="text-lg font-semibold">Transit Admin</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with your staff account.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {loginM.isError && (
            <Alert tone="error">{errorMessage(loginM.error)}</Alert>
          )}

          <Field label="Email" error={errors.email?.message} required>
            {(p) => (
              <Input
                {...p}
                type="email"
                autoComplete="email"
                {...register("email")}
              />
            )}
          </Field>

          <Field label="Password" error={errors.password?.message} required>
            {(p) => (
              <Input
                {...p}
                type="password"
                autoComplete="current-password"
                {...register("password")}
              />
            )}
          </Field>

          <Button type="submit" fullWidth loading={loginM.isPending}>
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
