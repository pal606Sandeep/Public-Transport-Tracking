"use client";

import { useEffect, useState } from "react";
import {
  Button,
  FullScreenLoader,
  Alert,
  Card,
  Badge,
} from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { TICKET_STATUS_LABEL, CATEGORY_LABEL } from "../constant/ticket.types";
import { useTicket, useCancelTicket, usePayForTicket } from "../hooks/useTickets";
import { recallTicketCode } from "../lib/ticketCodeStore";
import { QrCode } from "./QrCode";

const STATUS_TONE = {
  CONFIRMED: "success",
  PENDING_PAYMENT: "warning",
  USED: "neutral",
  CANCELLED: "neutral",
  EXPIRED: "danger",
} as const;

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 text-[14px]">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}

export function TicketDetail({ id, isNew }: { id: string; isNew?: boolean }) {
  const { data: t, isLoading, error } = useTicket(id);
  const cancel = useCancelTicket(id);
  const pay = usePayForTicket(id);
  const [payMethod, setPayMethod] = useState<
    "UPI" | "CARD" | "NET_BANKING" | "WALLET"
  >("UPI");
  const [fullCode, setFullCode] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.resolve().then(() => {
      if (alive) setFullCode(recallTicketCode(id));
    });
    return () => {
      alive = false;
    };
  }, [id]);

  if (isLoading) return <FullScreenLoader />;
  if (error || !t)
    return (
      <div className="p-4">
        <Alert tone="error">{errorMessage(error) || "Ticket not found"}</Alert>
      </div>
    );

  const showQr = t.status === "CONFIRMED" && fullCode;
  const canCancel = t.status === "CONFIRMED" || t.status === "PENDING_PAYMENT";

  return (
    <div className="flex flex-col gap-4 p-4">
      {isNew && t.status === "CONFIRMED" && (
        <Alert tone="success">
          Ticket confirmed. Show this QR to the conductor — it&apos;s only on
          this device.
        </Alert>
      )}

      {/* boarding-pass card */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
          <span className="text-[15px] font-bold">
            {t.routeNumber ? `Route ${t.routeNumber}` : "Ticket"}
          </span>
          <Badge
            tone={STATUS_TONE[t.status] ?? "neutral"}
            className="bg-white/15 text-primary-foreground"
          >
            {TICKET_STATUS_LABEL[t.status] ?? t.status}
          </Badge>
        </div>

        <div className="px-4 py-4">
          <div className="flex items-center gap-2 text-[14px] font-medium">
            <span className="truncate">{t.boardingStopName || "—"}</span>
            <span className="text-muted-foreground">→</span>
            <span className="truncate">{t.destinationStopName || "—"}</span>
          </div>

          {showQr ? (
            <div className="mt-4 flex flex-col items-center gap-2 rounded-[var(--radius-app)] bg-muted/60 py-5">
              <QrCode value={fullCode} />
              <p className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground">
                {fullCode}
              </p>
            </div>
          ) : t.status === "CONFIRMED" ? (
            <p className="mt-4 rounded-[var(--radius-app)] bg-muted p-3 text-center text-[12.5px] text-muted-foreground">
              QR unavailable on this device — ref{" "}
              <span className="font-mono">···{t.ticketCodeHint}</span>
            </p>
          ) : null}
        </div>

        <div className="border-t border-dashed px-4 pb-1 pt-1">
          <Row
            k="Fare"
            v={
              <span className="tnum">
                {t.currency} {t.amount.toFixed(2)}
                {t.passId ? " (pass)" : ""}
              </span>
            }
          />
          <Row
            k="Passenger"
            v={CATEGORY_LABEL[t.passengerCategory] ?? t.passengerCategory}
          />
          <Row k="Payment" v={t.paymentMethod} />
          {t.vehicleRegNo && <Row k="Vehicle" v={t.vehicleRegNo} />}
          {t.expiresAt && (
            <Row k="Valid until" v={new Date(t.expiresAt).toLocaleString()} />
          )}
          {t.usedAt && (
            <Row k="Used" v={new Date(t.usedAt).toLocaleString()} />
          )}
          {t.cancelledAt && (
            <Row k="Cancelled" v={new Date(t.cancelledAt).toLocaleString()} />
          )}
        </div>
      </Card>

      {t.status === "PENDING_PAYMENT" && (
        <Card className="p-4">
          <p className="text-[15px] font-semibold">Complete payment</p>
          <p className="tnum mt-1 text-[13px] text-muted-foreground">
            {t.currency} {t.amount.toFixed(2)} — confirmed by the gateway.
          </p>
          {pay.isSuccess ? (
            <Alert tone="info" className="mt-3">
              Payment initiated (ref {pay.data?.paymentReference}). The ticket
              activates once the gateway confirms.
            </Alert>
          ) : (
            <>
              <select
                value={payMethod}
                onChange={(e) =>
                  setPayMethod(
                    e.target.value as
                      | "UPI"
                      | "CARD"
                      | "NET_BANKING"
                      | "WALLET"
                  )
                }
                className="mt-3 h-12 w-full rounded-[var(--radius-app)] border bg-card px-3.5 text-[15px]"
              >
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
                <option value="NET_BANKING">Net banking</option>
                <option value="WALLET">Wallet</option>
              </select>
              {pay.isError && (
                <Alert tone="error" className="mt-2">
                  {errorMessage(pay.error)}
                </Alert>
              )}
              <Button
                variant="accent"
                size="lg"
                fullWidth
                className="mt-3"
                loading={pay.isPending}
                onClick={() =>
                  pay.mutate({
                    amount: t.amount,
                    method: payMethod,
                    provider: "mock",
                  })
                }
              >
                Pay {t.currency} {t.amount.toFixed(2)}
              </Button>
            </>
          )}
        </Card>
      )}

      {canCancel && (
        <div>
          {cancel.isError && (
            <Alert tone="error" className="mb-2">
              {errorMessage(cancel.error)}
            </Alert>
          )}
          <Button
            variant="ghost"
            size="lg"
            fullWidth
            className="text-destructive"
            loading={cancel.isPending}
            onClick={() => cancel.mutate(undefined)}
          >
            Cancel ticket
          </Button>
        </div>
      )}
    </div>
  );
}
