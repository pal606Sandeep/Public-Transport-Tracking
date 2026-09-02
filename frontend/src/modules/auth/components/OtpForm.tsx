"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Field, Input, Alert } from "@/components/ui";
import {
  otpFormSchema,
  OTP_CODE_RE,
  type OtpFormValues,
} from "../constant/auth.validation";
import { useRequestOtp, useVerifyOtp } from "../hooks/useAuth";
import { useApiFormError } from "../hooks/useApiFormError";
import { homePathForRole } from "@/lib/auth/redirect";

type Step = "phone" | "code";

export function OtpForm() {
  const router = useRouter();
  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();
  const [step, setStep] = useState<Step>("phone");

  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<OtpFormValues>({ resolver: zodResolver(otpFormSchema) });
  const { formError, handle, reset } = useApiFormError(setError);

  const onSubmit = async (values: OtpFormValues) => {
    reset();
    try {
      if (step === "phone") {
        await requestOtp.mutateAsync(values.phone);
        setStep("code");
        return;
      }
      if (!OTP_CODE_RE.test(values.otp ?? "")) {
        setError("otp", { type: "manual", message: "Enter the 6-digit code" });
        return;
      }
      const user = await verifyOtp.mutateAsync({
        phone: values.phone,
        otp: values.otp as string,
      });
      router.replace(homePathForRole(user.role));
    } catch (e) {
      handle(e);
    }
  };

  const resend = async () => {
    reset();
    try {
      await requestOtp.mutateAsync(getValues("phone"));
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

      <Field label="Phone number" error={errors.phone?.message} required>
        {(p) => (
          <Input
            {...p}
            {...register("phone")}
            type="tel"
            autoComplete="tel"
            placeholder="+91 98765 43210"
            readOnly={step === "code"}
          />
        )}
      </Field>

      {step === "code" && (
        <Field
          label="Verification code"
          error={errors.otp?.message}
          hint="6-digit code sent to your phone"
          required
        >
          {(p) => (
            <Input
              {...p}
              {...register("otp")}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
            />
          )}
        </Field>
      )}

      <Button type="submit" fullWidth size="xl" loading={isSubmitting || requestOtp.isPending || verifyOtp.isPending}
      >
        {step === "phone" ? "Send code" : "Verify & sign in"}
      </Button>

      {step === "code" && (
        <button
          type="button"
          onClick={resend}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Resend code
        </button>
      )}
    </form>
  );
}
