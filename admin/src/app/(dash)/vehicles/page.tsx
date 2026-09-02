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
  useVehicles,
  useDeleteVehicle,
} from "@/modules/vehicle/hooks/useVehicles";
import {
  VEHICLE_STATUSES,
  VEHICLE_STATUS_LABEL,
  type Vehicle,
  type VehicleStatus,
} from "@/modules/vehicle/constant/vehicle.types";

const statusTone: Record<VehicleStatus, "success" | "neutral" | "warning" | "danger"> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
  MAINTENANCE: "warning",
  RETIRED: "danger",
};

export default function VehiclesPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<VehicleStatus | "">("");
  const [toDelete, setToDelete] = useState<Vehicle | null>(null);

  const { data, isLoading, error, isFetching } = useVehicles({
    page,
    limit: 20,
    search: search || undefined,
    status: status || undefined,
  });
  const del = useDeleteVehicle();

  const vehicles = data?.vehicles ?? [];
  const pg = data?.pagination;

  return (
    <>
      <PageHeader
        title="Vehicles"
        description="Fleet register — capacity, status, route assignment."
        action={
          <Link href="/vehicles/new">
            <Button>Add vehicle</Button>
          </Link>
        }
      />

      <div className="mb-3 flex items-center gap-2">
        <Input
          placeholder="Search registration…"
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
            setStatus(e.target.value as VehicleStatus | "");
            setPage(1);
          }}
          className="max-w-[10rem]"
        >
          <option value="">All statuses</option>
          {VEHICLE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {VEHICLE_STATUS_LABEL[s]}
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
      ) : vehicles.length === 0 ? (
        <EmptyState
          title="No vehicles"
          hint="Add vehicles to your fleet register."
          action={
            <Link href="/vehicles/new">
              <Button>Add vehicle</Button>
            </Link>
          }
        />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Registration</TH>
                <TH>Type</TH>
                <TH>Capacity</TH>
                <TH>Route</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <tbody>
              {vehicles.map((v) => (
                <TR key={v._id}>
                  <TD className="font-medium">
                    <Link
                      href={`/vehicles/${v._id}`}
                      className="hover:underline"
                    >
                      {v.registrationNumber}
                    </Link>
                  </TD>
                  <TD className="text-muted-foreground">{v.type}</TD>
                  <TD>{v.capacity}</TD>
                  <TD className="text-muted-foreground">
                    {v.assignedRoute?.routeNumber ?? "—"}
                  </TD>
                  <TD>
                    <Badge tone={statusTone[v.status]}>
                      {VEHICLE_STATUS_LABEL[v.status]}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/vehicles/${v._id}`)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setToDelete(v)}
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
        title="Delete vehicle"
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
        Vehicle &quot;{toDelete?.registrationNumber}&quot; will be removed.
      </Modal>
    </>
  );
}
