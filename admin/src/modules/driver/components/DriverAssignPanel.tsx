"use client";

import { useState } from "react";
import {
  Button,
  Field,
  Select,
  Alert,
  Card,
  CardHeader,
  CardBody,
} from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useRoutes } from "@/modules/route/hooks/useRoutes";
import { useVehicles } from "@/modules/vehicle/hooks/useVehicles";
import { useSchedules } from "@/modules/schedule/hooks/useSchedules";
import { useAssignDriver } from "../hooks/useDrivers";
import type { Driver } from "../constant/driver.types";

export function DriverAssignPanel({ driver }: { driver: Driver }) {
  const assign = useAssignDriver(driver._id);
  const routesQ = useRoutes({ page: 1, limit: 200 });
  const vehiclesQ = useVehicles({ page: 1, limit: 200 });
  const schedulesQ = useSchedules({ page: 1, limit: 200 });

  const [vehicleId, setVehicleId] = useState(driver.assigned.vehicleId ?? "");
  const [routeId, setRouteId] = useState(driver.assigned.routeId ?? "");
  const [scheduleId, setScheduleId] = useState(
    driver.assigned.scheduleId ?? ""
  );

  return (
    <Card>
      <CardHeader title="Assignment" />
      <CardBody className="flex flex-col gap-3">
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

        <Field label="Route">
          {(p) => (
            <Select
              {...p}
              value={routeId}
              onChange={(e) => setRouteId(e.target.value)}
            >
              <option value="">— none —</option>
              {(routesQ.data?.routes ?? []).map((r) => (
                <option key={r._id} value={r._id}>
                  {r.routeNumber}
                  {r.name ? ` — ${r.name}` : ""}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Schedule">
          {(p) => (
            <Select
              {...p}
              value={scheduleId}
              onChange={(e) => setScheduleId(e.target.value)}
            >
              <option value="">— none —</option>
              {(schedulesQ.data?.schedules ?? []).map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {assign.isError && (
          <Alert tone="error">{errorMessage(assign.error)}</Alert>
        )}
        {assign.isSuccess && <Alert tone="success">Assignment saved.</Alert>}

        <Button
          size="sm"
          loading={assign.isPending}
          onClick={() =>
            assign.mutate({
              vehicleId: vehicleId || null,
              routeId: routeId || null,
              scheduleId: scheduleId || null,
            })
          }
        >
          Save assignment
        </Button>
      </CardBody>
    </Card>
  );
}
