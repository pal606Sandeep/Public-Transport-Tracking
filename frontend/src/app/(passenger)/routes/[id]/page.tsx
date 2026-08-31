"use client";

import { use } from "react";
import { PageHeader } from "@/components/ui";
import { RouteDetail } from "@/modules/route/components/RouteDetail";

export default function RouteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <>
      <PageHeader title="Route" back />
      <RouteDetail id={id} />
    </>
  );
}
