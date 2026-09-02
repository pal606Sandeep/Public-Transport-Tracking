"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useStopSearch } from "../hooks/useJourney";
import type { Endpoint } from "../constant/journey.types";

export function StopSearchInput({
  label,
  marker,
  value,
  onChange,
  onUseLocation,
}: {
  label: string;
  marker?: ReactNode;
  value: Endpoint | null;
  onChange: (e: Endpoint | null) => void;
  onUseLocation?: () => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const { data, isFetching } = useStopSearch(q);

  return (
    <div className="relative flex items-center gap-3 px-4 py-3.5">
      <span className="grid h-5 w-5 shrink-0 place-items-center">{marker}</span>

      {value ? (
        <>
          <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
            {value.kind === "stop" ? value.stop.name : value.label}
          </span>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setQ("");
            }}
            className="shrink-0 text-[13px] font-medium text-accent"
          >
            Change
          </button>
        </>
      ) : (
        <div className="min-w-0 flex-1">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={label}
            className="w-full bg-transparent text-[15px] font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground"
          />
          {onUseLocation && !q && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onUseLocation}
              className="mt-0.5 text-[12.5px] font-medium text-accent"
            >
              Use my location
            </button>
          )}

          {open && q.trim().length >= 2 && (
            <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-auto rounded-[var(--radius-app)] border bg-elevated py-1 shadow-[var(--shadow-lg)]">
              {isFetching && (
                <li className="px-4 py-2.5 text-[13px] text-muted-foreground">
                  Searching…
                </li>
              )}
              {(data?.stops ?? []).map((s) => (
                <li key={s._id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange({ kind: "stop", stop: s });
                      setOpen(false);
                      setQ("");
                    }}
                    className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors active:bg-muted"
                  >
                    <svg
                      className="mt-0.5 shrink-0 text-muted-foreground"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="M12 21s7-5.6 7-11a7 7 0 10-14 0c0 5.4 7 11 7 11z"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      />
                      <circle
                        cx="12"
                        cy="10"
                        r="2.3"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      />
                    </svg>
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium">
                        {s.name}
                      </span>
                      {s.address && (
                        <span className="block truncate text-[12.5px] text-muted-foreground">
                          {s.address}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
              {!isFetching && (data?.stops ?? []).length === 0 && (
                <li className="px-4 py-2.5 text-[13px] text-muted-foreground">
                  No stops match “{q}”
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
