"use client";

import { useState } from "react";
import {
  PageHeader,
  Button,
  Select,
  Input,
  Alert,
  Badge,
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
import {
  useAssignmentRequests,
  useDecideAssignmentRequest,
} from "@/modules/assignmentRequest/useAssignmentRequests";
import type {
  AssignmentRequest,
  AssignmentRequestStatus,
} from "@/modules/assignmentRequest/assignmentRequest.service";

const tone: Record<AssignmentRequestStatus, "warning" | "success" | "danger"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

function Row({ req }: { req: AssignmentRequest }) {
  const decide = useDecideAssignmentRequest();
  const [note, setNote] = useState("");
  const pending = req.status === "PENDING";

  return (
    <TR>
      <TD>{new Date(req.requestedDate).toLocaleDateString()}</TD>
      <TD className="text-muted-foreground">{req.staffType}</TD>
      <TD className="max-w-xs truncate text-muted-foreground">
        {req.reason || "—"}
      </TD>
      <TD>
        <Badge tone={tone[req.status]}>{req.status}</Badge>
        {req.note && (
          <span className="ml-2 text-xs text-muted-foreground">{req.note}</span>
        )}
      </TD>
      <TD className="text-right">
        {pending ? (
          <div className="flex items-center justify-end gap-2">
            <Input
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-8 max-w-[12rem] text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              loading={
                decide.isPending && decide.variables?.decision === "APPROVE"
              }
              onClick={() =>
                decide.mutate({
                  id: req._id,
                  decision: "APPROVE",
                  note: note.trim() || undefined,
                })
              }
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              loading={
                decide.isPending && decide.variables?.decision === "REJECT"
              }
              onClick={() =>
                decide.mutate({
                  id: req._id,
                  decision: "REJECT",
                  note: note.trim() || undefined,
                })
              }
            >
              Reject
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">
            {new Date(req.createdAt).toLocaleDateString()}
          </span>
        )}
      </TD>
    </TR>
  );
}

export default function AssignmentRequestsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<AssignmentRequestStatus | "">("PENDING");

  const { data, isLoading, error, isFetching } = useAssignmentRequests({
    page,
    limit: 20,
    status: status || undefined,
  });

  const requests = data?.requests ?? [];
  const pg = data?.pagination;

  return (
    <>
      <PageHeader
        title="Assignment requests"
        description="Drivers and conductors requesting a shift assignment for a date."
      />

      <div className="mb-3 flex items-center gap-2">
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as AssignmentRequestStatus | "");
            setPage(1);
          }}
          className="max-w-[10rem]"
        >
          <option value="">All</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </Select>
        {isFetching && <Spinner />}
      </div>

      {error ? (
        <Alert tone="error">{errorMessage(error)}</Alert>
      ) : isLoading ? (
        <div className="py-16 text-center">
          <Spinner className="h-6 w-6" />
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          title="Nothing here"
          hint="Assignment requests raised from the driver/conductor app show up here."
        />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Requested date</TH>
                <TH>Staff</TH>
                <TH>Reason</TH>
                <TH>Status</TH>
                <TH className="text-right">Decision</TH>
              </TR>
            </THead>
            <tbody>
              {requests.map((r) => (
                <Row key={r._id} req={r} />
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
