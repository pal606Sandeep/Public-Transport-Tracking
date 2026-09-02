"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  PageHeader,
  Field,
  Input,
  Alert,
  Spinner,
  Card,
  CardHeader,
  CardBody,
  Table,
  THead,
  TR,
  TH,
  TD,
} from "@/components/ui";
import { api } from "@/utils/apiClient";
import { errorMessage } from "@/lib/error/apiError";

const REPORTS = [
  { key: "passengers", path: "/admin/analytics/passengers" },
  { key: "vehicles", path: "/admin/analytics/vehicles" },
  { key: "drivers", path: "/admin/analytics/drivers" },
  { key: "routes", path: "/admin/analytics/routes" },
  { key: "revenue", path: "/admin/analytics/revenue" },
  { key: "occupancy", path: "/admin/analytics/occupancy" },
] as const;

const isFlatObjArray = (v: unknown): v is Record<string, unknown>[] =>
  Array.isArray(v) &&
  v.length > 0 &&
  v.every(
    (x) =>
      x != null &&
      typeof x === "object" &&
      !Array.isArray(x) &&
      Object.values(x as object).every(
        (val) => val == null || typeof val !== "object"
      )
  );

function Value({ value }: { value: unknown }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  if (typeof value !== "object")
    return <span>{String(value)}</span>;

  if (isFlatObjArray(value)) {
    const cols = Array.from(
      value.reduce<Set<string>>((acc, row) => {
        Object.keys(row).forEach((k) => acc.add(k));
        return acc;
      }, new Set())
    );
    return (
      <Table>
        <THead>
          <TR>
            {cols.map((c) => (
              <TH key={c}>{c}</TH>
            ))}
          </TR>
        </THead>
        <tbody>
          {value.slice(0, 100).map((row, i) => (
            <TR key={i}>
              {cols.map((c) => (
                <TD key={c} className="text-muted-foreground">
                  {row[c] == null ? "—" : String(row[c])}
                </TD>
              ))}
            </TR>
          ))}
        </tbody>
      </Table>
    );
  }

  if (Array.isArray(value)) {
    return (
      <pre className="overflow-x-auto rounded-[var(--radius-app)] bg-muted p-2 text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  return (
    <dl className="grid grid-cols-[12rem_1fr] gap-y-1.5 text-sm">
      {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
        <FragmentRow key={k} label={k} value={v} />
      ))}
    </dl>
  );
}

function FragmentRow({ label, value }: { label: string; value: unknown }) {
  const nested = value != null && typeof value === "object";
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={nested ? "col-span-2 my-1" : ""}>
        <Value value={value} />
      </dd>
    </>
  );
}

export default function AnalyticsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const qs = (() => {
    const p = new URLSearchParams();
    if (from) p.set("from", String(new Date(from).getTime()));
    if (to) p.set("to", String(new Date(to).getTime()));
    const s = p.toString();
    return s ? `?${s}` : "";
  })();

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Aggregated operational metrics."
      />

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <Field label="From" className="w-40">
          {(p) => (
            <Input
              {...p}
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          )}
        </Field>
        <Field label="To" className="w-40">
          {(p) => (
            <Input
              {...p}
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          )}
        </Field>
      </div>

      <div className="flex flex-col gap-6">
        {REPORTS.map((r) => (
          <AnalyticsCard key={r.key} title={r.key} path={`${r.path}${qs}`} />
        ))}
      </div>
    </>
  );
}

function AnalyticsCard({ title, path }: { title: string; path: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics", path],
    queryFn: async () => {
      const res = await api.get<unknown>(path);
      return res.data;
    },
  });

  return (
    <Card>
      <CardHeader title={title} />
      <CardBody>
        {error ? (
          <Alert tone="error">{errorMessage(error)}</Alert>
        ) : isLoading ? (
          <Spinner />
        ) : (
          <Value value={data} />
        )}
      </CardBody>
    </Card>
  );
}
