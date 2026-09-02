"use client";

import Link from "next/link";
import { PageHeader, Button } from "@/components/ui";
import { LostFoundList } from "@/modules/lostFound/components/LostFoundList";

export default function LostFoundPage() {
  return (
    <>
      <PageHeader
        title="Lost & found"
        back
        action={
          <Link href="/lost-found/new">
            <Button size="sm">Report</Button>
          </Link>
        }
      />
      <LostFoundList />
    </>
  );
}
