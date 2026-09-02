"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { ServiceAlertForm } from "@/modules/serviceAlert/components/ServiceAlertForm";
import { useCreateServiceAlert } from "@/modules/serviceAlert/useServiceAlerts";

export default function NewServiceAlertPage() {
  const router = useRouter();
  const create = useCreateServiceAlert();

  return (
    <>
      <PageHeader title="New service alert" backHref="/service-alerts" />
      <ServiceAlertForm
        submitting={create.isPending}
        error={create.error}
        submitLabel="Save draft"
        onSubmit={(input) =>
          create.mutate(input, {
            onSuccess: (alert) =>
              router.replace(`/service-alerts/${alert._id}`),
          })
        }
      />
    </>
  );
}
