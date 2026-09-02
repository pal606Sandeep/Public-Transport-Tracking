"use client";

import { useState } from "react";
import type { UseMutationResult } from "@tanstack/react-query";
import {
  Button,
  Field,
  Input,
  Select,
  Alert,
  Badge,
  Spinner,
  Modal,
  Table,
  THead,
  TR,
  TH,
  TD,
  EmptyState,
} from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";

export type FieldType = "text" | "number" | "date" | "checkbox" | "select" | "csv";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  options?: readonly string[];
  required?: boolean;
  hint?: string;
}

export interface ColumnDef<T> {
  header: string;
  render: (row: T) => React.ReactNode;
}

const dateInput = (v: unknown): string =>
  typeof v === "string" && v ? v.slice(0, 10) : "";

function emptyForm(fields: FieldDef[]): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const f of fields) {
    o[f.name] =
      f.type === "checkbox"
        ? true
        : f.type === "select"
          ? f.options?.[0] ?? ""
          : "";
  }
  return o;
}

function rowToForm(
  fields: FieldDef[],
  row: Record<string, unknown>
): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const f of fields) {
    const v = row[f.name];
    if (f.type === "date") o[f.name] = dateInput(v);
    else if (f.type === "checkbox") o[f.name] = Boolean(v);
    else if (f.type === "csv") o[f.name] = Array.isArray(v) ? v.join(", ") : "";
    else o[f.name] = v ?? "";
  }
  return o;
}

function formToInput(
  fields: FieldDef[],
  form: Record<string, unknown>
): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const f of fields) {
    const v = form[f.name];
    if (f.type === "number") {
      o[f.name] = v === "" || v == null ? null : Number(v);
    } else if (f.type === "date") {
      o[f.name] = v ? new Date(String(v)).toISOString() : null;
    } else if (f.type === "checkbox") {
      o[f.name] = Boolean(v);
    } else if (f.type === "csv") {
      o[f.name] = String(v ?? "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    } else {
      o[f.name] = String(v ?? "").trim() || null;
    }
  }
  return o;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMut = UseMutationResult<any, unknown, any, unknown>;

export function CrudSection<T extends { _id: string }>({
  title,
  rows,
  loading,
  error,
  columns,
  fields,
  create,
  update,
  remove,
}: {
  title: string;
  rows: T[];
  loading: boolean;
  error: unknown;
  columns: ColumnDef<T>[];
  fields: FieldDef[];
  create: AnyMut;
  update: AnyMut;
  remove: AnyMut;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm(fields));
    setOpen(true);
  };
  const startEdit = (row: T) => {
    setEditing(row);
    setForm(rowToForm(fields, row as unknown as Record<string, unknown>));
    setOpen(true);
  };

  const submit = () => {
    const input = formToInput(fields, form);
    if (editing) {
      update.mutate(
        { id: editing._id, input },
        { onSuccess: () => setOpen(false) }
      );
    } else {
      create.mutate(input, { onSuccess: () => setOpen(false) });
    }
  };

  const mutError = create.error ?? update.error;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Button size="sm" onClick={startCreate}>
          Add
        </Button>
      </div>

      {error != null ? (
        <Alert tone="error">{errorMessage(error)}</Alert>
      ) : loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState title={`No ${title.toLowerCase()}`} />
      ) : (
        <Table>
          <THead>
            <TR>
              {columns.map((c) => (
                <TH key={c.header}>{c.header}</TH>
              ))}
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <tbody>
            {rows.map((row) => (
              <TR key={row._id}>
                {columns.map((c) => (
                  <TD key={c.header}>{c.render(row)}</TD>
                ))}
                <TD className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(row)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      loading={
                        remove.isPending && remove.variables === row._id
                      }
                      onClick={() => remove.mutate(row._id)}
                    >
                      Delete
                    </Button>
                  </div>
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${title.slice(0, -1)}` : `Add ${title.slice(0, -1)}`}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              loading={create.isPending || update.isPending}
              onClick={submit}
            >
              {editing ? "Save" : "Create"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {mutError != null && (
            <Alert tone="error">{errorMessage(mutError)}</Alert>
          )}
          {fields.map((f) => {
            if (f.type === "checkbox") {
              return (
                <label
                  key={f.name}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(form[f.name])}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, [f.name]: e.target.checked }))
                    }
                  />
                  {f.label}
                </label>
              );
            }
            return (
              <Field key={f.name} label={f.label} hint={f.hint}>
                {(p) =>
                  f.type === "select" ? (
                    <Select
                      {...p}
                      value={String(form[f.name] ?? "")}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, [f.name]: e.target.value }))
                      }
                    >
                      {(f.options ?? []).map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      {...p}
                      type={
                        f.type === "number"
                          ? "number"
                          : f.type === "date"
                            ? "date"
                            : "text"
                      }
                      step={f.type === "number" ? "any" : undefined}
                      value={String(form[f.name] ?? "")}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, [f.name]: e.target.value }))
                      }
                    />
                  )
                }
              </Field>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge tone="success">Active</Badge>
  ) : (
    <Badge tone="neutral">Inactive</Badge>
  );
}
