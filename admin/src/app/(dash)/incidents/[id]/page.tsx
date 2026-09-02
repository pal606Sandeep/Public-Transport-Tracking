"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  FullScreenLoader,
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  CardBody,
} from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import {
  useIncident,
  useDeleteIncident,
} from "@/modules/incident/hooks/useIncidents";
import { IncidentWorkflow } from "@/modules/incident/components/IncidentWorkflow";
import {
  SEVERITY_TONE,
  STATUS_TONE,
} from "@/modules/incident/constant/incidentStyle";

export default function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: incident, isLoading, error } = useIncident(id);
  const del = useDeleteIncident();

  if (isLoading) return <FullScreenLoader />;
  if (error || !incident)
    return (
      <>
        <PageHeader title="Incident" backHref="/incidents" />
        <Alert tone="error">
          {errorMessage(error) || "Incident not found"}
        </Alert>
      </>
    );

  return (
    <>
      <PageHeader
        title={incident.title}
        description={`${incident.type} · ${incident.source}`}
        backHref="/incidents"
        action={
          <div className="flex items-center gap-2">
            <Badge tone={SEVERITY_TONE[incident.severity]}>
              {incident.severity}
            </Badge>
            <Badge tone={STATUS_TONE[incident.status]}>{incident.status}</Badge>
          </div>
        }
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody>
              {incident.description ? (
                <p className="whitespace-pre-wrap text-sm">
                  {incident.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No description.</p>
              )}
              <dl className="mt-4 grid grid-cols-[8rem_1fr] gap-y-1.5 text-sm">
                {incident.vehicleId && (
                  <>
                    <dt className="text-muted-foreground">Vehicle</dt>
                    <dd className="font-mono text-xs">{incident.vehicleId}</dd>
                  </>
                )}
                {incident.routeId && (
                  <>
                    <dt className="text-muted-foreground">Route</dt>
                    <dd className="font-mono text-xs">{incident.routeId}</dd>
                  </>
                )}
                {incident.driverId && (
                  <>
                    <dt className="text-muted-foreground">Driver</dt>
                    <dd className="font-mono text-xs">{incident.driverId}</dd>
                  </>
                )}
                {incident.tripId && (
                  <>
                    <dt className="text-muted-foreground">Trip</dt>
                    <dd className="font-mono text-xs">{incident.tripId}</dd>
                  </>
                )}
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Timeline" />
            <CardBody>
              <ol className="flex flex-col gap-2 text-sm">
                {incident.timeline.map((t, i) => (
                  <li key={i} className="border-b pb-2 last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{t.status}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(t.at).toLocaleString()}
                      </span>
                    </div>
                    {t.note && (
                      <p className="text-xs text-muted-foreground">{t.note}</p>
                    )}
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <IncidentWorkflow incident={incident} />
          <div>
            <Button
              variant="destructive"
              size="sm"
              loading={del.isPending}
              onClick={async () => {
                await del.mutateAsync(incident._id);
                router.push("/incidents");
              }}
            >
              Delete incident
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
