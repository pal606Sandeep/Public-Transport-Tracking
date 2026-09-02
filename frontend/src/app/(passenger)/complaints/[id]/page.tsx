"use client";

import { use } from "react";
import { PageHeader } from "@/components/ui";
import { ComplaintDetail } from "@/modules/complaint/components/ComplaintDetail";

export default function ComplaintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <>
      <PageHeader title="Complaint" back />
      <ComplaintDetail id={id} />
    </>
  );
}
