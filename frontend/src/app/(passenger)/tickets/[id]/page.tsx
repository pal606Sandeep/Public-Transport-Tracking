"use client";

import { Suspense, use } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader, FullScreenLoader } from "@/components/ui";
import { TicketDetail } from "@/modules/ticket/components/TicketDetail";

function TicketDetailBody({ id }: { id: string }) {
  const isNew = useSearchParams().get("new") === "1";
  return <TicketDetail id={id} isNew={isNew} />;
}

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <>
      <PageHeader title="Ticket" back />
      <Suspense fallback={<FullScreenLoader />}>
        <TicketDetailBody id={id} />
      </Suspense>
    </>
  );
}
