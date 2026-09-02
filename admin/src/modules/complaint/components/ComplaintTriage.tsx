"use client";

import { useState } from "react";
import {
  Button,
  Field,
  Select,
  Input,
  Textarea,
  Alert,
  Card,
  CardHeader,
  CardBody,
} from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useUsers } from "@/modules/user/hooks/useUsers";
import { useComplaintActions } from "../useComplaints";
import {
  COMPLAINT_PRIORITIES,
  COMPLAINT_STATUSES,
  type Complaint,
} from "../complaint.types";

export function ComplaintTriage({ complaint }: { complaint: Complaint }) {
  const a = useComplaintActions(complaint._id);
  const usersQ = useUsers({ limit: 200 });

  const [assignee, setAssignee] = useState(complaint.assignedTo ?? "");
  const [priority, setPriority] = useState(complaint.priority);
  const [status, setStatus] = useState(complaint.status);
  const [note, setNote] = useState("");
  const [escalateReason, setEscalateReason] = useState("");
  const [resolveNote, setResolveNote] = useState("");

  const err =
    a.assign.error ??
    a.update.error ??
    a.escalate.error ??
    a.resolve.error ??
    a.close.error;
  const done = complaint.status === "CLOSED";

  return (
    <Card>
      <CardHeader title="Triage" />
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

        <div className="grid grid-cols-2 gap-3 border-t pt-3">
          <Field label="Priority">
            {(p) => (
              <Select
                {...p}
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as Complaint["priority"])
                }
              >
                {COMPLAINT_PRIORITIES.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Status">
            {(p) => (
              <Select
                {...p}
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as Complaint["status"])
                }
              >
                {COMPLAINT_STATUSES.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Note" className="col-span-2">
            {(p) => (
              <Input
                {...p}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note for this change"
              />
            )}
          </Field>
          <div className="col-span-2">
            <Button
              size="sm"
              loading={a.update.isPending}
              disabled={
                done ||
                (priority === complaint.priority &&
                  status === complaint.status &&
                  note.trim().length === 0)
              }
              onClick={() =>
                a.update.mutate({
                  priority:
                    priority !== complaint.priority ? priority : undefined,
                  status: status !== complaint.status ? status : undefined,
                  note: note.trim() || undefined,
                })
              }
            >
              Update
            </Button>
          </div>
        </div>

        <div className="flex items-end gap-2 border-t pt-3">
          <Field label="Escalate — reason" className="flex-1">
            {(p) => (
              <Input
                {...p}
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
              />
            )}
          </Field>
          <Button
            size="sm"
            variant="outline"
            loading={a.escalate.isPending}
            disabled={done || escalateReason.trim().length < 3}
            onClick={() =>
              a.escalate.mutate({
                reason: escalateReason.trim(),
                assigneeId: assignee || undefined,
              })
            }
          >
            Escalate
          </Button>
        </div>

        <div className="flex items-end gap-2 border-t pt-3">
          <Field label="Resolve — note" className="flex-1">
            {(p) => (
              <Textarea
                {...p}
                rows={2}
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
              />
            )}
          </Field>
          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              loading={a.resolve.isPending}
              disabled={done || resolveNote.trim().length < 3}
              onClick={() => a.resolve.mutate(resolveNote.trim())}
            >
              Resolve
            </Button>
            <Button
              size="sm"
              variant="outline"
              loading={a.close.isPending}
              disabled={done}
              onClick={() => a.close.mutate(resolveNote.trim() || undefined)}
            >
              Close
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
