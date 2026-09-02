"use client";

import { use } from "react";
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
import {
  useComplaint,
  useComplaintHistory,
} from "@/modules/complaint/useComplaints";
import { ComplaintTriage } from "@/modules/complaint/components/ComplaintTriage";
import {
  CATEGORY_LABEL,
  PRIORITY_TONE,
  STATUS_TONE,
} from "@/modules/complaint/complaint.types";

export default function ComplaintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: complaint, isLoading, error } = useComplaint(id);
  const historyQ = useComplaintHistory(id);

  if (isLoading) return <FullScreenLoader />;
  if (error || !complaint)
    return (
      <>
        <PageHeader title="Complaint" backHref="/complaints" />
        <Alert tone="error">
          {errorMessage(error) || "Complaint not found"}
        </Alert>
      </>
    );

  return (
    <>
      <PageHeader
        title={complaint.subject}
        description={CATEGORY_LABEL[complaint.category] ?? complaint.category}
        backHref="/complaints"
        action={
          <div className="flex items-center gap-2">
            <Badge tone={PRIORITY_TONE[complaint.priority]}>
              {complaint.priority}
            </Badge>
            <Badge tone={STATUS_TONE[complaint.status]}>
              {complaint.status}
            </Badge>
          </div>
        }
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody>
              <p className="whitespace-pre-wrap text-sm">
                {complaint.description}
              </p>
              <dl className="mt-4 grid grid-cols-[8rem_1fr] gap-y-1.5 text-sm">
                <dt className="text-muted-foreground">Filed</dt>
                <dd>{new Date(complaint.createdAt).toLocaleString()}</dd>
                {complaint.relatedRoute && (
                  <>
                    <dt className="text-muted-foreground">Route</dt>
                    <dd className="font-mono text-xs">
                      {complaint.relatedRoute}
                    </dd>
                  </>
                )}
                {complaint.relatedVehicle && (
                  <>
                    <dt className="text-muted-foreground">Vehicle</dt>
                    <dd className="font-mono text-xs">
                      {complaint.relatedVehicle}
                    </dd>
                  </>
                )}
                {complaint.relatedTrip && (
                  <>
                    <dt className="text-muted-foreground">Trip</dt>
                    <dd className="font-mono text-xs">
                      {complaint.relatedTrip}
                    </dd>
                  </>
                )}
                {complaint.assignedTo && (
                  <>
                    <dt className="text-muted-foreground">Assigned to</dt>
                    <dd className="font-mono text-xs">
                      {complaint.assignedTo}
                    </dd>
                  </>
                )}
              </dl>

              {complaint.attachments.length > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  {complaint.attachments.length} attachment
                  {complaint.attachments.length === 1 ? "" : "s"} on file.
                </p>
              )}
            </CardBody>
          </Card>

          {complaint.resolution && (
            <Card>
              <CardHeader title="Resolution" />
              <CardBody>
                <p className="text-sm">{complaint.resolution.note}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(
                    complaint.resolution.resolvedAt
                  ).toLocaleString()}
                </p>
              </CardBody>
            </Card>
          )}

          {complaint.feedback && (
            <Card>
              <CardHeader title="Passenger feedback" />
              <CardBody>
                <p className="text-sm">
                  {"★".repeat(complaint.feedback.rating)}
                  <span className="text-border">
                    {"★".repeat(5 - complaint.feedback.rating)}
                  </span>
                </p>
                {complaint.feedback.comment && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {complaint.feedback.comment}
                  </p>
                )}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title={`History (${complaint.historyCount})`} />
            <CardBody>
              {historyQ.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (historyQ.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No history.</p>
              ) : (
                <ol className="flex flex-col gap-2 text-sm">
                  {(historyQ.data ?? []).map((h, i) => (
                    <li key={i} className="border-b pb-2 last:border-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{h.action}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(h.at).toLocaleString()}
                        </span>
                      </div>
                      {h.note && (
                        <p className="text-xs text-muted-foreground">
                          {h.note}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>
        </div>

        <ComplaintTriage complaint={complaint} />
      </div>
    </>
  );
}
