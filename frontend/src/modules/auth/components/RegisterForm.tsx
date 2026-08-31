"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Field, Input, Alert } from "@/components/ui";
import {
  registerSchema,
  type RegisterValues,
} from "../constant/auth.validation";
import { useRegister, useLogin } from "../hooks/useAuth";
import { useApiFormError } from "../hooks/useApiFormError";
import { homePathForRole } from "@/lib/auth/redirect";

export function RegisterForm() {
  const router = useRouter();
  const registerMut = useRegister();
  const login = useLogin();
  const [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });
  const { formError, handle, reset } = useApiFormError(setError);

  const onSubmit = async (values: RegisterValues) => {
    reset();
    setBusy(true);
    try {
      await registerMut.mutateAsync({
        name: values.name,
        email: values.email,
        password: values.password,
        phone: values.phone || undefined,
      });
      // Backend register does not return a token — sign in with the same creds.
      const user = await login.mutateAsync({
        email: values.email,
        password: values.password,
      });
      router.replace(homePathForRole(user.role));
    } catch (e) {
      handle(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      {formError && <Alert tone="error">{formError}</Alert>}

      <Field label="Full name" error={errors.name?.message} required>
        {(p) => (
          <Input {...p} {...register("name")} autoComplete="name" placeholder="Asha Rao" />
        )}
      </Field>

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

      <Field label="Phone" error={errors.phone?.message} hint="Optional">
        {(p) => (
          <Input
            {...p}
            {...register("phone")}
            type="tel"
            autoComplete="tel"
            placeholder="+91 98765 43210"
          />
        )}
      </Field>

      <Field
        label="Password"
        error={errors.password?.message}
        hint="At least 6 characters"
        required
      >
        {(p) => (
          <Input
            {...p}
            {...register("password")}
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
          />
        )}
      </Field>

      <Button type="submit" fullWidth loading={busy}>
        Create account
      </Button>
    </form>
  );
}
