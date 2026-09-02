"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Select,
  Input,
  Alert,
  Card,
  CardHeader,
  CardBody,
} from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useStops } from "@/modules/stop/hooks/useStops";
import { useRouteStops } from "../hooks/useRoutes";
import type { Route } from "../constant/route.types";

export function RouteStopsEditor({ route }: { route: Route }) {
  const { add, remove, reorder } = useRouteStops(route._id);
  const stopsQ = useStops({ page: 1, limit: 200 });

  const [newStopId, setNewStopId] = useState("");
  const [offset, setOffset] = useState("0");

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of stopsQ.data?.stops ?? []) m.set(s._id, s.name);
    return m;
  }, [stopsQ.data?.stops]);

  const ordered = useMemo(
    () => [...route.orderedStops].sort((a, b) => a.sequence - b.sequence),
    [route.orderedStops]
  );
  const usedIds = new Set(ordered.map((s) => s.stopId));
  const available = (stopsQ.data?.stops ?? []).filter(
    (s) => !usedIds.has(s._id)
  );

  const busy =
    add.isPending || remove.isPending || reorder.isPending;
  const mutError = add.error ?? remove.error ?? reorder.error;

  const move = (index: number, dir: -1 | 1) => {
    const next = [...ordered];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorder.mutate(next.map((s) => s.stopId));
  };

  const onAdd = () => {
    if (!newStopId) return;
    add.mutate(
      {
        stopId: newStopId,
        sequence: ordered.length,
        scheduledOffsetMinutes: Number(offset) || 0,
      },
      {
        onSuccess: () => {
          setNewStopId("");
          setOffset("0");
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader title={`Ordered stops (${ordered.length})`} />
      <CardBody className="flex flex-col gap-3">
        {mutError != null && (
          <Alert tone="error">{errorMessage(mutError)}</Alert>
        )}

        {ordered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No stops on this route yet. Add stops in travel order below.
          </p>
        ) : (
          <ol className="flex flex-col gap-1">
            {ordered.map((s, i) => (
              <li
                key={s.stopId}
                className="flex items-center gap-2 rounded-[var(--radius-app)] border px-3 py-2 text-sm"
              >
                <span className="w-6 text-center text-xs text-muted-foreground">
                  {i + 1}
                </span>
                <span className="flex-1 truncate">
                  {nameById.get(s.stopId) ?? (
                    <span className="font-mono text-xs text-muted-foreground">
                      {s.stopId}
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  +{s.scheduledOffsetMinutes}m
                </span>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy || i === 0}
                    onClick={() => move(i, -1)}
                    aria-label="Move up"
                  >
                    ↑
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy || i === ordered.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label="Move down"
                  >
                    ↓
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    disabled={busy}
                    onClick={() => remove.mutate(s.stopId)}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}

        <div className="flex items-end gap-2 border-t pt-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Add stop
            </label>
            <Select
              value={newStopId}
              onChange={(e) => setNewStopId(e.target.value)}
              disabled={stopsQ.isLoading}
            >
              <option value="">
                {stopsQ.isLoading ? "Loading stops…" : "Select a stop…"}
              </option>
              {available.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                  {s.code ? ` (${s.code})` : ""}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-24">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Offset (m)
            </label>
            <Input
              type="number"
              value={offset}
              onChange={(e) => setOffset(e.target.value)}
            />
          </div>
          <Button onClick={onAdd} loading={add.isPending} disabled={!newStopId}>
            Add
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
