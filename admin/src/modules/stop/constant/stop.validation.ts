import { z } from "zod";

export const stopFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  code: z.string().max(40).optional(),
  lat: z.coerce
    .number({ message: "Latitude is required" })
    .min(-90, "−90 to 90")
    .max(90, "−90 to 90"),
  lng: z.coerce
    .number({ message: "Longitude is required" })
    .min(-180, "−180 to 180")
    .max(180, "−180 to 180"),
  address: z.string().max(255).optional(),
  shelter: z.string().max(60).optional(),
  accessibility: z.boolean().default(false),
  facilities: z.string().max(400).optional(), // comma-separated in the form
  nearbyLandmarks: z.string().max(600).optional(), // comma-separated
  isActive: z.boolean().default(true),
});

export type StopFormValues = z.input<typeof stopFormSchema>;
export type StopFormParsed = z.output<typeof stopFormSchema>;
