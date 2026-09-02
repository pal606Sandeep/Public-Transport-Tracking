"use client";

import { useState } from "react";
import {
  PageHeader,
  Input,
  Alert,
  EmptyState,
  Card,
  SkeletonList,
} from "@/components/ui";
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

      <div className="flex flex-col gap-3 p-4">
        <Card
          href="/planner"
          interactive
          className="flex items-center gap-3 bg-primary p-4 text-primary-foreground"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 6h.01M6 6a2 2 0 100-4 2 2 0 000 4zm0 0v9m0 0a2 2 0 104 0m8-11h.01M18 4a2 2 0 100 4 2 2 0 000-4zm0 0v3a4 4 0 01-4 4H9"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">
              Plan a journey
            </span>
            <span className="block text-[13px] text-primary-foreground/70">
              From → To, with transfers
            </span>
          </span>
          <span aria-hidden className="text-primary-foreground/70">
            →
          </span>
        </Card>

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
        <SkeletonList rows={7} />
      ) : routes.length === 0 ? (
        <EmptyState
          title="No routes found"
          hint={
            search ? "Try a different search." : "No routes are published yet."
          }
        />
      ) : (
        <Card className="mx-4 mb-4 divide-y overflow-hidden">
          {routes.map((route) => (
            <RouteListItem key={route._id} route={route} />
          ))}
        </Card>
      )}
    </>
  );
}
