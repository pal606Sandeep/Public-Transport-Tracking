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
import { useDrivers, useDeleteDriver } from "@/modules/driver/hooks/useDrivers";
import {
  DRIVER_STATUSES,
  type Driver,
  type DriverStatus,
} from "@/modules/driver/constant/driver.types";

const statusTone: Record<
  DriverStatus,
  "success" | "neutral" | "warning" | "danger"
> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
  ON_LEAVE: "warning",
  SUSPENDED: "danger",
};

export default function DriversPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DriverStatus | "">("");
  const [toDelete, setToDelete] = useState<Driver | null>(null);

  const { data, isLoading, error, isFetching } = useDrivers({
    page,
    limit: 20,
    search: search || undefined,
    status: status || undefined,
  });
  const del = useDeleteDriver();

  const drivers = data?.drivers ?? [];
  const pg = data?.pagination;

  return (
    <>
      <PageHeader
        title="Drivers"
        description="Driver register — licences, shifts, vehicle/route assignment."
        action={
          <Link href="/drivers/new">
            <Button>Add driver</Button>
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
            setStatus(e.target.value as DriverStatus | "");
            setPage(1);
          }}
          className="max-w-[10rem]"
        >
          <option value="">All statuses</option>
          {DRIVER_STATUSES.map((s) => (
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
      ) : drivers.length === 0 ? (
        <EmptyState
          title="No drivers"
          hint="Add a driver record and link it to a registered DRIVER user account."
          action={
            <Link href="/drivers/new">
              <Button>Add driver</Button>
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
                <TH>Licence</TH>
                <TH>Shift</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <tbody>
              {drivers.map((d) => (
                <TR key={d._id}>
                  <TD className="font-medium">
                    <Link
                      href={`/drivers/${d._id}`}
                      className="hover:underline"
                    >
                      {d.name}
                    </Link>
                  </TD>
                  <TD className="text-muted-foreground">{d.employeeId}</TD>
                  <TD className="text-muted-foreground">{d.licenseNumber}</TD>
                  <TD className="text-muted-foreground">{d.shift?.type ?? "—"}</TD>
                  <TD>
                    <Badge tone={statusTone[d.status]}>
                      {d.status.replace("_", " ")}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/drivers/${d._id}`)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setToDelete(d)}
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
        title="Delete driver"
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
        Driver &quot;{toDelete?.name}&quot; will be removed. The linked user
        account is not deleted.
      </Modal>
    </>
  );
}
