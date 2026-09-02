"use client";

import { PageHeader } from "@/components/ui";
import { TicketTabs } from "@/modules/ticket/components/TicketTabs";
import { PaymentList } from "@/modules/ticket/components/PaymentList";

export default function PaymentsPage() {
  return (
    <>
      <PageHeader title="Payments" back />
      <TicketTabs />
      <PaymentList />
    </>
  );
}
