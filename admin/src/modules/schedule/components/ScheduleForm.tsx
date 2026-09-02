"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Field, Input, Select, Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useRoutes } from "@/modules/route/hooks/useRoutes";
import { useVehicles } from "@/modules/vehicle/hooks/useVehicles";
import {
  scheduleFormSchema,
  parseTimes,
  type ScheduleFormValues,
  type ScheduleFormParsed,
} from "../constant/schedule.validation";
import {
  FREQUENCY_TYPES,
  DAY_LABELS,
  type Schedule,
  type ScheduleInput,
} from "../constant/schedule.types";

const dateInput = (iso: string | null): string =>
  iso ? iso.slice(0, 10) : "";

export function ScheduleForm({
  schedule,
  submitting,
  error,
  onSubmit,
}: {
  schedule?: Schedule;
  submitting: boolean;
  error?: unknown;
  onSubmit: (input: ScheduleInput) => void;
}) {
  const routesQ = useRoutes({ page: 1, limit: 200 });
  const vehiclesQ = useVehicles({ page: 1, limit: 200 });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: schedule
      ? {
          name: schedule.name,
          code: schedule.code ?? "",
          route: schedule.route,
          vehicle: schedule.vehicle ?? "",
          frequencyType: schedule.frequencyType,
          daysOfWeek: schedule.daysOfWeek,
          departureTimes: schedule.departureTimes.join(", "),
          durationMin: schedule.durationMin,
          startDate: dateInput(schedule.startDate),
          endDate: dateInput(schedule.endDate),
          isActive: schedule.isActive,
        }
      : {
          frequencyType: "DAILY",
          daysOfWeek: [],
          durationMin: 60,
          isActive: true,
        },
  });

  const submit = (v: ScheduleFormValues) => {
    const p = v as ScheduleFormParsed;
    onSubmit({
      name: p.name,
      code: p.code?.trim() || null,
      route: p.route,
      vehicle: p.vehicle || null,
      frequencyType: p.frequencyType,
      daysOfWeek: p.daysOfWeek,
      departureTimes: parseTimes(p.departureTimes),
      durationMin: p.durationMin,
      startDate: p.startDate ? new Date(p.startDate).toISOString() : null,
      endDate: p.endDate ? new Date(p.endDate).toISOString() : null,
      isActive: p.isActive,
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="flex max-w-xl flex-col gap-4">
      {error != null && <Alert tone="error">{errorMessage(error)}</Alert>}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Name" error={errors.name?.message} required>
          {(p) => <Input {...p} {...register("name")} />}
        </Field>
        <Field label="Code" error={errors.code?.message}>
          {(p) => <Input {...p} {...register("code")} />}
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
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
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Frequency" error={errors.frequencyType?.message}>
          {(p) => (
            <Select {...p} {...register("frequencyType")}>
              {FREQUENCY_TYPES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Trip duration (min)" error={errors.durationMin?.message}>
          {(p) => <Input {...p} type="number" {...register("durationMin")} />}
        </Field>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">
          Days of week
        </p>
        <Controller
          control={control}
          name="daysOfWeek"
          render={({ field }) => (
            <div className="flex flex-wrap gap-1.5">
              {DAY_LABELS.map((label, day) => {
                const on = (field.value ?? []).includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() =>
                      field.onChange(
                        on
                          ? (field.value ?? []).filter((d: number) => d !== day)
                          : [...(field.value ?? []), day]
                      )
                    }
                    className={
                      "rounded-md border px-2.5 py-1 text-xs " +
                      (on
                        ? "border-primary bg-primary/10 text-primary"
                        : "text-muted-foreground")
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        />
      </div>

      <Field
        label="Departure times"
        error={errors.departureTimes?.message}
        hint="HH:MM 24h, comma-separated. e.g. 06:00, 07:30, 09:00"
        required
      >
        {(p) => <Input {...p} {...register("departureTimes")} />}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Start date" error={errors.startDate?.message}>
          {(p) => <Input {...p} type="date" {...register("startDate")} />}
        </Field>
        <Field label="End date" error={errors.endDate?.message}>
          {(p) => <Input {...p} type="date" {...register("endDate")} />}
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register("isActive")} />
        Active
      </label>

      <div className="pt-2">
        <Button type="submit" loading={submitting}>
          {schedule ? "Save changes" : "Create schedule"}
        </Button>
      </div>
    </form>
  );
}
