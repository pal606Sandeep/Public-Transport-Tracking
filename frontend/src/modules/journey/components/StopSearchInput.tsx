"use client";

import { useState } from "react";
import { Input } from "@/components/ui";
import { useStopSearch } from "../hooks/useJourney";
import type { Endpoint } from "../constant/journey.types";

export function StopSearchInput({
  label,
  value,
  onChange,
  onUseLocation,
}: {
  label: string;
  value: Endpoint | null;
  onChange: (e: Endpoint | null) => void;
  onUseLocation?: () => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const { data, isFetching } = useStopSearch(q);

  return (
    <div className="relative">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {value ? (
        <div className="mt-1 flex items-center justify-between rounded-[var(--radius-app)] border px-3 py-2.5">
          <span className="truncate text-sm">
            {value.kind === "stop" ? value.stop.name : value.label}
          </span>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setQ("");
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            change
          </button>
        </div>
      ) : (
        <div className="mt-1">
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search a stop"
          />
          {onUseLocation && (
            <button
              type="button"
              onClick={onUseLocation}
              className="mt-1 text-xs text-primary"
            >
              Use my location
            </button>
          )}
          {open && q.trim().length >= 2 && (
            <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-[var(--radius-app)] border bg-card shadow-lg">
              {isFetching && (
                <li className="px-3 py-2 text-xs text-muted-foreground">
                  searching…
                </li>
              )}
              {(data?.stops ?? []).map((s) => (
                <li key={s._id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ kind: "stop", stop: s });
                      setOpen(false);
                      setQ("");
                    }}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    <span className="font-medium">{s.name}</span>
                    {s.address && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {s.address}
                      </span>
                    )}
                  </button>
                </li>
              ))}
              {!isFetching && (data?.stops ?? []).length === 0 && (
                <li className="px-3 py-2 text-xs text-muted-foreground">
                  no stops match
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
