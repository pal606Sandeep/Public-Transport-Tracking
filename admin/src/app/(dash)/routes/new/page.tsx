"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { RouteForm } from "@/modules/route/components/RouteForm";
import { useCreateRoute } from "@/modules/route/hooks/useRoutes";

export default function NewRoutePage() {
  const router = useRouter();
  const create = useCreateRoute();

  return (
    <>
      <PageHeader
        title="Add route"
        description="Create the route, then add its stops on the next screen."
        backHref="/routes"
      />
      <RouteForm
        submitting={create.isPending}
        error={create.error}
        onSubmit={(input) =>
          create.mutate(input, {
            onSuccess: (route) => router.replace(`/routes/${route._id}`),
          })
        }
      />
    </>
  );
}
