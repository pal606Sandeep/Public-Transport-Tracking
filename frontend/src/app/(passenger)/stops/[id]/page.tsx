"use client";

import { use } from "react";
import { PageHeader } from "@/components/ui";
import { StopDetail } from "@/modules/stop/components/StopDetail";

export default function StopDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <>
      <PageHeader title="Stop" back />
      <StopDetail id={id} />
    </>
  );
}
