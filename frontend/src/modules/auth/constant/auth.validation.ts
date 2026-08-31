import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{6,20}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
});

const phoneField = z
  .string()
  .trim()
  .regex(/^[0-9+\-\s]{6,20}$/, "Enter a valid phone number");

export const otpRequestSchema = z.object({ phone: phoneField });

export const otpVerifySchema = z.object({
  phone: phoneField,
  otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

/** Single schema for the two-step form; `otp` is checked explicitly per step. */
export const otpFormSchema = z.object({
  phone: phoneField,
  otp: z.string().optional(),
});

export const OTP_CODE_RE = /^\d{6}$/;

export const forgotSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
});

export const resetSchema = z
  .object({
    token: z.string().min(1),
    newPassword: z.string().min(6, "At least 6 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type OtpFormValues = z.infer<typeof otpFormSchema>;
export type ForgotValues = z.infer<typeof forgotSchema>;
export type ResetValues = z.infer<typeof resetSchema>;
