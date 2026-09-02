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
import { useVehicles } from "@/modules/vehicle/hooks/useVehicles";
import { useDrivers } from "@/modules/driver/hooks/useDrivers";
import { useConductors } from "@/modules/conductor/hooks/useConductors";
import { useTripActions } from "../hooks/useTrips";
import { TRIP_STATUSES, type Trip } from "../constant/trip.types";

export function TripActionsPanel({ trip }: { trip: Trip }) {
  const a = useTripActions(trip._id);
  const vehiclesQ = useVehicles({ page: 1, limit: 200 });
  const driversQ = useDrivers({ page: 1, limit: 200 });
  const conductorsQ = useConductors({ page: 1, limit: 200 });

  const [driverId, setDriverId] = useState(trip.driver ?? "");
  const [vehicleId, setVehicleId] = useState(trip.vehicle ?? "");
  const [conductorId, setConductorId] = useState(trip.conductor ?? "");
  const [nextStatus, setNextStatus] = useState(trip.status);
  const [reason, setReason] = useState("");

  const anyError =
    a.assign.error ??
    a.transition.error ??
    a.cancel.error ??
    a.miss.error ??
    a.complete.error ??
    a.forceEnd.error;

  const terminal = ["COMPLETED", "CANCELLED", "MISSED"].includes(trip.status);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader title="Assign" />
        <CardBody className="flex flex-col gap-3">
          <Field label="Driver">
            {(p) => (
              <Select
                {...p}
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
              >
                <option value="">— none —</option>
                {(driversQ.data?.drivers ?? []).map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Vehicle">
            {(p) => (
              <Select
                {...p}
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
              >
                <option value="">— none —</option>
                {(vehiclesQ.data?.vehicles ?? []).map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.registrationNumber}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Conductor">
            {(p) => (
              <Select
                {...p}
                value={conductorId}
                onChange={(e) => setConductorId(e.target.value)}
              >
                <option value="">— none —</option>
                {(conductorsQ.data?.conductors ?? []).map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Button
            size="sm"
            loading={a.assign.isPending}
            disabled={terminal}
            onClick={() =>
              a.assign.mutate({
                driverId: driverId || null,
                vehicleId: vehicleId || null,
                conductorId: conductorId || null,
              })
            }
          >
            Save assignment
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Status" />
        <CardBody className="flex flex-col gap-3">
          <div className="flex items-end gap-2">
            <Field label="Transition to" className="flex-1">
              {(p) => (
                <Select
                  {...p}
                  value={nextStatus}
                  onChange={(e) =>
                    setNextStatus(e.target.value as Trip["status"])
                  }
                >
                  {TRIP_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Button
              size="sm"
              loading={a.transition.isPending}
              disabled={nextStatus === trip.status}
              onClick={() => a.transition.mutate(nextStatus)}
            >
              Apply
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 border-t pt-3">
            <Button
              size="sm"
              variant="outline"
              loading={a.complete.isPending}
              disabled={terminal}
              onClick={() => a.complete.mutate()}
            >
              Complete
            </Button>
            <Button
              size="sm"
              variant="outline"
              loading={a.miss.isPending}
              disabled={terminal}
              onClick={() => a.miss.mutate()}
            >
              Mark missed
            </Button>
            <Button
              size="sm"
              variant="outline"
              loading={a.forceEnd.isPending}
              onClick={() => a.forceEnd.mutate()}
            >
              Force end
            </Button>
          </div>

          <div className="flex items-end gap-2 border-t pt-3">
            <Field label="Cancel reason" className="flex-1">
              {(p) => (
                <Input
                  {...p}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why is this trip cancelled?"
                />
              )}
            </Field>
            <Button
              size="sm"
              variant="destructive"
              loading={a.cancel.isPending}
              disabled={terminal || reason.trim().length === 0}
              onClick={() => a.cancel.mutate(reason.trim())}
            >
              Cancel trip
            </Button>
          </div>

          {anyError != null && (
            <Alert tone="error">{errorMessage(anyError)}</Alert>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
