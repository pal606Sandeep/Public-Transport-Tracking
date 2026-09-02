"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  PageHeader,
  Field,
  Select,
  Input,
  Button,
  Alert,
  Spinner,
  Table,
  THead,
  TR,
  TH,
  TD,
} from "@/components/ui";
import { api } from "@/utils/apiClient";
import { API_BASE_URL } from "@/config/env.config";
import { getAccessToken } from "@/lib/auth/tokenStore";
import { errorMessage } from "@/lib/error/apiError";

const REPORT_TYPES = [
  "vehicles",
  "drivers",
  "conductors",
  "routes",
  "stops",
  "trips",
  "passengers",
  "tickets",
  "payments",
  "revenue",
  "complaints",
  "maintenance",
  "incidents",
] as const;

interface ReportTable {
  type: string;
  columns: string[];
  rows: (string | number)[][];
}

async function downloadReport(type: string, format: "csv" | "pdf", qs: string) {
  const res = await fetch(
    `${API_BASE_URL}/admin/reports/${type}/export.${format}${qs}`,
    {
      credentials: "include",
      headers: {
        ...(getAccessToken()
          ? { Authorization: `Bearer ${getAccessToken()}` }
          : {}),
      },
    }
  );
  if (!res.ok) throw new Error(`Export failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${type}-report.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [type, setType] = useState<(typeof REPORT_TYPES)[number]>("trips");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [dl, setDl] = useState<string | null>(null);

  const qs = (() => {
    const p = new URLSearchParams();
    if (from) p.set("from", String(new Date(from).getTime()));
    if (to) p.set("to", String(new Date(to).getTime()));
    const s = p.toString();
    return s ? `?${s}` : "";
  })();

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["report", type, qs],
    queryFn: async () => {
      const res = await api.get<ReportTable>(`/admin/reports/${type}${qs}`);
      return res.data as ReportTable;
    },
  });

  const runDownload = async (format: "csv" | "pdf") => {
    setDl(null);
    try {
      await downloadReport(type, format, qs);
    } catch (e) {
      setDl(errorMessage(e));
    }
  };

  return (
    <>
      <PageHeader
        title="Reports"
        description="Tabular exports across the system."
      />

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <Field label="Report" className="w-48">
          {(p) => (
            <Select
              {...p}
              value={type}
              onChange={(e) =>
                setType(e.target.value as (typeof REPORT_TYPES)[number])
              }
            >
              {REPORT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          )}
        </Field>
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
        <Button variant="outline" onClick={() => runDownload("csv")}>
          CSV
        </Button>
        <Button variant="outline" onClick={() => runDownload("pdf")}>
          PDF
        </Button>
        {isFetching && <Spinner />}
      </div>

      {dl && (
        <Alert tone="error" className="mb-4">
          {dl}
        </Alert>
      )}

      {error ? (
        <Alert tone="error">{errorMessage(error)}</Alert>
      ) : isLoading ? (
        <div className="py-16 text-center">
          <Spinner className="h-6 w-6" />
        </div>
      ) : !data || data.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No rows for this report / range.
        </p>
      ) : (
        <>
          <p className="mb-2 text-xs text-muted-foreground">
            {data.rows.length} row{data.rows.length === 1 ? "" : "s"}
          </p>
          <Table>
            <THead>
              <TR>
                {data.columns.map((c) => (
                  <TH key={c}>{c}</TH>
                ))}
              </TR>
            </THead>
            <tbody>
              {data.rows.slice(0, 200).map((row, i) => (
                <TR key={i}>
                  {row.map((cell, j) => (
                    <TD key={j} className="text-muted-foreground">
                      {String(cell)}
                    </TD>
                  ))}
                </TR>
              ))}
            </tbody>
          </Table>
          {data.rows.length > 200 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Showing first 200 rows — download for the full set.
            </p>
          )}
        </>
      )}
    </>
  );
}
