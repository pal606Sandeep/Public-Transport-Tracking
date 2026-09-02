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
import { useComplaints } from "@/modules/complaint/useComplaints";
import {
  CATEGORY_LABEL,
  COMPLAINT_CATEGORIES,
  COMPLAINT_PRIORITIES,
  COMPLAINT_STATUSES,
  PRIORITY_TONE,
  STATUS_TONE,
  type ComplaintCategory,
  type ComplaintPriority,
  type ComplaintStatus,
} from "@/modules/complaint/complaint.types";

export default function ComplaintsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ComplaintStatus | "">("");
  const [category, setCategory] = useState<ComplaintCategory | "">("");
  const [priority, setPriority] = useState<ComplaintPriority | "">("");

  const { data, isLoading, error, isFetching } = useComplaints({
    page,
    limit: 20,
    status: status || undefined,
    category: category || undefined,
    priority: priority || undefined,
  });

  const complaints = data?.complaints ?? [];
  const pg = data?.pagination;

  return (
    <>
      <PageHeader
        title="Complaints"
        description="Passenger complaint queue — triage, assign, escalate, resolve."
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ComplaintStatus | "");
            setPage(1);
          }}
          className="max-w-[10rem]"
        >
          <option value="">All statuses</option>
          {COMPLAINT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value as ComplaintCategory | "");
            setPage(1);
          }}
          className="max-w-[12rem]"
        >
          <option value="">All categories</option>
          {COMPLAINT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </Select>
        <Select
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value as ComplaintPriority | "");
            setPage(1);
          }}
          className="max-w-[9rem]"
        >
          <option value="">All priorities</option>
          {COMPLAINT_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
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
      ) : complaints.length === 0 ? (
        <EmptyState
          title="No complaints"
          hint="Passenger complaints appear here for triage."
        />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Filed</TH>
                <TH>Subject</TH>
                <TH>Category</TH>
                <TH>Priority</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <tbody>
              {complaints.map((c) => (
                <TR key={c._id}>
                  <TD className="text-muted-foreground">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </TD>
                  <TD className="font-medium">
                    <Link
                      href={`/complaints/${c._id}`}
                      className="hover:underline"
                    >
                      {c.subject}
                    </Link>
                    {c.escalationLevel > 0 && (
                      <span className="ml-2 text-xs text-[var(--warning)]">
                        ↑{c.escalationLevel}
                      </span>
                    )}
                  </TD>
                  <TD className="text-muted-foreground">
                    {CATEGORY_LABEL[c.category] ?? c.category}
                  </TD>
                  <TD>
                    <Badge tone={PRIORITY_TONE[c.priority]}>{c.priority}</Badge>
                  </TD>
                  <TD>
                    <Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge>
                  </TD>
                  <TD className="text-right">
                    <Link href={`/complaints/${c._id}`}>
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
