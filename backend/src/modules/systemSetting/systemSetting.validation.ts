import { z } from "zod";

/**
 * All system-setting values are JSON-serialisable. Validation is intentionally
 * permissive on the value shape (Mixed) — the schema enforces keys + thin
 * rules (non-empty key, ≤64 chars, no nesting of arrays/objects beyond 2
 * levels) and the audit/threshold validators live in the controller.
 */
const keySchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z][a-zA-Z0-9_.]*$/, "key must start with a letter and contain only letters, digits, '_' or '.'")
  .refine((k) => !["__proto__", "constructor", "prototype"].includes(k), "reserved key")
  .refine((k) => !/__(proto|constructor)__/i.test(k) && !/constructor\.|prototype\./i.test(k), "reserved key segment");

const valueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])),
    z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  ])
) as unknown as z.ZodType<unknown>;

export const createSystemSettingSchema = z.object({
  key: keySchema,
  value: valueSchema,
  description: z.string().max(500).optional(),
});

export const updateSystemSettingSchema = z.object({
  value: valueSchema,
  description: z.string().max(500).optional(),
});

export const bulkUpsertSystemSettingsSchema = z.object({
  settings: z
    .array(
      z.object({
        key: keySchema,
        value: valueSchema,
        description: z.string().max(500).optional(),
      })
    )
    .min(1)
    .max(200),
});

export const listSystemSettingsSchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});