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
import { useStops } from "@/modules/stop/hooks/useStops";
import { StopListItem } from "@/modules/stop/components/StopListItem";

export default function StopsPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useStops({ limit: 100 });

  const stops = (data?.stops ?? []).filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      (s.code ?? "").toLowerCase().includes(q) ||
      (s.address ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <PageHeader title="Stops" />

      <div className="p-4">
        <Input
          placeholder="Search stops"
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
      ) : stops.length === 0 ? (
        <EmptyState
          title="No stops found"
          hint={
            search ? "Try a different search." : "No stops are published yet."
          }
        />
      ) : (
        <Card className="mx-4 mb-4 divide-y overflow-hidden">
          {stops.map((stop) => (
            <StopListItem key={stop._id} stop={stop} />
          ))}
        </Card>
      )}
    </>
  );
}
