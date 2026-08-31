import { z } from "zod";

const hhmm = z
  .string()
  .regex(/^([01]?\d|2[0-3]):[0-5]\d$/, "Must be HH:MM (24h)")
  .nullable();

export const listQuery = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    unreadOnly: z
      .enum(["true", "false"])
      .transform((v) => v === "true")
      .optional(),
  })
  .strict();

export const setReadSchema = z.object({ read: z.boolean().default(true) }).strict();

export const updatePreferencesSchema = z
  .object({
    channels: z
      .object({
        inApp: z.boolean().optional(),
        webpush: z.boolean().optional(),
        sms: z.boolean().optional(),
        email: z.boolean().optional(),
      })
      .strict()
      .optional(),
    quietHours: z.object({ start: hhmm, end: hhmm }).strict().optional(),
    digest: z.boolean().optional(),
    mutedTypes: z.array(z.string().min(1).max(60)).max(50).optional(),
  })
  .strict();

export const pushSubscriptionSchema = z
  .object({
    endpoint: z.string().url().max(2000),
    keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }).strict(),
    userAgent: z.string().max(300).optional(),
  })
  .strict();

export const removePushSchema = z.object({ endpoint: z.string().url().max(2000) }).strict();

export const templateSchema = z
  .object({
    key: z.string().min(1).max(80).regex(/^[A-Za-z0-9_.:-]+$/, "Invalid template key"),
    description: z.string().max(300).nullable().optional(),
    titleTemplate: z.string().min(1).max(300),
    bodyTemplate: z.string().min(1).max(2000),
    variables: z.array(z.string().min(1).max(60)).max(50).optional(),
    enabled: z.boolean().optional(),
  })
  .strict();

export const renderPreviewSchema = z
  .object({
    key: z.string().min(1).max(80),
    vars: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();
