"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Field, Input, Select, Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useRoutes } from "@/modules/route/hooks/useRoutes";
import {
  vehicleFormSchema,
  type VehicleFormValues,
  type VehicleFormParsed,
} from "../constant/vehicle.validation";
import {
  VEHICLE_STATUSES,
  VEHICLE_STATUS_LABEL,
  type Vehicle,
  type VehicleInput,
} from "../constant/vehicle.types";

export function VehicleForm({
  vehicle,
  submitting,
  error,
  onSubmit,
}: {
  vehicle?: Vehicle;
  submitting: boolean;
  error?: unknown;
  onSubmit: (input: VehicleInput) => void;
}) {
  const routesQ = useRoutes({ page: 1, limit: 200 });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: vehicle
      ? {
          registrationNumber: vehicle.registrationNumber,
          model: vehicle.model ?? "",
          type: vehicle.type,
          capacity: vehicle.capacity,
          fuelType: vehicle.fuelType ?? "",
          gpsDeviceId: vehicle.gpsDeviceId ?? "",
          status: vehicle.status,
          assignedRoute: vehicle.assignedRoute?._id ?? "",
          wheelchairAccessible: vehicle.wheelchairAccessible,
        }
      : { status: "ACTIVE", wheelchairAccessible: false },
  });

  const submit = (v: VehicleFormValues) => {
    const p = v as VehicleFormParsed;
    onSubmit({
      registrationNumber: p.registrationNumber,
      model: p.model?.trim() || null,
      type: p.type,
      capacity: p.capacity,
      fuelType: p.fuelType?.trim() || null,
      gpsDeviceId: p.gpsDeviceId?.trim() || null,
      status: p.status,
      assignedRoute: p.assignedRoute || null,
      wheelchairAccessible: p.wheelchairAccessible,
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="flex max-w-xl flex-col gap-4">
      {error != null && <Alert tone="error">{errorMessage(error)}</Alert>}

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Registration number"
          error={errors.registrationNumber?.message}
          required
        >
          {(p) => <Input {...p} {...register("registrationNumber")} />}
        </Field>
        <Field label="Type" error={errors.type?.message} hint="e.g. BUS, MINIBUS" required>
          {(p) => <Input {...p} {...register("type")} />}
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Model" error={errors.model?.message}>
          {(p) => <Input {...p} {...register("model")} />}
        </Field>
        <Field label="Capacity" error={errors.capacity?.message} required>
          {(p) => <Input {...p} type="number" {...register("capacity")} />}
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Fuel type" error={errors.fuelType?.message}>
          {(p) => <Input {...p} {...register("fuelType")} />}
        </Field>
        <Field label="GPS device ID" error={errors.gpsDeviceId?.message}>
          {(p) => <Input {...p} {...register("gpsDeviceId")} />}
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Status" error={errors.status?.message}>
          {(p) => (
            <Select {...p} {...register("status")}>
              {VEHICLE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {VEHICLE_STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Assigned route" error={errors.assignedRoute?.message}>
          {(p) => (
            <Select {...p} {...register("assignedRoute")}>
              <option value="">— none —</option>
              {(routesQ.data?.routes ?? []).map((r) => (
                <option key={r._id} value={r._id}>
                  {r.routeNumber}
                  {r.name ? ` — ${r.name}` : ""}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register("wheelchairAccessible")} />
        Wheelchair accessible
      </label>

      <div className="pt-2">
        <Button type="submit" loading={submitting}>
          {vehicle ? "Save changes" : "Create vehicle"}
        </Button>
      </div>
    </form>
  );
}
