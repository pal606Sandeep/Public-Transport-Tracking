"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  FullScreenLoader,
  Alert,
  Badge,
  Card,
  CardHeader,
  CardBody,
} from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { ConductorForm } from "@/modules/conductor/components/ConductorForm";
import { ConductorAssignPanel } from "@/modules/conductor/components/ConductorAssignPanel";
import {
  useConductor,
  useUpdateConductor,
} from "@/modules/conductor/hooks/useConductors";

export default function EditConductorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: conductor, isLoading, error } = useConductor(id);
  const update = useUpdateConductor(id);

  if (isLoading) return <FullScreenLoader />;
  if (error || !conductor)
    return (
      <>
        <PageHeader title="Conductor" backHref="/conductors" />
        <Alert tone="error">
          {errorMessage(error) || "Conductor not found"}
        </Alert>
      </>
    );

  return (
    <>
      <PageHeader
        title={conductor.name}
        description={`Employee ${conductor.employeeId}`}
        backHref="/conductors"
        action={
          <Badge tone={conductor.status === "ACTIVE" ? "success" : "neutral"}>
            {conductor.status.replace("_", " ")}
          </Badge>
        }
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold">Details</h2>
          <ConductorForm
            conductor={conductor}
            submitting={update.isPending}
            error={update.error}
            onSubmit={(input) =>
              update.mutate(
                {
                  name: input.name,
                  phone: input.phone,
                  employeeId: input.employeeId,
                  joiningDate: input.joiningDate,
                  status: input.status,
                  shift: input.shift,
                },
                { onSuccess: () => router.push("/conductors") }
              )
            }
          />
        </div>

        <div className="flex flex-col gap-6">
          <ConductorAssignPanel conductor={conductor} />

          <Card>
            <CardHeader title="Sales" />
            <CardBody className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Tickets sold</p>
                <p className="text-lg font-semibold">{conductor.ticketSales}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Revenue collected</p>
                <p className="text-lg font-semibold">
                  {conductor.revenueCollected}
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
