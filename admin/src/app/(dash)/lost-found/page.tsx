"use client";

import { useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  Select,
  Alert,
  Badge,
  Button,
  Spinner,
  EmptyState,
  Pagination,
  Table,
  THead,
  TR,
  TH,
  TD,
} from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useLostFoundList } from "@/modules/lostFound/useLostFound";
import {
  LOST_FOUND_STATUSES,
  STATUS_TONE,
  type LostFoundKind,
  type LostFoundStatus,
} from "@/modules/lostFound/lostFound.types";

export default function LostFoundPage() {
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState<LostFoundKind | "">("");
  const [status, setStatus] = useState<LostFoundStatus | "">("");

  const { data, isLoading, error, isFetching } = useLostFoundList({
    page,
    limit: 20,
    kind: kind || undefined,
    status: status || undefined,
  });

  const items = data?.items ?? [];
  const pg = data?.pagination;

  return (
    <>
      <PageHeader
        title="Lost & found"
        description="Reported lost and found items — match, assign, confirm returns."
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select
          value={kind}
          onChange={(e) => {
            setKind(e.target.value as LostFoundKind | "");
            setPage(1);
          }}
          className="max-w-[9rem]"
        >
          <option value="">All kinds</option>
          <option value="LOST">Lost</option>
          <option value="FOUND">Found</option>
        </Select>
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as LostFoundStatus | "");
            setPage(1);
          }}
          className="max-w-[10rem]"
        >
          <option value="">All statuses</option>
          {LOST_FOUND_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        {isFetching && <Spinner />}
      </div>

      {error ? (
        <Alert tone="error">{errorMessage(error)}</Alert>
      ) : isLoading ? (
        <div className="py-16 text-center">
          <Spinner className="h-6 w-6" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Nothing reported"
          hint="Lost and found reports from passengers appear here."
        />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Occurred</TH>
                <TH>Kind</TH>
                <TH>Title</TH>
                <TH>Category</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <tbody>
              {items.map((it) => (
                <TR key={it._id}>
                  <TD className="text-muted-foreground">
                    {new Date(it.occurredAt).toLocaleDateString()}
                  </TD>
                  <TD>
                    <Badge tone={it.kind === "LOST" ? "danger" : "info"}>
                      {it.kind}
                    </Badge>
                  </TD>
                  <TD className="font-medium">
                    <Link
                      href={`/lost-found/${it._id}`}
                      className="hover:underline"
                    >
                      {it.title}
                    </Link>
                  </TD>
                  <TD className="text-muted-foreground">
                    {it.category || "—"}
                  </TD>
                  <TD>
                    <Badge tone={STATUS_TONE[it.status]}>{it.status}</Badge>
                  </TD>
                  <TD className="text-right">
                    <Link href={`/lost-found/${it._id}`}>
                      <Button size="sm" variant="outline">
                        Open
                      </Button>
                    </Link>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
          {pg && (
            <Pagination
              page={pg.page}
              totalPages={pg.totalPages ?? 1}
              onPage={setPage}
            />
          )}
        </>
      )}
    </>
  );
}
