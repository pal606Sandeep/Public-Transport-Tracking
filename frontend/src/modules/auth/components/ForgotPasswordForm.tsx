"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Field, Input, Alert } from "@/components/ui";
import { forgotSchema, type ForgotValues } from "../constant/auth.validation";
import { useForgotPassword } from "../hooks/useAuth";
import { useApiFormError } from "../hooks/useApiFormError";

export function ForgotPasswordForm() {
  const forgot = useForgotPassword();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema) });
  const { formError, handle, reset } = useApiFormError(setError);

  const onSubmit = async (values: ForgotValues) => {
    reset();
    try {
      await forgot.mutateAsync(values.email);
    } catch (e) {
      handle(e);
    }
  };

  if (isSubmitSuccessful && !formError) {
    return (
      <Alert tone="success">
        If an account exists for that email, a reset link is on its way.
      </Alert>
    );
  }

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

      <Button type="submit" fullWidth size="xl" loading={isSubmitting || forgot.isPending}>
        Send reset link
      </Button>
    </form>
  );
}
