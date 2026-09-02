"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Field, Input, Select, Textarea, Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useRoutes } from "@/modules/route/hooks/useRoutes";
import { useVehicles } from "@/modules/vehicle/hooks/useVehicles";
import { useDrivers } from "@/modules/driver/hooks/useDrivers";
import {
  INCIDENT_TYPES,
  INCIDENT_SEVERITIES,
  type CreateIncidentInput,
} from "../constant/incident.types";

const schema = z.object({
  type: z.enum(INCIDENT_TYPES),
  title: z.string().min(1, "Title is required").max(160),
  description: z.string().max(2000).optional(),
  severity: z.enum(INCIDENT_SEVERITIES).default("MEDIUM"),
  vehicleId: z.string().optional(),
  routeId: z.string().optional(),
  driverId: z.string().optional(),
});
type Values = z.input<typeof schema>;
type Parsed = z.output<typeof schema>;

export function IncidentForm({
  submitting,
  error,
  onSubmit,
}: {
  submitting: boolean;
  error?: unknown;
  onSubmit: (input: CreateIncidentInput) => void;
}) {
  const routesQ = useRoutes({ page: 1, limit: 200 });
  const vehiclesQ = useVehicles({ page: 1, limit: 200 });
  const driversQ = useDrivers({ page: 1, limit: 200 });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { severity: "MEDIUM", type: "other" },
  });

  const submit = (raw: Values) => {
    const v = raw as Parsed;
    onSubmit({
      type: v.type,
      title: v.title,
      description: v.description?.trim() || null,
      severity: v.severity,
      vehicleId: v.vehicleId || null,
      routeId: v.routeId || null,
      driverId: v.driverId || null,
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="flex max-w-xl flex-col gap-4">
      {error != null && <Alert tone="error">{errorMessage(error)}</Alert>}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Type" error={errors.type?.message} required>
          {(p) => (
            <Select {...p} {...register("type")}>
              {INCIDENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Severity" error={errors.severity?.message}>
          {(p) => (
            <Select {...p} {...register("severity")}>
              {INCIDENT_SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <Field label="Title" error={errors.title?.message} required>
        {(p) => <Input {...p} {...register("title")} />}
      </Field>

      <Field label="Description" error={errors.description?.message}>
        {(p) => <Textarea {...p} rows={4} {...register("description")} />}
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Vehicle" error={errors.vehicleId?.message}>
          {(p) => (
            <Select {...p} {...register("vehicleId")}>
              <option value="">—</option>
              {(vehiclesQ.data?.vehicles ?? []).map((v) => (
                <option key={v._id} value={v._id}>
                  {v.registrationNumber}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Route" error={errors.routeId?.message}>
          {(p) => (
            <Select {...p} {...register("routeId")}>
              <option value="">—</option>
              {(routesQ.data?.routes ?? []).map((r) => (
                <option key={r._id} value={r._id}>
                  {r.routeNumber}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Driver" error={errors.driverId?.message}>
          {(p) => (
            <Select {...p} {...register("driverId")}>
              <option value="">—</option>
              {(driversQ.data?.drivers ?? []).map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <div className="pt-2">
        <Button type="submit" loading={submitting}>
          Create incident
        </Button>
      </div>
    </form>
  );
}
