"use client";

import { PageHeader } from "@/components/ui";
import { LostFoundForm } from "@/modules/lostFound/components/LostFoundForm";

export default function NewLostFoundPage() {
  return (
    <>
      <PageHeader title="Report lost / found" back />
      <LostFoundForm />
    </>
  );
}
