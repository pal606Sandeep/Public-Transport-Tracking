"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader, FullScreenLoader } from "@/components/ui";
import { BuyTicketForm } from "@/modules/ticket/components/BuyTicketForm";

function BuyBody() {
  const routeId = useSearchParams().get("route") ?? "";
  return <BuyTicketForm initialRouteId={routeId} />;
}

export default function BuyTicketPage() {
  return (
    <>
      <PageHeader title="Buy a ticket" back />
      <Suspense fallback={<FullScreenLoader />}>
        <BuyBody />
      </Suspense>
    </>
  );
}
