"use client";

import Link from "next/link";
import { PageHeader, Button } from "@/components/ui";
import { TicketTabs } from "@/modules/ticket/components/TicketTabs";
import { TicketList } from "@/modules/ticket/components/TicketList";

export default function TicketsPage() {
  return (
    <>
      <PageHeader
        title="Tickets"
        action={
          <Link href="/tickets/buy">
            <Button size="sm" pill>
              Buy ticket
            </Button>
          </Link>
        }
      />
      <TicketTabs />
      <TicketList />
    </>
  );
}
