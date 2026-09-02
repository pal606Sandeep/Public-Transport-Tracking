"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Field, Input, Select, Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useUsers } from "@/modules/user/hooks/useUsers";
import {
  conductorFormSchema,
  type ConductorFormValues,
  type ConductorFormParsed,
} from "../constant/conductor.validation";
import {
  CONDUCTOR_STATUSES,
  SHIFT_TYPES,
  type Conductor,
  type ConductorInput,
} from "../constant/conductor.types";

const dateInput = (iso: string | null | undefined): string =>
  iso ? iso.slice(0, 10) : "";

const toIso = (d?: string): string | null =>
  d ? new Date(d).toISOString() : null;

export function ConductorForm({
  conductor,
  submitting,
  error,
  onSubmit,
}: {
  conductor?: Conductor;
  submitting: boolean;
  error?: unknown;
  onSubmit: (input: ConductorInput) => void;
}) {
  const usersQ = useUsers({ role: "CONDUCTOR", limit: 200 });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ConductorFormValues>({
    resolver: zodResolver(conductorFormSchema),
    defaultValues: conductor
      ? {
          user: conductor.user,
          name: conductor.name,
          phone: conductor.phone ?? "",
          employeeId: conductor.employeeId,
          joiningDate: dateInput(conductor.joiningDate),
          status: conductor.status,
          shiftType: conductor.shift?.type ?? "MORNING",
          shiftStart: conductor.shift?.start ?? "",
          shiftEnd: conductor.shift?.end ?? "",
        }
      : { status: "ACTIVE", shiftType: "MORNING" },
  });

  const submit = (v: ConductorFormValues) => {
    const p = v as ConductorFormParsed;
    onSubmit({
      user: p.user,
      name: p.name,
      phone: p.phone?.trim() || null,
      employeeId: p.employeeId,
      joiningDate: toIso(p.joiningDate),
      status: p.status,
      shift: {
        type: p.shiftType,
        start: p.shiftStart?.trim() || null,
        end: p.shiftEnd?.trim() || null,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="flex max-w-xl flex-col gap-4">
      {error != null && <Alert tone="error">{errorMessage(error)}</Alert>}

      <Field
        label="Linked user account"
        error={errors.user?.message}
        hint="A registered user with the CONDUCTOR role."
        required
      >
        {(p) => (
          <Select {...p} {...register("user")} disabled={!!conductor}>
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
              {CONDUCTOR_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <Field label="Joining date" error={errors.joiningDate?.message}>
        {(p) => <Input {...p} type="date" {...register("joiningDate")} />}
      </Field>

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
          {(p) => (
            <Input {...p} placeholder="06:00" {...register("shiftStart")} />
          )}
        </Field>
        <Field label="Shift end" error={errors.shiftEnd?.message}>
          {(p) => <Input {...p} placeholder="14:00" {...register("shiftEnd")} />}
        </Field>
      </div>

      <div className="pt-2">
        <Button type="submit" loading={submitting}>
          {conductor ? "Save changes" : "Create conductor"}
        </Button>
      </div>
    </form>
  );
}
