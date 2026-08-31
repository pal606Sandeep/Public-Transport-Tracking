import { z } from "zod";
import { ALL_ROLES } from "../../constants/roles.js";

export const createUserSchema = z
  .object({
    name: z.string().min(1).max(120),
    email: z.string().email(),
    password: z.string().min(8).max(128),
    role: z.enum(ALL_ROLES as [string, ...string[]]).default("PASSENGER"),
    phone: z.string().max(20).nullable().optional(),
    language: z.string().max(10).default("en"),
    avatarKey: z.string().max(500).nullable().optional(),
  })
  .strict();

export const updateUserSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    email: z.string().email().optional(),
    password: z.string().min(8).max(128).optional(),
    role: z.enum(ALL_ROLES as [string, ...string[]]).optional(),
    phone: z.string().max(20).nullable().optional(),
    language: z.string().max(10).optional(),
    avatarKey: z.string().max(500).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();
