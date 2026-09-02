"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { VehicleForm } from "@/modules/vehicle/components/VehicleForm";
import { useCreateVehicle } from "@/modules/vehicle/hooks/useVehicles";

export default function NewVehiclePage() {
  const router = useRouter();
  const create = useCreateVehicle();

  return (
    <>
      <PageHeader title="Add vehicle" backHref="/vehicles" />
      <VehicleForm
        submitting={create.isPending}
        error={create.error}
        onSubmit={(input) =>
          create.mutate(input, {
            onSuccess: () => router.replace("/vehicles"),
          })
        }
      />
    </>
  );
}
