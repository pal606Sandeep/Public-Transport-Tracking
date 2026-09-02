"use client";

import { useState } from "react";
import {
  Button,
  Field,
  Select,
  Input,
  Alert,
  Card,
  CardHeader,
  CardBody,
} from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useUsers } from "@/modules/user/hooks/useUsers";
import { useIncidentActions } from "../hooks/useIncidents";
import type { Incident } from "../constant/incident.types";

export function IncidentWorkflow({ incident }: { incident: Incident }) {
  const a = useIncidentActions(incident._id);
  const usersQ = useUsers({ limit: 200 });
  const [assignee, setAssignee] = useState("");
  const [note, setNote] = useState("");

  const err =
    a.acknowledge.error ??
    a.assign.error ??
    a.resolve.error ??
    a.close.error;
  const done = incident.status === "CLOSED";

  return (
    <Card>
      <CardHeader title="Workflow" />
      <CardBody className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            loading={a.acknowledge.isPending}
            disabled={done || incident.status !== "OPEN"}
            onClick={() => a.acknowledge.mutate()}
          >
            Acknowledge
          </Button>
          <Button
            size="sm"
            variant="outline"
            loading={a.close.isPending}
            disabled={done}
            onClick={() => a.close.mutate()}
          >
            Close
          </Button>
        </div>

        <div className="flex items-end gap-2 border-t pt-3">
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
            onClick={() => a.assign.mutate(assignee)}
          >
            Assign
          </Button>
        </div>

        <div className="flex items-end gap-2 border-t pt-3">
          <Field label="Resolution note" className="flex-1">
            {(p) => (
              <Input
                {...p}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What was done?"
              />
            )}
          </Field>
          <Button
            size="sm"
            loading={a.resolve.isPending}
            disabled={done || incident.status === "RESOLVED"}
            onClick={() => a.resolve.mutate(note.trim() || undefined)}
          >
            Resolve
          </Button>
        </div>

        {err != null && <Alert tone="error">{errorMessage(err)}</Alert>}
      </CardBody>
    </Card>
  );
}
