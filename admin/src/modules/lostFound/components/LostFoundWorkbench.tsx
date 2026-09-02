"use client";

import { useState } from "react";
import {
  Button,
  Field,
  Select,
  Input,
  Alert,
  Badge,
  Spinner,
  Card,
  CardHeader,
  CardBody,
} from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useUsers } from "@/modules/user/hooks/useUsers";
import { useLostFoundActions, useLostFoundMatches } from "../useLostFound";
import {
  LOST_FOUND_STATUSES,
  STATUS_TONE,
  type LostFoundItem,
} from "../lostFound.types";

function MatchRow({
  sourceId,
  matchId,
  title,
  onReturned,
}: {
  sourceId: string;
  matchId: string;
  title: string;
  onReturned: () => void;
}) {
  const { confirmReturn } = useLostFoundActions(sourceId);
  const [returnedTo, setReturnedTo] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <li className="rounded-[var(--radius-app)] border p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{title}</span>
        <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
          {open ? "Cancel" : "Confirm return"}
        </Button>
      </div>
      {open && (
        <div className="mt-2 flex items-end gap-2">
          <Field label="Returned to" className="flex-1">
            {(p) => (
              <Input
                {...p}
                value={returnedTo}
                onChange={(e) => setReturnedTo(e.target.value)}
                placeholder="Name of the person who collected it"
              />
            )}
          </Field>
          <Button
            size="sm"
            loading={confirmReturn.isPending}
            disabled={returnedTo.trim().length === 0}
            onClick={() =>
              confirmReturn.mutate(
                { matchId, returnedTo: returnedTo.trim() },
                { onSuccess: onReturned }
              )
            }
          >
            Confirm
          </Button>
        </div>
      )}
      {confirmReturn.isError && (
        <Alert tone="error" className="mt-2">
          {errorMessage(confirmReturn.error)}
        </Alert>
      )}
    </li>
  );
}

export function LostFoundWorkbench({ item }: { item: LostFoundItem }) {
  const a = useLostFoundActions(item._id);
  const usersQ = useUsers({ limit: 200 });
  const [showMatches, setShowMatches] = useState(false);
  const matchesQ = useLostFoundMatches(item._id, showMatches);

  const [assignee, setAssignee] = useState(item.assignedTo ?? "");
  const [status, setStatus] = useState(item.status);
  const [note, setNote] = useState("");

  const err = a.assign.error ?? a.update.error ?? a.close.error;
  const done = item.status === "CLOSED" || item.status === "RETURNED";

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader title="Manage" />
        <CardBody className="flex flex-col gap-4">
          {err != null && <Alert tone="error">{errorMessage(err)}</Alert>}

          <div className="flex items-end gap-2">
            <Field label="Assign to" className="flex-1">
              {(p) => (
                <Select
                  {...p}
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                >
                  <option value="">Select user…</option>
                  {(usersQ.data?.users ?? []).map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Button
              size="sm"
              loading={a.assign.isPending}
              disabled={done || !assignee}
              onClick={() => a.assign.mutate({ assigneeId: assignee })}
            >
              Assign
            </Button>
          </div>

          <div className="flex items-end gap-2 border-t pt-3">
            <Field label="Status" className="flex-1">
              {(p) => (
                <Select
                  {...p}
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as LostFoundItem["status"])
                  }
                >
                  {LOST_FOUND_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Note" className="flex-1">
              {(p) => (
                <Input
                  {...p}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              )}
            </Field>
            <Button
              size="sm"
              loading={a.update.isPending}
              disabled={
                done ||
                (status === item.status && note.trim().length === 0)
              }
              onClick={() =>
                a.update.mutate({
                  status: status !== item.status ? status : undefined,
                  note: note.trim() || undefined,
                })
              }
            >
              Update
            </Button>
          </div>

          <div className="border-t pt-3">
            <Button
              size="sm"
              variant="outline"
              loading={a.close.isPending}
              disabled={item.status === "CLOSED"}
              onClick={() => a.close.mutate(note.trim() || undefined)}
            >
              Close case
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Candidate matches"
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowMatches(true)}
            >
              Find matches
            </Button>
          }
        />
        <CardBody>
          {!showMatches ? (
            <p className="text-sm text-muted-foreground">
              Search for opposite-kind items on the same route within ±3 days.
            </p>
          ) : matchesQ.isLoading ? (
            <Spinner />
          ) : matchesQ.error ? (
            <Alert tone="error">{errorMessage(matchesQ.error)}</Alert>
          ) : (matchesQ.data?.matches ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No candidate matches found.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {(matchesQ.data?.matches ?? []).map((m) => (
                <MatchRow
                  key={m.item._id}
                  sourceId={item._id}
                  matchId={m.item._id}
                  title={`${m.item.kind} · ${m.item.title} · ${Math.round(
                    m.timeDeltaHours
                  )}h apart`}
                  onReturned={() => setShowMatches(true)}
                />
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {item.resolution && (
        <Card>
          <CardHeader title="Resolution" />
          <CardBody className="text-sm">
            <p>
              Returned to <strong>{item.resolution.returnedTo}</strong>
            </p>
            {item.resolution.confirmedAt && (
              <p className="text-xs text-muted-foreground">
                {new Date(item.resolution.confirmedAt).toLocaleString()}
              </p>
            )}
            {item.resolution.note && (
              <p className="mt-1 text-muted-foreground">
                {item.resolution.note}
              </p>
            )}
          </CardBody>
        </Card>
      )}

      <div>
        <Badge tone={STATUS_TONE[item.status]}>{item.status}</Badge>
      </div>
    </div>
  );
}
