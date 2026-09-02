"use client";

import { PageHeader } from "@/components/ui";
import { PassList } from "@/modules/ticket/components/PassList";

export default function PassesPage() {
  return (
    <>
      <PageHeader title="Passes" back />
      <PassList />
    </>
  );
}
