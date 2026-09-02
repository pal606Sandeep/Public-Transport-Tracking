"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { DriverForm } from "@/modules/driver/components/DriverForm";
import { useCreateDriver } from "@/modules/driver/hooks/useDrivers";

export default function NewDriverPage() {
  const router = useRouter();
  const create = useCreateDriver();

  return (
    <>
      <PageHeader
        title="Add driver"
        description="Link a registered DRIVER user, then set assignment on the next screen."
        backHref="/drivers"
      />
      <DriverForm
        submitting={create.isPending}
        error={create.error}
        onSubmit={(input) =>
          create.mutate(input, {
            onSuccess: (driver) => router.replace(`/drivers/${driver._id}`),
          })
        }
      />
    </>
  );
}
