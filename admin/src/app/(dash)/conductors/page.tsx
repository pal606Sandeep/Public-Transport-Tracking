"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  Button,
  Input,
  Select,
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
  Modal,
} from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import {
  useConductors,
  useDeleteConductor,
} from "@/modules/conductor/hooks/useConductors";
import {
  CONDUCTOR_STATUSES,
  type Conductor,
  type ConductorStatus,
} from "@/modules/conductor/constant/conductor.types";

const statusTone: Record<
  ConductorStatus,
  "success" | "neutral" | "warning" | "danger"
> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
  ON_LEAVE: "warning",
  SUSPENDED: "danger",
};

export default function ConductorsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ConductorStatus | "">("");
  const [toDelete, setToDelete] = useState<Conductor | null>(null);

  const { data, isLoading, error, isFetching } = useConductors({
    page,
    limit: 20,
    search: search || undefined,
    status: status || undefined,
  });
  const del = useDeleteConductor();

  const conductors = data?.conductors ?? [];
  const pg = data?.pagination;

  return (
    <>
      <PageHeader
        title="Conductors"
        description="Conductor register — shifts, assignment, sales totals."
        action={
          <Link href="/conductors/new">
            <Button>Add conductor</Button>
          </Link>
        }
      />

      <div className="mb-3 flex items-center gap-2">
        <Input
          placeholder="Search name / employee ID…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ConductorStatus | "");
            setPage(1);
          }}
          className="max-w-[10rem]"
        >
          <option value="">All statuses</option>
          {CONDUCTOR_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
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
      ) : conductors.length === 0 ? (
        <EmptyState
          title="No conductors"
          hint="Add a conductor record and link it to a registered CONDUCTOR user account."
          action={
            <Link href="/conductors/new">
              <Button>Add conductor</Button>
            </Link>
          }
        />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Employee ID</TH>
                <TH>Shift</TH>
                <TH>Tickets</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <tbody>
              {conductors.map((c) => (
                <TR key={c._id}>
                  <TD className="font-medium">
                    <Link
                      href={`/conductors/${c._id}`}
                      className="hover:underline"
                    >
                      {c.name}
                    </Link>
                  </TD>
                  <TD className="text-muted-foreground">{c.employeeId}</TD>
                  <TD className="text-muted-foreground">
                    {c.shift?.type ?? "—"}
                  </TD>
                  <TD className="text-muted-foreground">{c.ticketSales}</TD>
                  <TD>
                    <Badge tone={statusTone[c.status]}>
                      {c.status.replace("_", " ")}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/conductors/${c._id}`)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setToDelete(c)}
                      >
                        Delete
                      </Button>
                    </div>
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

      <Modal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Delete conductor"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              loading={del.isPending}
              onClick={async () => {
                if (toDelete) await del.mutateAsync(toDelete._id);
                setToDelete(null);
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        Conductor &quot;{toDelete?.name}&quot; will be removed. The linked user
        account is not deleted.
      </Modal>
    </>
  );
}
