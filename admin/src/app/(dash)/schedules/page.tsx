"use client";

import { useMemo, useState } from "react";
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
import { useRoutes } from "@/modules/route/hooks/useRoutes";
import {
  useSchedules,
  useDeleteSchedule,
} from "@/modules/schedule/hooks/useSchedules";
import { DAY_LABELS, type Schedule } from "@/modules/schedule/constant/schedule.types";

export default function SchedulesPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [toDelete, setToDelete] = useState<Schedule | null>(null);

  const { data, isLoading, error, isFetching } = useSchedules({
    page,
    limit: 20,
    search: search || undefined,
  });
  const routesQ = useRoutes({ page: 1, limit: 200 });
  const del = useDeleteSchedule();

  const routeName = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of routesQ.data?.routes ?? [])
      m.set(r._id, r.routeNumber);
    return m;
  }, [routesQ.data?.routes]);

  const schedules = data?.schedules ?? [];
  const pg = data?.pagination;

  return (
    <>
      <PageHeader
        title="Schedules"
        description="Recurring timetables. Generate trip instances from a schedule for a date range."
        action={
          <Link href="/schedules/new">
            <Button>Add schedule</Button>
          </Link>
        }
      />

      <div className="mb-3 flex items-center gap-2">
        <Input
          placeholder="Search by name…"
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
      ) : schedules.length === 0 ? (
        <EmptyState
          title="No schedules"
          hint="Create a schedule for a route, then generate trips from it."
          action={
            <Link href="/schedules/new">
              <Button>Add schedule</Button>
            </Link>
          }
        />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Route</TH>
                <TH>Frequency</TH>
                <TH>Days</TH>
                <TH>Departures</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <tbody>
              {schedules.map((s) => (
                <TR key={s._id}>
                  <TD className="font-medium">
                    <Link
                      href={`/schedules/${s._id}`}
                      className="hover:underline"
                    >
                      {s.name}
                    </Link>
                  </TD>
                  <TD className="text-muted-foreground">
                    {routeName.get(s.route) ?? "—"}
                  </TD>
                  <TD className="text-muted-foreground">{s.frequencyType}</TD>
                  <TD className="text-xs text-muted-foreground">
                    {s.daysOfWeek.length
                      ? s.daysOfWeek
                          .slice()
                          .sort((a, b) => a - b)
                          .map((d) => DAY_LABELS[d])
                          .join(" ")
                      : "—"}
                  </TD>
                  <TD className="text-xs text-muted-foreground">
                    {s.departureTimes.slice(0, 4).join(", ")}
                    {s.departureTimes.length > 4
                      ? ` +${s.departureTimes.length - 4}`
                      : ""}
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
                        onClick={() => router.push(`/schedules/${s._id}`)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setToDelete(s)}
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
        title="Delete schedule"
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
        Schedule &quot;{toDelete?.name}&quot; will be removed. Already-generated
        trips are not deleted.
      </Modal>
    </>
  );
}
