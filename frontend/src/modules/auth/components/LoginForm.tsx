"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Field, Input, Alert } from "@/components/ui";
import { loginSchema, type LoginValues } from "../constant/auth.validation";
import { useLogin } from "../hooks/useAuth";
import { useApiFormError } from "../hooks/useApiFormError";
import { homePathForRole } from "@/lib/auth/redirect";

export function LoginForm() {
  const router = useRouter();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  const { formError, handle, reset } = useApiFormError(setError);

  const onSubmit = async (values: LoginValues) => {
    reset();
    try {
      const user = await login.mutateAsync(values);
      router.replace(homePathForRole(user.role));
    } catch (e) {
      handle(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      {formError && <Alert tone="error">{formError}</Alert>}

      <Field label="Email" error={errors.email?.message} required>
        {(p) => (
          <Input
            {...p}
            {...register("email")}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
          />
        )}
      </Field>

      <Field label="Password" error={errors.password?.message} required>
        {(p) => (
          <Input
            {...p}
            {...register("password")}
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
          />
        )}
      </Field>

      <div className="flex justify-end">
        <Link
          href="/forgot"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Forgot password?
        </Link>
      </div>

      <Button type="submit" fullWidth size="xl" loading={isSubmitting || login.isPending}>
        Sign in
      </Button>
    </form>
  );
}
