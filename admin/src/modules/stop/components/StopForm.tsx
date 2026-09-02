"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Field, Input, Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import {
  stopFormSchema,
  type StopFormValues,
  type StopFormParsed,
} from "../constant/stop.validation";
import type { Stop, StopInput } from "../constant/stop.types";

const splitList = (s?: string): string[] =>
  (s ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const toInput = (v: StopFormParsed): StopInput => ({
  name: v.name,
  code: v.code?.trim() || null,
  location: { type: "Point", coordinates: [v.lng, v.lat] },
  address: v.address?.trim() || null,
  shelter: v.shelter?.trim() || null,
  accessibility: v.accessibility,
  facilities: splitList(v.facilities),
  nearbyLandmarks: splitList(v.nearbyLandmarks),
  isActive: v.isActive,
});

export function StopForm({
  stop,
  submitting,
  error,
  onSubmit,
}: {
  stop?: Stop;
  submitting: boolean;
  error?: unknown;
  onSubmit: (input: StopInput) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StopFormValues>({
    resolver: zodResolver(stopFormSchema),
    defaultValues: stop
      ? {
          name: stop.name,
          code: stop.code ?? "",
          lat: stop.location?.coordinates?.[1],
          lng: stop.location?.coordinates?.[0],
          address: stop.address ?? "",
          shelter: stop.shelter ?? "",
          accessibility: stop.accessibility,
          facilities: (stop.facilities ?? []).filter(Boolean).join(", "),
          nearbyLandmarks: (stop.nearbyLandmarks ?? [])
            .filter(Boolean)
            .join(", "),
          isActive: stop.isActive,
        }
      : { accessibility: false, isActive: true },
  });

  return (
    <form
      onSubmit={handleSubmit((v) => onSubmit(toInput(v as StopFormParsed)))}
      className="flex max-w-xl flex-col gap-4"
    >
      {error != null && <Alert tone="error">{errorMessage(error)}</Alert>}

      <Field label="Name" error={errors.name?.message} required>
        {(p) => <Input {...p} {...register("name")} />}
      </Field>

      <Field label="Code" error={errors.code?.message} hint="Short stop code, optional">
        {(p) => <Input {...p} {...register("code")} />}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Latitude" error={errors.lat?.message} required>
          {(p) => (
            <Input {...p} type="number" step="any" {...register("lat")} />
          )}
        </Field>
        <Field label="Longitude" error={errors.lng?.message} required>
          {(p) => (
            <Input {...p} type="number" step="any" {...register("lng")} />
          )}
        </Field>
      </div>

      <Field label="Address" error={errors.address?.message}>
        {(p) => <Input {...p} {...register("address")} />}
      </Field>

      <Field label="Shelter" error={errors.shelter?.message} hint="e.g. covered, open">
        {(p) => <Input {...p} {...register("shelter")} />}
      </Field>

      <Field
        label="Facilities"
        error={errors.facilities?.message}
        hint="Comma-separated, e.g. seating, lighting, cctv"
      >
        {(p) => <Input {...p} {...register("facilities")} />}
      </Field>

      <Field
        label="Nearby landmarks"
        error={errors.nearbyLandmarks?.message}
        hint="Comma-separated"
      >
        {(p) => <Input {...p} {...register("nearbyLandmarks")} />}
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register("accessibility")} />
        Wheelchair accessible
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register("isActive")} />
        Active
      </label>

      <div className="pt-2">
        <Button type="submit" loading={submitting}>
          {stop ? "Save changes" : "Create stop"}
        </Button>
      </div>
    </form>
  );
}
