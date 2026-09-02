"use client";

import { useMemo, useState } from "react";
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
import { useRoutes } from "@/modules/route/hooks/useRoutes";
import { useDrivers } from "@/modules/driver/hooks/useDrivers";
import { useVehicles } from "@/modules/vehicle/hooks/useVehicles";
import { useTrips } from "@/modules/trip/hooks/useTrips";
import { TRIP_STATUSES, type TripStatus } from "@/modules/trip/constant/trip.types";
import { TRIP_STATUS_TONE } from "@/modules/trip/constant/tripStatus";

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "—";

export default function TripsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<TripStatus | "">("");
  const [routeId, setRouteId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const routesQ = useRoutes({ page: 1, limit: 200 });
  const driversQ = useDrivers({ page: 1, limit: 200 });
  const vehiclesQ = useVehicles({ page: 1, limit: 200 });

  const routeName = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of routesQ.data?.routes ?? []) m.set(r._id, r.routeNumber);
    return m;
  }, [routesQ.data?.routes]);
  const driverName = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of driversQ.data?.drivers ?? []) m.set(d._id, d.name);
    return m;
  }, [driversQ.data?.drivers]);
  const vehicleName = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of vehiclesQ.data?.vehicles ?? [])
      m.set(v._id, v.registrationNumber);
    return m;
  }, [vehiclesQ.data?.vehicles]);

  const { data, isLoading, error, isFetching } = useTrips({
    page,
    limit: 20,
    status: status || undefined,
    route: routeId || undefined,
    dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
    dateTo: dateTo ? new Date(dateTo).toISOString() : undefined,
  });

  const trips = data?.trips ?? [];
  const pg = data?.pagination;

  return (
    <>
      <PageHeader
        title="Trips"
        description="Trip instances — generated from schedules or created ad-hoc."
        action={
          <Link href="/trips/new">
            <Button>Add trip</Button>
          </Link>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as TripStatus | "");
            setPage(1);
          }}
          className="max-w-[9rem]"
        >
          <option value="">All statuses</option>
          {TRIP_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select
          value={routeId}
          onChange={(e) => {
            setRouteId(e.target.value);
            setPage(1);
          }}
          className="max-w-[12rem]"
        >
          <option value="">All routes</option>
          {(routesQ.data?.routes ?? []).map((r) => (
            <option key={r._id} value={r._id}>
              {r.routeNumber}
            </option>
          ))}
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
          className="max-w-[10rem]"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
          className="max-w-[10rem]"
        />
        {isFetching && <Spinner />}
      </div>

      {error ? (
        <Alert tone="error">{errorMessage(error)}</Alert>
      ) : isLoading ? (
        <div className="py-16 text-center">
          <Spinner className="h-6 w-6" />
        </div>
      ) : trips.length === 0 ? (
        <EmptyState
          title="No trips"
          hint="Generate trips from a schedule, or add an ad-hoc trip."
        />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Scheduled start</TH>
                <TH>Route</TH>
                <TH>Driver</TH>
                <TH>Vehicle</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <tbody>
              {trips.map((t) => (
                <TR key={t._id}>
                  <TD>{fmt(t.scheduledStartAt)}</TD>
                  <TD className="text-muted-foreground">
                    {routeName.get(t.route) ?? "—"}
                  </TD>
                  <TD className="text-muted-foreground">
                    {t.driver ? driverName.get(t.driver) ?? "assigned" : "—"}
                  </TD>
                  <TD className="text-muted-foreground">
                    {t.vehicle
                      ? vehicleName.get(t.vehicle) ?? "assigned"
                      : "—"}
                  </TD>
                  <TD>
                    <Badge tone={TRIP_STATUS_TONE[t.status]}>{t.status}</Badge>
                  </TD>
                  <TD className="text-right">
                    <Link href={`/trips/${t._id}`}>
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
