import { api } from "@/utils/apiClient";

export interface NotificationTemplate {
  _id: string;
  key: string;
  description: string | null;
  titleTemplate: string;
  bodyTemplate: string;
  variables: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateInput {
  key: string;
  description?: string | null;
  titleTemplate: string;
  bodyTemplate: string;
  variables?: string[];
  enabled?: boolean;
}

const BASE = "/admin/notification-templates";

export async function listTemplates(): Promise<NotificationTemplate[]> {
  const res = await api.get<{ templates: NotificationTemplate[] }>(BASE);
  return res.data?.templates ?? [];
}

export async function upsertTemplate(
  input: TemplateInput
): Promise<NotificationTemplate> {
  const res = await api.post<{ template: NotificationTemplate }>(BASE, input);
  return (res.data as { template: NotificationTemplate }).template;
}

export async function previewTemplate(
  key: string,
  vars: Record<string, unknown>
): Promise<{ title: string; body: string }> {
  const res = await api.post<{ title: string; body: string }>(
    `${BASE}/preview`,
    { key, vars }
  );
  return res.data as { title: string; body: string };
}

export async function deleteTemplate(key: string): Promise<void> {
  await api.del(`${BASE}/${encodeURIComponent(key)}`);
}
