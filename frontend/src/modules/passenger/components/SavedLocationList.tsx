"use client";

import { useState } from "react";
import { Button, Input, Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import {
  useSavedLocations,
  useCreateSavedLocation,
  useDeleteSavedLocation,
} from "../hooks/usePassenger";

export function SavedLocationList() {
  const { data: locations = [], isLoading } = useSavedLocations();
  const create = useCreateSavedLocation();
  const del = useDeleteSavedLocation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const submit = async () => {
    const latN = Number(lat);
    const lngN = Number(lng);
    if (!name.trim() || Number.isNaN(latN) || Number.isNaN(lngN)) return;
    await create.mutateAsync({ name: name.trim(), location: { lat: latN, lng: lngN } });
    setName("");
    setLat("");
    setLng("");
    setOpen(false);
  };

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Saved places
        </h3>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-sm text-primary"
        >
          {open ? "Cancel" : "Add"}
        </button>
      </div>

      {create.isError && <Alert tone="error">{errorMessage(create.error)}</Alert>}

      {open && (
        <div className="flex flex-col gap-2 rounded-[var(--radius-app)] border p-3">
          <Input
            placeholder="Name (e.g. Home)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex gap-2">
            <Input
              placeholder="Latitude"
              inputMode="decimal"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
            />
            <Input
              placeholder="Longitude"
              inputMode="decimal"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
            />
          </div>
          <Button size="sm" loading={create.isPending} onClick={submit}>
            Save place
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="h-16 animate-pulse rounded-[var(--radius-app)] bg-muted" />
      ) : locations.length === 0 ? (
        <p className="text-sm text-muted-foreground">No saved places yet.</p>
      ) : (
        <ul className="divide-y rounded-[var(--radius-app)] border">
          {locations.map((loc) => (
            <li
              key={loc._id}
              className="flex items-center justify-between px-3 py-2.5 text-sm"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{loc.name}</div>
                {loc.address && (
                  <div className="truncate text-xs text-muted-foreground">
                    {loc.address}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => del.mutate(loc._id)}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
