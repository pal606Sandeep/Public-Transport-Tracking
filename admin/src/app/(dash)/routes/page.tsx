"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  Button,
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
  Modal,
} from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import {
  useRoutes,
  useSetRouteStatus,
  useDeleteRoute,
} from "@/modules/route/hooks/useRoutes";
import type { Route } from "@/modules/route/constant/route.types";

export default function RoutesPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [toDelete, setToDelete] = useState<Route | null>(null);

  const { data, isLoading, error, isFetching } = useRoutes({
    page,
    limit: 20,
    search: search || undefined,
  });
  const setStatus = useSetRouteStatus();
  const del = useDeleteRoute();

  const routes = data?.routes ?? [];
  const pg = data?.pagination;

  return (
    <>
      <PageHeader
        title="Routes"
        description="Bus routes, their ordered stops and map geometry."
        action={
          <Link href="/routes/new">
            <Button>Add route</Button>
          </Link>
        }
      />

      <div className="mb-3 flex items-center gap-2">
        <Input
          placeholder="Search by number or name…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        {isFetching && <Spinner />}
      </div>

      {error ? (
        <Alert tone="error">{errorMessage(error)}</Alert>
      ) : isLoading ? (
        <div className="py-16 text-center">
          <Spinner className="h-6 w-6" />
        </div>
      ) : routes.length === 0 ? (
        <EmptyState
          title="No routes"
          hint="Create a route, then add its stops in travel order."
          action={
            <Link href="/routes/new">
              <Button>Add route</Button>
            </Link>
          }
        />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Number</TH>
                <TH>Name</TH>
                <TH>Stops</TH>
                <TH>Distance</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <tbody>
              {routes.map((r) => (
                <TR key={r._id}>
                  <TD className="font-medium">
                    <Link href={`/routes/${r._id}`} className="hover:underline">
                      {r.routeNumber}
                    </Link>
                  </TD>
                  <TD className="text-muted-foreground">{r.name || "—"}</TD>
                  <TD>{r.orderedStops?.length ?? 0}</TD>
                  <TD className="text-muted-foreground">
                    {r.distanceKm != null ? `${r.distanceKm} km` : "—"}
                  </TD>
                  <TD>
                    {r.status === "ACTIVE" ? (
                      <Badge tone="success">Active</Badge>
                    ) : (
                      <Badge tone="neutral">Inactive</Badge>
                    )}
                  </TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/routes/${r._id}`)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={
                          setStatus.isPending &&
                          setStatus.variables?.id === r._id
                        }
                        onClick={() =>
                          setStatus.mutate({
                            id: r._id,
                            status:
                              r.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                          })
                        }
                      >
                        {r.status === "ACTIVE" ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setToDelete(r)}
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
        title="Delete route"
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
        Route &quot;{toDelete?.routeNumber}&quot; will be removed. Trips and
        tickets referencing it may break.
      </Modal>
    </>
  );
}
