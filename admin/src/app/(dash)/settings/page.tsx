"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PageHeader,
  Button,
  Field,
  Input,
  Textarea,
  Alert,
  Spinner,
  Modal,
  EmptyState,
  Table,
  THead,
  TR,
  TH,
  TD,
} from "@/components/ui";
import { api } from "@/utils/apiClient";
import { errorMessage } from "@/lib/error/apiError";

interface Setting {
  key: string;
  value: unknown;
  description: string;
  updatedAt: string;
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [valueJson, setValueJson] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  const listQ = useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      const res = await api.get<{ settings: Setting[] }>(
        "/admin/system-settings"
      );
      return res.data?.settings ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      let value: unknown;
      try {
        value = JSON.parse(valueJson);
      } catch {
        throw new Error("Value must be valid JSON (use quotes for strings)");
      }
      if (editingKey) {
        await api.patch(`/admin/system-settings/${encodeURIComponent(editingKey)}`, {
          value,
          description: description.trim() || undefined,
        });
      } else {
        await api.post("/admin/system-settings", {
          key: key.trim(),
          value,
          description: description.trim() || undefined,
        });
      }
    },
    onSuccess: () => {
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["system-settings"] });
    },
  });

  const del = useMutation({
    mutationFn: (k: string) =>
      api.del(`/admin/system-settings/${encodeURIComponent(k)}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["system-settings"] }),
  });

  const startCreate = () => {
    setEditingKey(null);
    setKey("");
    setDescription("");
    setValueJson('""');
    setJsonError(null);
    setOpen(true);
  };
  const startEdit = (s: Setting) => {
    setEditingKey(s.key);
    setKey(s.key);
    setDescription(s.description);
    setValueJson(JSON.stringify(s.value, null, 2));
    setJsonError(null);
    setOpen(true);
  };

  const settings = listQ.data ?? [];

  return (
    <>
      <PageHeader
        title="System settings"
        description="Key/value configuration read by the backend and apps."
        action={<Button onClick={startCreate}>Add setting</Button>}
      />

      {listQ.error ? (
        <Alert tone="error">{errorMessage(listQ.error)}</Alert>
      ) : listQ.isLoading ? (
        <div className="py-16 text-center">
          <Spinner className="h-6 w-6" />
        </div>
      ) : settings.length === 0 ? (
        <EmptyState title="No settings" />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Key</TH>
              <TH>Value</TH>
              <TH>Description</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <tbody>
            {settings.map((s) => (
              <TR key={s.key}>
                <TD className="font-mono text-xs">{s.key}</TD>
                <TD className="max-w-xs truncate font-mono text-xs text-muted-foreground">
                  {JSON.stringify(s.value)}
                </TD>
                <TD className="text-muted-foreground">{s.description || "—"}</TD>
                <TD className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(s)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      loading={del.isPending && del.variables === s.key}
                      onClick={() => del.mutate(s.key)}
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
        title={editingKey ? `Edit ${editingKey}` : "Add setting"}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              loading={save.isPending}
              disabled={!editingKey && key.trim().length === 0}
              onClick={() => save.mutate()}
            >
              Save
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {save.isError && <Alert tone="error">{errorMessage(save.error)}</Alert>}
          {jsonError && <Alert tone="error">{jsonError}</Alert>}
          {!editingKey && (
            <Field label="Key">
              {(p) => (
                <Input
                  {...p}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="font-mono text-xs"
                />
              )}
            </Field>
          )}
          <Field label="Value (JSON)">
            {(p) => (
              <Textarea
                {...p}
                rows={4}
                className="font-mono text-xs"
                value={valueJson}
                onChange={(e) => setValueJson(e.target.value)}
              />
            )}
          </Field>
          <Field label="Description">
            {(p) => (
              <Input
                {...p}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            )}
          </Field>
        </div>
      </Modal>
    </>
  );
}
