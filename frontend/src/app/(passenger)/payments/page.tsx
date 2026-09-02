"use client";

import { PageHeader } from "@/components/ui";
import { PaymentList } from "@/modules/ticket/components/PaymentList";

export default function PaymentsPage() {
  return (
    <>
      <PageHeader title="Payments" back />
      <PaymentList />
    </>
  );
}
