"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Field, Select, Input, Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useRoutes } from "@/modules/route/hooks/useRoutes";
import { useSchedules } from "@/modules/schedule/hooks/useSchedules";
import { useVehicles } from "@/modules/vehicle/hooks/useVehicles";
import { useDrivers } from "@/modules/driver/hooks/useDrivers";
import { useConductors } from "@/modules/conductor/hooks/useConductors";
import type { CreateTripInput } from "../constant/trip.types";

const schema = z.object({
  route: z.string().min(1, "Route is required"),
  schedule: z.string().optional(),
  vehicle: z.string().optional(),
  driver: z.string().optional(),
  conductor: z.string().optional(),
  scheduledStartAt: z.string().optional(),
  scheduledEndAt: z.string().optional(),
});
type Values = z.infer<typeof schema>;

const iso = (v?: string): string | null => (v ? new Date(v).toISOString() : null);

export function TripCreateForm({
  submitting,
  error,
  onSubmit,
}: {
  submitting: boolean;
  error?: unknown;
  onSubmit: (input: CreateTripInput) => void;
}) {
  const routesQ = useRoutes({ page: 1, limit: 200 });
  const schedulesQ = useSchedules({ page: 1, limit: 200 });
  const vehiclesQ = useVehicles({ page: 1, limit: 200 });
  const driversQ = useDrivers({ page: 1, limit: 200 });
  const conductorsQ = useConductors({ page: 1, limit: 200 });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const submit = (v: Values) =>
    onSubmit({
      route: v.route,
      schedule: v.schedule || null,
      vehicle: v.vehicle || null,
      driver: v.driver || null,
      conductor: v.conductor || null,
      scheduledStartAt: iso(v.scheduledStartAt),
      scheduledEndAt: iso(v.scheduledEndAt),
    });

  return (
    <form onSubmit={handleSubmit(submit)} className="flex max-w-xl flex-col gap-4">
      {error != null && <Alert tone="error">{errorMessage(error)}</Alert>}

      <Field label="Route" error={errors.route?.message} required>
        {(p) => (
          <Select {...p} {...register("route")}>
            <option value="">Select route…</option>
            {(routesQ.data?.routes ?? []).map((r) => (
              <option key={r._id} value={r._id}>
                {r.routeNumber}
                {r.name ? ` — ${r.name}` : ""}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field label="Schedule" error={errors.schedule?.message}>
        {(p) => (
          <Select {...p} {...register("schedule")}>
            <option value="">— none (ad-hoc) —</option>
            {(schedulesQ.data?.schedules ?? []).map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Vehicle" error={errors.vehicle?.message}>
          {(p) => (
            <Select {...p} {...register("vehicle")}>
              <option value="">— unassigned —</option>
              {(vehiclesQ.data?.vehicles ?? []).map((v) => (
                <option key={v._id} value={v._id}>
                  {v.registrationNumber}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Driver" error={errors.driver?.message}>
          {(p) => (
            <Select {...p} {...register("driver")}>
              <option value="">— unassigned —</option>
              {(driversQ.data?.drivers ?? []).map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <Field label="Conductor" error={errors.conductor?.message}>
        {(p) => (
          <Select {...p} {...register("conductor")}>
            <option value="">— unassigned —</option>
            {(conductorsQ.data?.conductors ?? []).map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Scheduled start" error={errors.scheduledStartAt?.message}>
          {(p) => (
            <Input
              {...p}
              type="datetime-local"
              {...register("scheduledStartAt")}
            />
          )}
        </Field>
        <Field label="Scheduled end" error={errors.scheduledEndAt?.message}>
          {(p) => (
            <Input
              {...p}
              type="datetime-local"
              {...register("scheduledEndAt")}
            />
          )}
        </Field>
      </div>

      <div className="pt-2">
        <Button type="submit" loading={submitting}>
          Create trip
        </Button>
      </div>
    </form>
  );
}
