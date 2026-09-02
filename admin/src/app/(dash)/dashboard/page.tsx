"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  PageHeader,
  Card,
  CardBody,
  Spinner,
  Alert,
  Badge,
} from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useSession } from "@/modules/auth/hooks/useAuth";
import { useDashboard } from "@/modules/dashboard/useDashboard";

function Kpi({
  label,
  value,
  sub,
  href,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  href?: string;
  tone?: "danger" | "warning";
}) {
  const inner = (
    <Card
      className={
        "h-full transition-colors " +
        (href ? "hover:border-primary " : "") +
        (tone === "danger"
          ? "border-destructive/40"
          : tone === "warning"
            ? "border-[var(--warning)]/40"
            : "")
      }
    >
      <CardBody>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </CardBody>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

const numOr = (v: number | null, dash = "—") => (v == null ? dash : v);

export default function DashboardPage() {
  const { user } = useSession();
  const { data, isLoading, error, isFetching } = useDashboard();

  return (
    <>
      <PageHeader
        title={`Welcome${user?.name ? `, ${user.name.split(" ")[0]}` : ""}`}
        description="Operations at a glance."
        action={isFetching ? <Spinner /> : undefined}
      />

      {error && (
        <Alert tone="error" className="mb-4">
          {errorMessage(error)}
        </Alert>
      )}

      {isLoading ? (
        <div className="py-16 text-center">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              label="Active trips"
              value={numOr(data?.activeTrips ?? null)}
              href="/trips"
            />
            <Kpi
              label="Open incidents"
              value={numOr(data?.openIncidents ?? null)}
              href="/incidents"
              tone={
                (data?.openIncidents ?? 0) > 0 ? "danger" : undefined
              }
            />
            <Kpi
              label="Open complaints"
              value={numOr(data?.openComplaints ?? null)}
              href="/complaints"
              tone={
                (data?.openComplaints ?? 0) > 0 ? "warning" : undefined
              }
            />
            <Kpi
              label="Revenue today"
              value={
                data?.revenueToday
                  ? `₹${data.revenueToday.amount}`
                  : "—"
              }
              sub={
                data?.revenueToday
                  ? `${data.revenueToday.transactions} txns`
                  : undefined
              }
              href="/payments"
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              label="Fleet"
              value={
                data?.vehicles
                  ? `${data.vehicles.active} / ${data.vehicles.total}`
                  : "—"
              }
              sub={
                data?.vehicles
                  ? `${data.vehicles.utilizationPct}% utilised`
                  : undefined
              }
              href="/vehicles"
            />
            <Kpi
              label="Drivers active"
              value={
                data?.drivers
                  ? `${data.drivers.active} / ${data.drivers.total}`
                  : "—"
              }
              href="/drivers"
            />
            <Kpi
              label="Routes"
              value={numOr(data?.routes?.total ?? null)}
              sub={
                data?.routes
                  ? `${data.routes.onTimePct}% on-time`
                  : undefined
              }
              href="/routes"
            />
            <Kpi
              label="Passengers"
              value={numOr(data?.passengers?.total ?? null)}
              sub={
                data?.passengers
                  ? `${data.passengers.active} active`
                  : undefined
              }
              href="/users"
            />
          </div>

          {data?.revenueAllTime && (
            <p className="mt-4 text-sm text-muted-foreground">
              All-time revenue{" "}
              <Badge tone="neutral">
                ₹{data.revenueAllTime.amount} · {data.revenueAllTime.transactions}{" "}
                txns
              </Badge>
            </p>
          )}

          <div className="mt-8">
            <h2 className="mb-2 text-sm font-semibold">Quick actions</h2>
            <div className="flex flex-wrap gap-2 text-sm">
              {[
                ["Add stop", "/stops/new"],
                ["Add route", "/routes/new"],
                ["Add vehicle", "/vehicles/new"],
                ["Add schedule", "/schedules/new"],
                ["Log incident", "/incidents/new"],
                ["New service alert", "/service-alerts/new"],
                ["Live map", "/live"],
              ].map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-[var(--radius-app)] border px-3 py-1.5 hover:bg-muted"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
