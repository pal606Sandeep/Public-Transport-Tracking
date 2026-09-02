"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Field, Input, Select, Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useUsers } from "@/modules/user/hooks/useUsers";
import {
  driverFormSchema,
  type DriverFormValues,
  type DriverFormParsed,
} from "../constant/driver.validation";
import {
  DRIVER_STATUSES,
  SHIFT_TYPES,
  type Driver,
  type DriverInput,
} from "../constant/driver.types";

const dateInput = (iso: string | null | undefined): string =>
  iso ? iso.slice(0, 10) : "";

const toIso = (d?: string): string | null =>
  d ? new Date(d).toISOString() : null;

export function DriverForm({
  driver,
  submitting,
  error,
  onSubmit,
}: {
  driver?: Driver;
  submitting: boolean;
  error?: unknown;
  onSubmit: (input: DriverInput) => void;
}) {
  const usersQ = useUsers({ role: "DRIVER", limit: 200 });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DriverFormValues>({
    resolver: zodResolver(driverFormSchema),
    defaultValues: driver
      ? {
          user: driver.user,
          name: driver.name,
          phone: driver.phone ?? "",
          employeeId: driver.employeeId,
          licenseNumber: driver.licenseNumber,
          licenseType: driver.licenseType ?? "",
          licenseExpiry: dateInput(driver.licenseExpiry),
          joiningDate: dateInput(driver.joiningDate),
          status: driver.status,
          shiftType: driver.shift?.type ?? "MORNING",
          shiftStart: driver.shift?.start ?? "",
          shiftEnd: driver.shift?.end ?? "",
        }
      : { status: "ACTIVE", shiftType: "MORNING" },
  });

  const submit = (v: DriverFormValues) => {
    const p = v as DriverFormParsed;
    const base: DriverInput = {
      user: p.user,
      name: p.name,
      phone: p.phone?.trim() || null,
      employeeId: p.employeeId,
      licenseNumber: p.licenseNumber,
      licenseType: p.licenseType?.trim() || null,
      licenseExpiry: toIso(p.licenseExpiry),
      joiningDate: toIso(p.joiningDate),
      status: p.status,
      shift: {
        type: p.shiftType,
        start: p.shiftStart?.trim() || null,
        end: p.shiftEnd?.trim() || null,
      },
    };
    onSubmit(base);
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="flex max-w-xl flex-col gap-4">
      {error != null && <Alert tone="error">{errorMessage(error)}</Alert>}

      <Field
        label="Linked user account"
        error={errors.user?.message}
        hint="A registered user with the DRIVER role."
        required
      >
        {(p) => (
          <Select {...p} {...register("user")} disabled={!!driver}>
            <option value="">
              {usersQ.isLoading ? "Loading users…" : "Select a user…"}
            </option>
            {(usersQ.data?.users ?? []).map((u) => (
              <option key={u._id} value={u._id}>
                {u.name} — {u.email}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Name" error={errors.name?.message} required>
          {(p) => <Input {...p} {...register("name")} />}
        </Field>
        <Field label="Phone" error={errors.phone?.message}>
          {(p) => <Input {...p} {...register("phone")} />}
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Employee ID" error={errors.employeeId?.message} required>
          {(p) => <Input {...p} {...register("employeeId")} />}
        </Field>
        <Field label="Status" error={errors.status?.message}>
          {(p) => (
            <Select {...p} {...register("status")}>
              {DRIVER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="License number"
          error={errors.licenseNumber?.message}
          required
        >
          {(p) => <Input {...p} {...register("licenseNumber")} />}
        </Field>
        <Field label="License type" error={errors.licenseType?.message}>
          {(p) => <Input {...p} {...register("licenseType")} />}
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="License expiry" error={errors.licenseExpiry?.message}>
          {(p) => <Input {...p} type="date" {...register("licenseExpiry")} />}
        </Field>
        <Field label="Joining date" error={errors.joiningDate?.message}>
          {(p) => <Input {...p} type="date" {...register("joiningDate")} />}
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Shift" error={errors.shiftType?.message}>
          {(p) => (
            <Select {...p} {...register("shiftType")}>
              {SHIFT_TYPES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Shift start" error={errors.shiftStart?.message}>
          {(p) => <Input {...p} placeholder="06:00" {...register("shiftStart")} />}
        </Field>
        <Field label="Shift end" error={errors.shiftEnd?.message}>
          {(p) => <Input {...p} placeholder="14:00" {...register("shiftEnd")} />}
        </Field>
      </div>

      <div className="pt-2">
        <Button type="submit" loading={submitting}>
          {driver ? "Save changes" : "Create driver"}
        </Button>
      </div>
    </form>
  );
}
