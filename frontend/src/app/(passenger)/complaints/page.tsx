"use client";

import { Suspense } from "react";
import Link from "next/link";
import { PageHeader, Button, SkeletonList } from "@/components/ui";
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
      <Suspense fallback={<SkeletonList rows={4} />}>
        <ComplaintList />
      </Suspense>
    </>
  );
}
