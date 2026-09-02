"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  PageHeader,
  Field,
  Input,
  Button,
  Alert,
  Card,
  CardHeader,
  CardBody,
} from "@/components/ui";
import { api } from "@/utils/apiClient";
import { errorMessage } from "@/lib/error/apiError";

interface RefundResult {
  payment: {
    _id: string;
    amount: number;
    currency: string;
    status: string;
    method: string;
    refundReason?: string | null;
  };
  refunded: boolean;
}

export default function PaymentsPage() {
  const [id, setId] = useState("");
  const [reason, setReason] = useState("");

  const refund = useMutation({
    mutationFn: async () => {
      const res = await api.post<RefundResult>(
        `/admin/payments/${id.trim()}/refund`,
        reason.trim() ? { reason: reason.trim() } : {}
      );
      return res.data as RefundResult;
    },
  });

  return (
    <>
      <PageHeader
        title="Payments"
        description="Issue refunds against a payment."
      />

      <Alert tone="warning" className="mb-6 max-w-2xl">
        The backend exposes only a refund endpoint under <code>/admin/payments</code> —
        there is no admin-wide payments list yet. Look up a payment id from the
        related ticket or the passenger&apos;s account, then refund it here.
      </Alert>

      <Card className="max-w-lg">
        <CardHeader title="Refund a payment" />
        <CardBody className="flex flex-col gap-4">
          <Field label="Payment ID" required>
            {(p) => (
              <Input
                {...p}
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="6a97…"
                className="font-mono text-xs"
              />
            )}
          </Field>
          <Field label="Reason">
            {(p) => (
              <Input
                {...p}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            )}
          </Field>

          {refund.isError && (
            <Alert tone="error">{errorMessage(refund.error)}</Alert>
          )}
          {refund.isSuccess && (
            <Alert tone="success">
              Payment {refund.data.payment._id} refunded —{" "}
              {refund.data.payment.currency} {refund.data.payment.amount}, status{" "}
              {refund.data.payment.status}.
            </Alert>
          )}

          <Button
            loading={refund.isPending}
            disabled={id.trim().length === 0}
            onClick={() => refund.mutate()}
          >
            Refund
          </Button>
        </CardBody>
      </Card>
    </>
  );
}
