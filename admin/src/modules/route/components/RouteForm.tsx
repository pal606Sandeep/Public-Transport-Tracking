"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Field, Input, Select, Textarea, Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import {
  routeFormSchema,
  parseGeometryText,
  geometryToText,
  type RouteFormValues,
  type RouteFormParsed,
} from "../constant/route.validation";
import type { Route, RouteInput } from "../constant/route.types";

const num = (v: number | "" | undefined): number | null =>
  v === "" || v === undefined ? null : Number(v);

export function RouteForm({
  route,
  submitting,
  error,
  onSubmit,
}: {
  route?: Route;
  submitting: boolean;
  error?: unknown;
  onSubmit: (input: RouteInput) => void;
}) {
  const [geomError, setGeomError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RouteFormValues>({
    resolver: zodResolver(routeFormSchema),
    defaultValues: route
      ? {
          routeNumber: route.routeNumber,
          name: route.name ?? "",
          direction: route.direction ?? "",
          distanceKm: route.distanceKm ?? "",
          estimatedDurationMin: route.estimatedDurationMin ?? "",
          status: route.status,
          geometryText: geometryToText(route.geometry),
        }
      : { status: "ACTIVE" },
  });

  const submit = (v: RouteFormValues) => {
    setGeomError(null);
    const parsed = v as RouteFormParsed;
    let geometry;
    try {
      geometry = parseGeometryText(parsed.geometryText);
    } catch (e) {
      setGeomError(errorMessage(e));
      return;
    }
    onSubmit({
      routeNumber: parsed.routeNumber,
      name: parsed.name?.trim() || null,
      direction: parsed.direction?.trim() || null,
      distanceKm: num(parsed.distanceKm),
      estimatedDurationMin: num(parsed.estimatedDurationMin),
      status: parsed.status,
      geometry,
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="flex max-w-xl flex-col gap-4">
      {error != null && <Alert tone="error">{errorMessage(error)}</Alert>}
      {geomError && <Alert tone="error">{geomError}</Alert>}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Route number" error={errors.routeNumber?.message} required>
          {(p) => <Input {...p} {...register("routeNumber")} />}
        </Field>
        <Field label="Direction" error={errors.direction?.message} hint="e.g. UP / DOWN">
          {(p) => <Input {...p} {...register("direction")} />}
        </Field>
      </div>

      <Field label="Name" error={errors.name?.message}>
        {(p) => <Input {...p} {...register("name")} />}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Distance (km)" error={errors.distanceKm?.message}>
          {(p) => (
            <Input {...p} type="number" step="any" {...register("distanceKm")} />
          )}
        </Field>
        <Field
          label="Est. duration (min)"
          error={errors.estimatedDurationMin?.message}
        >
          {(p) => (
            <Input
              {...p}
              type="number"
              {...register("estimatedDurationMin")}
            />
          )}
        </Field>
      </div>

      <Field label="Status" error={errors.status?.message}>
        {(p) => (
          <Select {...p} {...register("status")}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        )}
      </Field>

      <Field
        label="Geometry"
        error={errors.geometryText?.message}
        hint='One "lng,lat" per line. Leave blank for none. Min 2 points.'
      >
        {(p) => (
          <Textarea
            {...p}
            rows={6}
            className="font-mono text-xs"
            placeholder={"77.5946,12.9716\n77.6100,12.9800"}
            {...register("geometryText")}
          />
        )}
      </Field>

      <div className="pt-2">
        <Button type="submit" loading={submitting}>
          {route ? "Save changes" : "Create route"}
        </Button>
      </div>
    </form>
  );
}
