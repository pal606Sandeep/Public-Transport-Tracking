"use client";

import { PageHeader } from "@/components/ui";
import { ComplaintForm } from "@/modules/complaint/components/ComplaintForm";

export default function NewComplaintPage() {
  return (
    <>
      <PageHeader title="Report a problem" back />
      <ComplaintForm />
    </>
  );
}
