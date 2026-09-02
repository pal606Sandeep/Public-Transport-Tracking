"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader, Input, Alert, EmptyState } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useRoutes } from "@/modules/route/hooks/useRoutes";
import { RouteListItem } from "@/modules/route/components/RouteListItem";

export default function RoutesPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useRoutes({ limit: 100 });

  const routes = (data?.routes ?? []).filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      r.routeNumber.toLowerCase().includes(q) ||
      (r.name ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <PageHeader title="Routes" />
      <div className="flex flex-col gap-2 p-4">
        <Link
          href="/planner"
          className="flex items-center justify-between rounded-[var(--radius-app)] bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
        >
          Plan a journey (From → To)
          <span aria-hidden>→</span>
        </Link>
        <Input
          placeholder="Search routes"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error ? (
        <div className="p-4">
          <Alert tone="error">{errorMessage(error)}</Alert>
        </div>
      ) : isLoading ? (
        <div className="space-y-2 px-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-[var(--radius-app)] bg-muted"
            />
          ))}
        </div>
      ) : routes.length === 0 ? (
        <EmptyState
          title="No routes found"
          hint={search ? "Try a different search." : "No routes are published yet."}
        />
      ) : (
        <ul className="divide-y border-y">
          {routes.map((route) => (
            <li key={route._id}>
              <RouteListItem route={route} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
