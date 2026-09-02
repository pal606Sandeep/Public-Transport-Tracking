"use client";

import { useState } from "react";
import {
  PageHeader,
  Button,
  Field,
  Input,
  Textarea,
  Alert,
  Badge,
  Spinner,
  Card,
  CardHeader,
  CardBody,
  EmptyState,
} from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import {
  useTemplates,
  useUpsertTemplate,
  useDeleteTemplate,
  usePreviewTemplate,
} from "@/modules/notificationTemplate/useNotificationTemplates";
import type { NotificationTemplate } from "@/modules/notificationTemplate/notificationTemplate.service";

const BLANK = {
  key: "",
  description: "",
  titleTemplate: "",
  bodyTemplate: "",
  variables: "",
  enabled: true,
};

export default function NotificationTemplatesPage() {
  const { data: templates, isLoading, error } = useTemplates();
  const upsert = useUpsertTemplate();
  const del = useDeleteTemplate();
  const preview = usePreviewTemplate();

  const [form, setForm] = useState(BLANK);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [varsJson, setVarsJson] = useState("{}");
  const [varsError, setVarsError] = useState<string | null>(null);

  const load = (t: NotificationTemplate) => {
    setEditingKey(t.key);
    setForm({
      key: t.key,
      description: t.description ?? "",
      titleTemplate: t.titleTemplate,
      bodyTemplate: t.bodyTemplate,
      variables: (t.variables ?? []).join(", "),
      enabled: t.enabled,
    });
    preview.reset();
  };

  const newTemplate = () => {
    setEditingKey(null);
    setForm(BLANK);
    preview.reset();
  };

  const save = () => {
    upsert.mutate(
      {
        key: form.key.trim(),
        description: form.description.trim() || null,
        titleTemplate: form.titleTemplate,
        bodyTemplate: form.bodyTemplate,
        variables: form.variables
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
        enabled: form.enabled,
      },
      { onSuccess: (t) => load(t) }
    );
  };

  const runPreview = () => {
    setVarsError(null);
    let vars: Record<string, unknown>;
    try {
      vars = JSON.parse(varsJson || "{}");
    } catch {
      setVarsError("Vars must be valid JSON");
      return;
    }
    preview.mutate({ key: form.key.trim(), vars });
  };

  return (
    <>
      <PageHeader
        title="Notification templates"
        description="Reusable title/body templates. Use {{variable}} placeholders."
        action={
          <Button variant="outline" onClick={newTemplate}>
            New template
          </Button>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[20rem_1fr]">
        <Card>
          <CardHeader title="Templates" />
          <CardBody className="p-0">
            {error ? (
              <div className="p-4">
                <Alert tone="error">{errorMessage(error)}</Alert>
              </div>
            ) : isLoading ? (
              <div className="p-4">
                <Spinner />
              </div>
            ) : (templates ?? []).length === 0 ? (
              <EmptyState title="No templates" hint="Create your first one." />
            ) : (
              <ul className="divide-y">
                {(templates ?? []).map((t) => (
                  <li key={t.key}>
                    <button
                      type="button"
                      onClick={() => load(t)}
                      className={
                        "flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-muted " +
                        (editingKey === t.key ? "bg-muted" : "")
                      }
                    >
                      <span className="font-mono text-xs">{t.key}</span>
                      {!t.enabled && <Badge tone="neutral">off</Badge>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader
              title={editingKey ? `Edit: ${editingKey}` : "New template"}
            />
            <CardBody className="flex flex-col gap-4">
              {upsert.isError && (
                <Alert tone="error">{errorMessage(upsert.error)}</Alert>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Key">
                  {(p) => (
                    <Input
                      {...p}
                      value={form.key}
                      disabled={!!editingKey}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, key: e.target.value }))
                      }
                      placeholder="trip.delayed"
                    />
                  )}
                </Field>
                <Field label="Description">
                  {(p) => (
                    <Input
                      {...p}
                      value={form.description}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          description: e.target.value,
                        }))
                      }
                    />
                  )}
                </Field>
              </div>

              <Field label="Title template">
                {(p) => (
                  <Input
                    {...p}
                    value={form.titleTemplate}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        titleTemplate: e.target.value,
                      }))
                    }
                    placeholder="Trip {{routeNumber}} delayed"
                  />
                )}
              </Field>

              <Field label="Body template">
                {(p) => (
                  <Textarea
                    {...p}
                    rows={3}
                    value={form.bodyTemplate}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        bodyTemplate: e.target.value,
                      }))
                    }
                    placeholder="Your bus on route {{routeNumber}} is running {{minutes}} min late."
                  />
                )}
              </Field>

              <Field
                label="Variables"
                hint="Comma-separated names used in the templates"
              >
                {(p) => (
                  <Input
                    {...p}
                    value={form.variables}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, variables: e.target.value }))
                    }
                    placeholder="routeNumber, minutes"
                  />
                )}
              </Field>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, enabled: e.target.checked }))
                  }
                />
                Enabled
              </label>

              <div className="flex gap-2 pt-2">
                <Button
                  loading={upsert.isPending}
                  disabled={
                    form.key.trim().length === 0 ||
                    form.titleTemplate.length === 0 ||
                    form.bodyTemplate.length === 0
                  }
                  onClick={save}
                >
                  {editingKey ? "Save" : "Create"}
                </Button>
                {editingKey && (
                  <Button
                    variant="destructive"
                    loading={del.isPending}
                    onClick={() =>
                      del.mutate(editingKey, { onSuccess: newTemplate })
                    }
                  >
                    Delete
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>

          {editingKey && (
            <Card>
              <CardHeader title="Preview" />
              <CardBody className="flex flex-col gap-3">
                <Field label="Sample variables (JSON)">
                  {(p) => (
                    <Textarea
                      {...p}
                      rows={3}
                      className="font-mono text-xs"
                      value={varsJson}
                      onChange={(e) => setVarsJson(e.target.value)}
                    />
                  )}
                </Field>
                {varsError && <Alert tone="error">{varsError}</Alert>}
                {preview.isError && (
                  <Alert tone="error">{errorMessage(preview.error)}</Alert>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  loading={preview.isPending}
                  onClick={runPreview}
                >
                  Render preview
                </Button>
                {preview.data && (
                  <div className="rounded-[var(--radius-app)] border bg-muted p-3">
                    <p className="text-sm font-semibold">
                      {preview.data.title}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {preview.data.body}
                    </p>
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
