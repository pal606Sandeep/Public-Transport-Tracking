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
import { useLostFoundItem } from "@/modules/lostFound/useLostFound";
import { LostFoundWorkbench } from "@/modules/lostFound/components/LostFoundWorkbench";

export default function LostFoundDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: item, isLoading, error } = useLostFoundItem(id);

  if (isLoading) return <FullScreenLoader />;
  if (error || !item)
    return (
      <>
        <PageHeader title="Item" backHref="/lost-found" />
        <Alert tone="error">{errorMessage(error) || "Item not found"}</Alert>
      </>
    );

  return (
    <>
      <PageHeader
        title={item.title}
        description={`${item.kind} · reported ${new Date(
          item.createdAt
        ).toLocaleDateString()}`}
        backHref="/lost-found"
        action={
          <Badge tone={item.kind === "LOST" ? "danger" : "info"}>
            {item.kind}
          </Badge>
        }
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody>
              <p className="whitespace-pre-wrap text-sm">{item.description}</p>
              <dl className="mt-4 grid grid-cols-[9rem_1fr] gap-y-1.5 text-sm">
                <dt className="text-muted-foreground">Occurred</dt>
                <dd>{new Date(item.occurredAt).toLocaleString()}</dd>
                {item.category && (
                  <>
                    <dt className="text-muted-foreground">Category</dt>
                    <dd>{item.category}</dd>
                  </>
                )}
                {item.color && (
                  <>
                    <dt className="text-muted-foreground">Colour</dt>
                    <dd>{item.color}</dd>
                  </>
                )}
                {item.reporterContact && (
                  <>
                    <dt className="text-muted-foreground">Reporter contact</dt>
                    <dd>{item.reporterContact}</dd>
                  </>
                )}
                {item.route && (
                  <>
                    <dt className="text-muted-foreground">Route</dt>
                    <dd className="font-mono text-xs">{item.route}</dd>
                  </>
                )}
                {item.assignedTo && (
                  <>
                    <dt className="text-muted-foreground">Assigned to</dt>
                    <dd className="font-mono text-xs">{item.assignedTo}</dd>
                  </>
                )}
              </dl>
              {item.attachments.length > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  {item.attachments.length} photo
                  {item.attachments.length === 1 ? "" : "s"} on file.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="History" />
            <CardBody>
              <ol className="flex flex-col gap-2 text-sm">
                {item.history.map((h, i) => (
                  <li key={i} className="border-b pb-2 last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {h.action.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(h.at).toLocaleString()}
                      </span>
                    </div>
                    {h.note && (
                      <p className="text-xs text-muted-foreground">{h.note}</p>
                    )}
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>

        <LostFoundWorkbench item={item} />
      </div>
    </>
  );
}
