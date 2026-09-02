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
import { useServiceAlerts } from "@/modules/serviceAlert/useServiceAlerts";
import {
  ALERT_TYPES,
  SEVERITY_TONE,
  STATUS_TONE,
  type AlertStatus,
  type AlertType,
} from "@/modules/serviceAlert/serviceAlert.types";

export default function ServiceAlertsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<AlertStatus | "">("");
  const [type, setType] = useState<AlertType | "">("");
  const [search, setSearch] = useState("");

  const { data, isLoading, error, isFetching } = useServiceAlerts({
    page,
    limit: 20,
    status: status || undefined,
    type: type || undefined,
    search: search || undefined,
  });

  const alerts = data?.serviceAlerts ?? [];
  const pg = data?.pagination;

  return (
    <>
      <PageHeader
        title="Service alerts"
        description="Disruptions, closures and notices shown in the passenger app."
        action={
          <Link href="/service-alerts/new">
            <Button>New alert</Button>
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
            setStatus(e.target.value as AlertStatus | "");
            setPage(1);
          }}
          className="max-w-[10rem]"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="EXPIRED">Expired</option>
        </Select>
        <Select
          value={type}
          onChange={(e) => {
            setType(e.target.value as AlertType | "");
            setPage(1);
          }}
          className="max-w-[10rem]"
        >
          <option value="">All types</option>
          {ALERT_TYPES.map((t) => (
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
      ) : alerts.length === 0 ? (
        <EmptyState
          title="No alerts"
          hint="Create an alert and publish it to notify passengers."
        />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Title</TH>
                <TH>Type</TH>
                <TH>Severity</TH>
                <TH>Target</TH>
                <TH>Window</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <tbody>
              {alerts.map((al) => (
                <TR key={al._id}>
                  <TD className="font-medium">
                    <Link
                      href={`/service-alerts/${al._id}`}
                      className="hover:underline"
                    >
                      {al.title}
                    </Link>
                  </TD>
                  <TD className="text-muted-foreground">{al.type}</TD>
                  <TD>
                    <Badge tone={SEVERITY_TONE[al.severity]}>
                      {al.severity}
                    </Badge>
                  </TD>
                  <TD className="text-xs text-muted-foreground">
                    {al.targeting.type === "all"
                      ? "Network"
                      : al.targeting.type === "routes"
                        ? `${al.targeting.routeIds.length} route(s)`
                        : al.targeting.type === "stops"
                          ? `${al.targeting.stopIds.length} stop(s)`
                          : "Geo area"}
                  </TD>
                  <TD className="text-xs text-muted-foreground">
                    {new Date(al.startsAt).toLocaleDateString()}
                    {al.endsAt
                      ? ` – ${new Date(al.endsAt).toLocaleDateString()}`
                      : ""}
                  </TD>
                  <TD>
                    <Badge tone={STATUS_TONE[al.status]}>{al.status}</Badge>
                  </TD>
                  <TD className="text-right">
                    <Link href={`/service-alerts/${al._id}`}>
                      <Button size="sm" variant="outline">
                        Open
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
