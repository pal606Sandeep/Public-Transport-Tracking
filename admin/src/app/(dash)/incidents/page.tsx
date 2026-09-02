"use client";

import { useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  Button,
  Select,
  Input,
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
import { errorMessage } from "@/lib/error/apiError";
import { useIncidents } from "@/modules/incident/hooks/useIncidents";
import {
  INCIDENT_STATUSES,
  INCIDENT_TYPES,
  type IncidentStatus,
  type IncidentType,
} from "@/modules/incident/constant/incident.types";
import {
  SEVERITY_TONE,
  STATUS_TONE,
} from "@/modules/incident/constant/incidentStyle";

export default function IncidentsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<IncidentStatus | "">("");
  const [type, setType] = useState<IncidentType | "">("");
  const [search, setSearch] = useState("");

  const { data, isLoading, error, isFetching } = useIncidents({
    page,
    limit: 20,
    status: status || undefined,
    type: type || undefined,
    search: search || undefined,
  });

  const incidents = data?.incidents ?? [];
  const pg = data?.pagination;

  return (
    <>
      <PageHeader
        title="Incidents"
        description="Operational incidents — SOS, breakdowns, deviations, manual reports."
        action={
          <Link href="/incidents/new">
            <Button>Log incident</Button>
          </Link>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as IncidentStatus | "");
            setPage(1);
          }}
          className="max-w-[10rem]"
        >
          <option value="">All statuses</option>
          {INCIDENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select
          value={type}
          onChange={(e) => {
            setType(e.target.value as IncidentType | "");
            setPage(1);
          }}
          className="max-w-[12rem]"
        >
          <option value="">All types</option>
          {INCIDENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        {isFetching && <Spinner />}
      </div>

      {error ? (
        <Alert tone="error">{errorMessage(error)}</Alert>
      ) : isLoading ? (
        <div className="py-16 text-center">
          <Spinner className="h-6 w-6" />
        </div>
      ) : incidents.length === 0 ? (
        <EmptyState
          title="No incidents"
          hint="SOS alerts and manual reports appear here."
        />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Raised</TH>
                <TH>Title</TH>
                <TH>Type</TH>
                <TH>Severity</TH>
                <TH>Source</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <tbody>
              {incidents.map((it) => (
                <TR key={it._id}>
                  <TD className="text-muted-foreground">
                    {new Date(it.createdAt).toLocaleString([], {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </TD>
                  <TD className="font-medium">
                    <Link
                      href={`/incidents/${it._id}`}
                      className="hover:underline"
                    >
                      {it.title}
                    </Link>
                  </TD>
                  <TD className="text-muted-foreground">{it.type}</TD>
                  <TD>
                    <Badge tone={SEVERITY_TONE[it.severity]}>
                      {it.severity}
                    </Badge>
                  </TD>
                  <TD className="text-xs text-muted-foreground">{it.source}</TD>
                  <TD>
                    <Badge tone={STATUS_TONE[it.status]}>{it.status}</Badge>
                  </TD>
                  <TD className="text-right">
                    <Link href={`/incidents/${it._id}`}>
                      <Button size="sm" variant="outline">
                        Manage
                      </Button>
                    </Link>
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
