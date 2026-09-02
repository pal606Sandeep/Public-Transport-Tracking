"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  PageHeader,
  Input,
  Select,
  Alert,
  Badge,
  Spinner,
  EmptyState,
  Pagination,
  Table,
  THead,
  TR,
  TH,
  TD,
} from "@/components/ui";
import { api } from "@/utils/apiClient";
import type { Pagination as Pg } from "@/types";
import { errorMessage } from "@/lib/error/apiError";

interface AuditLog {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  meta: Record<string, unknown>;
  ip: string;
  severity: string;
  createdAt: string;
}

const sevTone: Record<string, "neutral" | "info" | "warning" | "danger"> = {
  INFO: "neutral",
  WARN: "warning",
  ERROR: "danger",
  CRITICAL: "danger",
};

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [resource, setResource] = useState("");
  const [action, setAction] = useState("");
  const [severity, setSeverity] = useState("");

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["audit-logs", { page, resource, action, severity }],
    queryFn: async () => {
      const p = new URLSearchParams();
      p.set("page", String(page));
      p.set("limit", "25");
      if (resource) p.set("resource", resource);
      if (action) p.set("action", action);
      if (severity) p.set("severity", severity);
      const res = await api.get<{ logs: AuditLog[]; pagination: Pg }>(
        `/admin/audit-logs?${p.toString()}`
      );
      return res.data as { logs: AuditLog[]; pagination: Pg };
    },
  });

  const logs = data?.logs ?? [];
  const pg = data?.pagination;

  return (
    <>
      <PageHeader
        title="Audit logs"
        description="Every privileged action, newest first."
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Resource (e.g. stop, trip)…"
          value={resource}
          onChange={(e) => {
            setResource(e.target.value);
            setPage(1);
          }}
          className="max-w-[12rem]"
        />
        <Input
          placeholder="Action (e.g. stop.create)…"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          className="max-w-[14rem]"
        />
        <Select
          value={severity}
          onChange={(e) => {
            setSeverity(e.target.value);
            setPage(1);
          }}
          className="max-w-[9rem]"
        >
          <option value="">All severity</option>
          <option value="INFO">Info</option>
          <option value="WARN">Warn</option>
          <option value="ERROR">Error</option>
        </Select>
        {isFetching && <Spinner />}
      </div>

      {error ? (
        <Alert tone="error">{errorMessage(error)}</Alert>
      ) : isLoading ? (
        <div className="py-16 text-center">
          <Spinner className="h-6 w-6" />
        </div>
      ) : logs.length === 0 ? (
        <EmptyState title="No log entries" />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Time</TH>
                <TH>Action</TH>
                <TH>Resource</TH>
                <TH>Actor</TH>
                <TH>Severity</TH>
              </TR>
            </THead>
            <tbody>
              {logs.map((l) => (
                <TR key={l.id}>
                  <TD className="whitespace-nowrap text-muted-foreground">
                    {new Date(l.createdAt).toLocaleString()}
                  </TD>
                  <TD className="font-mono text-xs">{l.action}</TD>
                  <TD className="text-muted-foreground">
                    {l.resource}
                    {l.resourceId ? (
                      <span className="ml-1 font-mono text-[10px]">
                        {l.resourceId.slice(-6)}
                      </span>
                    ) : null}
                  </TD>
                  <TD className="text-xs text-muted-foreground">
                    {l.actorRole ?? "—"}
                  </TD>
                  <TD>
                    <Badge tone={sevTone[l.severity] ?? "neutral"}>
                      {l.severity}
                    </Badge>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
          {pg && (
            <Pagination
              page={pg.page}
              totalPages={pg.totalPages ?? 1}
              onPage={setPage}
            />
          )}
        </>
      )}
    </>
  );
}
