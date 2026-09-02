"use client";

import { useState } from "react";
import { PageHeader, Field, Select, EmptyState } from "@/components/ui";
import { useVehicles } from "@/modules/vehicle/hooks/useVehicles";
import { MaintenanceSection } from "@/modules/maintenance/components/MaintenanceSection";
import { DocumentsSection } from "@/modules/maintenance/components/DocumentsSection";

export default function MaintenancePage() {
  const vehiclesQ = useVehicles({ page: 1, limit: 200 });
  const [vehicleId, setVehicleId] = useState("");

  return (
    <>
      <PageHeader
        title="Maintenance"
        description="Service records and statutory documents, per vehicle."
      />

      <div className="mb-6 max-w-sm">
        <Field label="Vehicle">
          {(p) => (
            <Select
              {...p}
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            >
              <option value="">Select a vehicle…</option>
              {(vehiclesQ.data?.vehicles ?? []).map((v) => (
                <option key={v._id} value={v._id}>
                  {v.registrationNumber}
                  {v.model ? ` — ${v.model}` : ""}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      {!vehicleId ? (
        <EmptyState
          title="Pick a vehicle"
          hint="Maintenance records and documents are tracked per vehicle."
        />
      ) : (
        <div className="grid gap-8 xl:grid-cols-2">
          <MaintenanceSection vehicleId={vehicleId} />
          <DocumentsSection vehicleId={vehicleId} />
        </div>
      )}
    </>
  );
}
