"use client";

import { useState } from "react";
import {
  PageHeader,
  Select,
  Input,
  Alert,
  Badge,
  Spinner,
  EmptyState,
  Pagination,
  Table,
  THead,
  TR,
  TH,
  TD,
  Button,
  Modal,
  Field,
} from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { usePayments, useRefundPayment } from "@/modules/payment/usePayments";
import {
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  STATUS_TONE,
  type Payment,
  type PaymentStatus,
} from "@/modules/payment/payment.types";

export default function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<PaymentStatus | "">("");
  const [method, setMethod] = useState("");
  const [payableFor, setPayableFor] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null);
  const [reason, setReason] = useState("");

  const { data, isLoading, error, isFetching } = usePayments({
    page,
    limit: 20,
    status: status || undefined,
    method: method || undefined,
    payableFor: payableFor || undefined,
    from: from ? new Date(from).toISOString() : undefined,
    to: to ? new Date(to).toISOString() : undefined,
  });
  const refund = useRefundPayment();

  const payments = data?.payments ?? [];
  const pg = data?.pagination;

  const doRefund = async () => {
    if (!refundTarget) return;
    await refund.mutateAsync({
      id: refundTarget._id,
      reason: reason.trim() || undefined,
    });
    setRefundTarget(null);
    setReason("");
  };

  return (
    <>
      <PageHeader
        title="Payments"
        description="All ticket and pass payments. Refund successful ones from here."
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as PaymentStatus | "");
            setPage(1);
          }}
          className="max-w-[10rem]"
        >
          <option value="">All statuses</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select
          value={method}
          onChange={(e) => {
            setMethod(e.target.value);
            setPage(1);
          }}
          className="max-w-[9rem]"
        >
          <option value="">All methods</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
        <Select
          value={payableFor}
          onChange={(e) => {
            setPayableFor(e.target.value);
            setPage(1);
          }}
          className="max-w-[8rem]"
        >
          <option value="">Ticket + pass</option>
          <option value="ticket">Ticket</option>
          <option value="pass">Pass</option>
        </Select>
        <Input
          type="date"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setPage(1);
          }}
          className="max-w-[10rem]"
        />
        <Input
          type="date"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setPage(1);
          }}
          className="max-w-[10rem]"
        />
        {isFetching && <Spinner />}
      </div>

      {error ? (
        <Alert tone="error">{errorMessage(error)}</Alert>
      ) : isLoading ? (
        <div className="py-16 text-center">
          <Spinner className="h-6 w-6" />
        </div>
      ) : payments.length === 0 ? (
        <EmptyState title="No payments" hint="Nothing matches these filters." />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Date</TH>
                <TH>Amount</TH>
                <TH>Method</TH>
                <TH>For</TH>
                <TH>Reference</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <tbody>
              {payments.map((p) => (
                <TR key={p._id}>
                  <TD className="whitespace-nowrap text-muted-foreground">
                    {new Date(p.createdAt).toLocaleString([], {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </TD>
                  <TD className="font-medium">
                    {p.currency} {p.amount}
                  </TD>
                  <TD className="text-muted-foreground">{p.method}</TD>
                  <TD className="text-muted-foreground">{p.payableFor}</TD>
                  <TD className="font-mono text-xs text-muted-foreground">
                    {p.providerRef ?? "—"}
                  </TD>
                  <TD>
                    <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
                    {p.refundReason && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {p.refundReason}
                      </span>
                    )}
                  </TD>
                  <TD className="text-right">
                    {p.status === "SUCCESS" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRefundTarget(p);
                          setReason("");
                        }}
                      >
                        Refund
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
          {pg && (
            <Pagination
              page={pg.page}
              totalPages={pg.totalPages ?? 1}
              onPage={setPage}
            />
          )}
        </>
      )}

      <Modal
        open={!!refundTarget}
        onClose={() => setRefundTarget(null)}
        title="Refund payment"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefundTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              loading={refund.isPending}
              onClick={doRefund}
            >
              Refund {refundTarget?.currency} {refundTarget?.amount}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {refund.isError && (
            <Alert tone="error">{errorMessage(refund.error)}</Alert>
          )}
          <p className="text-sm text-muted-foreground">
            Payment <span className="font-mono">{refundTarget?.providerRef}</span>{" "}
            will be marked <strong>REFUNDED</strong>.
          </p>
          <Field label="Reason">
            {(fp) => (
              <Input
                {...fp}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Optional"
              />
            )}
          </Field>
        </div>
      </Modal>
    </>
  );
}
