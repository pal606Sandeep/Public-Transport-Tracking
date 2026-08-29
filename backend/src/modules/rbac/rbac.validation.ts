import { z } from "zod";

export const rolePermissionsSchema = z.object({
  permissions: z.array(z.string().min(1)).default([]),
});

export const createRoleSchema = z.object({
  code: z.string().min(1).max(60),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string().min(1)).optional(),
});
