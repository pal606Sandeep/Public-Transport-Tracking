"use client";

import Link from "next/link";
import { PageHeader, Button } from "@/components/ui";
import { ComplaintList } from "@/modules/complaint/components/ComplaintList";

export default function ComplaintsPage() {
  return (
    <>
      <PageHeader
        title="Complaints"
        back
        action={
          <Link href="/complaints/new">
            <Button size="sm">New</Button>
          </Link>
        }
      />
      <ComplaintList />
    </>
  );
}
