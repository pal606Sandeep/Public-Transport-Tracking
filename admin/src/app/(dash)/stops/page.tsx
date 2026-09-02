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
  useStops,
  useDeactivateStop,
  useDeleteStop,
} from "@/modules/stop/hooks/useStops";
import type { Stop } from "@/modules/stop/constant/stop.types";

export default function StopsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [confirm, setConfirm] = useState<{ stop: Stop; mode: "deactivate" | "delete" } | null>(
    null
  );

  const { data, isLoading, error, isFetching } = useStops({
    page,
    limit: 20,
    search: search || undefined,
  });
  const deactivate = useDeactivateStop();
  const del = useDeleteStop();

  const stops = data?.stops ?? [];
  const pg = data?.pagination;

  const runConfirm = async () => {
    if (!confirm) return;
    if (confirm.mode === "deactivate") await deactivate.mutateAsync(confirm.stop._id);
    else await del.mutateAsync(confirm.stop._id);
    setConfirm(null);
  };

  return (
    <>
      <PageHeader
        title="Stops"
        description="Bus stops shown in the passenger app and used for route sequencing."
        action={
          <Link href="/stops/new">
            <Button>Add stop</Button>
          </Link>
        }
      />

      <div className="mb-3 flex items-center gap-2">
        <Input
          placeholder="Search by name or code…"
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
      ) : stops.length === 0 ? (
        <EmptyState
          title="No stops"
          hint="Create your first stop — the passenger map and journey planner need stops to work."
          action={
            <Link href="/stops/new">
              <Button>Add stop</Button>
            </Link>
          }
        />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Code</TH>
                <TH>Coordinates</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <tbody>
              {stops.map((s) => (
                <TR key={s._id}>
                  <TD className="font-medium">
                    <Link href={`/stops/${s._id}`} className="hover:underline">
                      {s.name}
                    </Link>
                  </TD>
                  <TD className="text-muted-foreground">{s.code || "—"}</TD>
                  <TD className="font-mono text-xs text-muted-foreground">
                    {s.location?.coordinates
                      ? `${s.location.coordinates[1].toFixed(5)}, ${s.location.coordinates[0].toFixed(5)}`
                      : "—"}
                  </TD>
                  <TD>
                    {s.isActive ? (
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
                        onClick={() => router.push(`/stops/${s._id}`)}
                      >
                        Edit
                      </Button>
                      {s.isActive && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setConfirm({ stop: s, mode: "deactivate" })
                          }
                        >
                          Deactivate
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setConfirm({ stop: s, mode: "delete" })}
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
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={
          confirm?.mode === "delete" ? "Delete stop" : "Deactivate stop"
        }
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              loading={deactivate.isPending || del.isPending}
              onClick={runConfirm}
            >
              {confirm?.mode === "delete" ? "Delete" : "Deactivate"}
            </Button>
          </>
        }
      >
        {confirm?.mode === "delete"
          ? `"${confirm?.stop.name}" will be removed. Routes referencing it may break.`
          : `"${confirm?.stop.name}" will be hidden from the passenger app.`}
      </Modal>
    </>
  );
}
