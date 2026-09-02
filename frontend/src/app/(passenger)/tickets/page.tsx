"use client";

import Link from "next/link";
import { PageHeader, Button } from "@/components/ui";
import { TicketList } from "@/modules/ticket/components/TicketList";

export default function TicketsPage() {
  return (
    <>
      <PageHeader
        title="Tickets"
        action={
          <Link href="/tickets/buy">
            <Button size="sm">Buy</Button>
          </Link>
        }
      />
      <div className="flex gap-4 border-b px-4 py-2 text-sm">
        <Link href="/passes" className="text-muted-foreground">
          Passes
        </Link>
        <Link href="/payments" className="text-muted-foreground">
          Payments
        </Link>
      </div>
      <TicketList />
    </>
  );
}
