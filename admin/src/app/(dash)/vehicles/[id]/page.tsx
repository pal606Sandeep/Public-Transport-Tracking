"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, FullScreenLoader, Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { VehicleForm } from "@/modules/vehicle/components/VehicleForm";
import {
  useVehicle,
  useUpdateVehicle,
} from "@/modules/vehicle/hooks/useVehicles";

export default function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: vehicle, isLoading, error } = useVehicle(id);
  const update = useUpdateVehicle(id);

  if (isLoading) return <FullScreenLoader />;
  if (error || !vehicle)
    return (
      <>
        <PageHeader title="Vehicle" backHref="/vehicles" />
        <Alert tone="error">{errorMessage(error) || "Vehicle not found"}</Alert>
      </>
    );

  return (
    <>
      <PageHeader
        title={vehicle.registrationNumber}
        description="Edit vehicle"
        backHref="/vehicles"
      />
      <VehicleForm
        vehicle={vehicle}
        submitting={update.isPending}
        error={update.error}
        onSubmit={(input) =>
          update.mutate(input, {
            onSuccess: () => router.push("/vehicles"),
          })
        }
      />
    </>
  );
}
