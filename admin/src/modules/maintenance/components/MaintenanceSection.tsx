"use client";

import { useState } from "react";
import {
  Button,
  Field,
  Input,
  Select,
  Textarea,
  Alert,
  Badge,
  Spinner,
  Modal,
  Table,
  THead,
  TR,
  TH,
  TD,
  Card,
  CardHeader,
  CardBody,
} from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import {
  MAINTENANCE_TYPES,
  type MaintenanceStatus,
  type MaintenanceType,
} from "../maintenance.types";
import {
  useMaintenanceRecords,
  useMaintenanceMutations,
} from "../useMaintenance";

const statusTone: Record<
  MaintenanceStatus,
  "neutral" | "info" | "success" | "danger"
> = {
  SCHEDULED: "neutral",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  CANCELLED: "danger",
};

export function MaintenanceSection({ vehicleId }: { vehicleId: string }) {
  const { data, isLoading, error } = useMaintenanceRecords(vehicleId);
  const m = useMaintenanceMutations(vehicleId);
  const [open, setOpen] = useState(false);

  const [type, setType] = useState<MaintenanceType>("SERVICE");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [cost, setCost] = useState("");
  const [odometerKm, setOdometerKm] = useState("");
  const [provider, setProvider] = useState("");

  const reset = () => {
    setType("SERVICE");
    setTitle("");
    setDescription("");
    setScheduledDate("");
    setCost("");
    setOdometerKm("");
    setProvider("");
  };

  const submit = () => {
    m.create.mutate(
      {
        type,
        title: title.trim(),
        description: description.trim() || null,
        scheduledDate: scheduledDate
          ? new Date(scheduledDate).toISOString()
          : null,
        cost: cost ? Number(cost) : null,
        odometerKm: odometerKm ? Number(odometerKm) : null,
        provider: provider.trim() || null,
      },
      {
        onSuccess: () => {
          setOpen(false);
          reset();
        },
      }
    );
  };

  const records = data?.records ?? [];

  return (
    <Card>
      <CardHeader
        title="Maintenance records"
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            Add
          </Button>
        }
      />
      <CardBody>
        {error ? (
          <Alert tone="error">{errorMessage(error)}</Alert>
        ) : isLoading ? (
          <Spinner />
        ) : records.length === 0 ? (
          <p className="text-sm text-muted-foreground">No maintenance records.</p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Type</TH>
                <TH>Title</TH>
                <TH>Scheduled</TH>
                <TH>Cost</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <tbody>
              {records.map((r) => (
                <TR key={r._id}>
                  <TD className="text-muted-foreground">{r.type}</TD>
                  <TD className="font-medium">{r.title}</TD>
                  <TD className="text-muted-foreground">
                    {r.scheduledDate
                      ? new Date(r.scheduledDate).toLocaleDateString()
                      : "—"}
                  </TD>
                  <TD className="text-muted-foreground">
                    {r.cost != null ? r.cost : "—"}
                  </TD>
                  <TD>
                    <Badge tone={statusTone[r.status]}>{r.status}</Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-2">
                      {r.status !== "COMPLETED" &&
                        r.status !== "CANCELLED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            loading={
                              m.complete.isPending &&
                              m.complete.variables === r._id
                            }
                            onClick={() => m.complete.mutate(r._id)}
                          >
                            Complete
                          </Button>
                        )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        loading={
                          m.remove.isPending && m.remove.variables === r._id
                        }
                        onClick={() => m.remove.mutate(r._id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </CardBody>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add maintenance record"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              loading={m.create.isPending}
              disabled={title.trim().length === 0}
              onClick={submit}
            >
              Create
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {m.create.isError && (
            <Alert tone="error">{errorMessage(m.create.error)}</Alert>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              {(p) => (
                <Select
                  {...p}
                  value={type}
                  onChange={(e) => setType(e.target.value as MaintenanceType)}
                >
                  {MAINTENANCE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Scheduled date">
              {(p) => (
                <Input
                  {...p}
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              )}
            </Field>
          </div>
          <Field label="Title">
            {(p) => (
              <Input
                {...p}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            )}
          </Field>
          <Field label="Description">
            {(p) => (
              <Textarea
                {...p}
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            )}
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Cost">
              {(p) => (
                <Input
                  {...p}
                  type="number"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                />
              )}
            </Field>
            <Field label="Odometer km">
              {(p) => (
                <Input
                  {...p}
                  type="number"
                  value={odometerKm}
                  onChange={(e) => setOdometerKm(e.target.value)}
                />
              )}
            </Field>
            <Field label="Provider">
              {(p) => (
                <Input
                  {...p}
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                />
              )}
            </Field>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
