"use client";

import { useState } from "react";
import { Button, Input, Alert, Card, Skeleton } from "@/components/ui";
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
    await create.mutateAsync({
      name: name.trim(),
      location: { lat: latN, lng: lngN },
    });
    setName("");
    setLat("");
    setLng("");
    setOpen(false);
  };

  return (
    <section>
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          Saved places
        </h3>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-[13px] font-semibold text-accent"
        >
          {open ? "Cancel" : "Add"}
        </button>
      </div>

      {create.isError && (
        <Alert tone="error" className="mb-2">
          {errorMessage(create.error)}
        </Alert>
      )}

      {open && (
        <Card className="mb-2 flex flex-col gap-2 p-3">
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
          <Button size="lg" loading={create.isPending} onClick={submit}>
            Save place
          </Button>
        </Card>
      )}

      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : locations.length === 0 ? (
        <p className="px-1 text-[13.5px] text-muted-foreground">
          No saved places yet.
        </p>
      ) : (
        <Card className="divide-y overflow-hidden">
          {locations.map((loc) => (
            <div
              key={loc._id}
              className="flex items-center justify-between px-4 py-3 text-[15px]"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{loc.name}</div>
                {loc.address && (
                  <div className="truncate text-[12.5px] text-muted-foreground">
                    {loc.address}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => del.mutate(loc._id)}
                className="shrink-0 text-[13px] font-medium text-muted-foreground transition-colors active:text-destructive"
              >
                Remove
              </button>
            </div>
          ))}
        </Card>
      )}
    </section>
  );
}
