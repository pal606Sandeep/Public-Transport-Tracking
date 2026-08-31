import { z } from "zod";

export const updatePreferencesSchema = z
  .object({
    language: z.string().max(10).optional(),
    theme: z.enum(["light", "dark", "system"]).optional(),
    notifications: z
      .object({
        serviceAlerts: z.boolean().optional(),
        favourites: z.boolean().optional(),
        promotions: z.boolean().optional(),
      })
      .optional(),
    seatPreference: z.string().max(60).nullable().optional(),
  })
  .strict();

export const addFavouriteSchema = z
  .object({
    type: z.enum(["route", "stop"]),
    targetId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid targetId"),
  })
  .strict();

export const createSavedLocationSchema = z
  .object({
    name: z.string().min(1).max(120),
    location: z.object({ lng: z.number(), lat: z.number() }),
    address: z.string().max(300).nullable().optional(),
    isHome: z.boolean().default(false),
    isWork: z.boolean().default(false),
  })
  .strict();

export const updateSavedLocationSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    location: z.object({ lng: z.number(), lat: z.number() }).optional(),
    address: z.string().max(300).nullable().optional(),
    isHome: z.boolean().optional(),
    isWork: z.boolean().optional(),
  })
  .strict();

export const createRecentSearchSchema = z
  .object({
    type: z.enum(["route", "stop", "place", "journey"]),
    term: z.string().max(200).nullable().optional(),
    targetId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid targetId").optional(),
    location: z.object({ lng: z.number(), lat: z.number() }).optional(),
    results: z.number().int().min(0).default(0),
  })
  .strict();

export const blockPassengerSchema = z
  .object({
    reason: z.string().max(500).optional(),
  })
  .strict();

export const addSubscriptionSchema = z
  .object({
    type: z.enum(["route", "stop"]),
    targetId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid targetId"),
  })
  .strict();
