"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, FullScreenLoader, Alert, Badge } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { RouteForm } from "@/modules/route/components/RouteForm";
import { RouteStopsEditor } from "@/modules/route/components/RouteStopsEditor";
import { useRoute, useUpdateRoute } from "@/modules/route/hooks/useRoutes";

export default function EditRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: route, isLoading, error } = useRoute(id);
  const update = useUpdateRoute(id);

  if (isLoading) return <FullScreenLoader />;
  if (error || !route)
    return (
      <>
        <PageHeader title="Route" backHref="/routes" />
        <Alert tone="error">{errorMessage(error) || "Route not found"}</Alert>
      </>
    );

  return (
    <>
      <PageHeader
        title={`Route ${route.routeNumber}`}
        description={route.name ?? undefined}
        backHref="/routes"
        action={
          <Badge tone={route.status === "ACTIVE" ? "success" : "neutral"}>
            {route.status}
          </Badge>
        }
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold">Details</h2>
          <RouteForm
            route={route}
            submitting={update.isPending}
            error={update.error}
            onSubmit={(input) =>
              update.mutate(input, {
                onSuccess: () => router.push("/routes"),
              })
            }
          />
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">Stops</h2>
          <RouteStopsEditor route={route} />
        </div>
      </div>
    </>
  );
}
