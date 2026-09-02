"use client";

import { use } from "react";
import { PageHeader } from "@/components/ui";
import { LostFoundDetail } from "@/modules/lostFound/components/LostFoundDetail";

export default function LostFoundDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <>
      <PageHeader title="Report" back />
      <LostFoundDetail id={id} />
    </>
  );
}
