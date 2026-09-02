"use client";

import { useEffect, useState } from "react";
import { Button, FullScreenLoader, Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import {
  TICKET_STATUS_LABEL,
  CATEGORY_LABEL,
} from "../constant/ticket.types";
import { useTicket, useCancelTicket, usePayForTicket } from "../hooks/useTickets";
import { recallTicketCode } from "../lib/ticketCodeStore";
import { QrCode } from "./QrCode";

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
  const canCancel =
    t.status === "CONFIRMED" || t.status === "PENDING_PAYMENT";

  return (
    <div className="flex flex-col gap-5 p-4">
      {isNew && t.status === "CONFIRMED" && (
        <Alert tone="success">
          Ticket confirmed. Show this QR to the conductor — it&apos;s only
          available on this device.
        </Alert>
      )}

      <div className="rounded-[var(--radius-app)] border p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">
            {t.routeNumber ? `Route ${t.routeNumber}` : "Ticket"}
          </span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {TICKET_STATUS_LABEL[t.status] ?? t.status}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.boardingStopName || "—"} → {t.destinationStopName || "—"}
        </p>

        {showQr ? (
          <div className="mt-4 flex flex-col items-center gap-2">
            <QrCode value={fullCode} />
            <p className="font-mono text-xs tracking-widest text-muted-foreground">
              {fullCode}
            </p>
          </div>
        ) : t.status === "CONFIRMED" ? (
          <p className="mt-4 rounded-[var(--radius-app)] bg-muted p-3 text-center text-xs text-muted-foreground">
            QR unavailable on this device — reference{" "}
            <span className="font-mono">···{t.ticketCodeHint}</span>
          </p>
        ) : null}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Fare</dt>
        <dd>
          {t.currency} {t.amount.toFixed(2)}
          {t.passId ? " (pass)" : ""}
        </dd>
        <dt className="text-muted-foreground">Passenger</dt>
        <dd>{CATEGORY_LABEL[t.passengerCategory] ?? t.passengerCategory}</dd>
        <dt className="text-muted-foreground">Payment</dt>
        <dd>{t.paymentMethod}</dd>
        {t.vehicleRegNo && (
          <>
            <dt className="text-muted-foreground">Vehicle</dt>
            <dd>{t.vehicleRegNo}</dd>
          </>
        )}
        {t.expiresAt && (
          <>
            <dt className="text-muted-foreground">Valid until</dt>
            <dd>{new Date(t.expiresAt).toLocaleString()}</dd>
          </>
        )}
        {t.usedAt && (
          <>
            <dt className="text-muted-foreground">Used</dt>
            <dd>{new Date(t.usedAt).toLocaleString()}</dd>
          </>
        )}
        {t.cancelledAt && (
          <>
            <dt className="text-muted-foreground">Cancelled</dt>
            <dd>{new Date(t.cancelledAt).toLocaleString()}</dd>
          </>
        )}
      </dl>

      {t.status === "PENDING_PAYMENT" && (
        <div className="rounded-[var(--radius-app)] border p-4">
          <p className="text-sm font-medium">Complete payment</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t.currency} {t.amount.toFixed(2)} — confirmation arrives from the
            payment gateway.
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
                className="mt-3 h-11 w-full rounded-[var(--radius-app)] border bg-card px-3 text-sm"
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
                className="mt-3"
                size="sm"
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
        </div>
      )}

      {canCancel && (
        <div>
          {cancel.isError && (
            <Alert tone="error" className="mb-2">
              {errorMessage(cancel.error)}
            </Alert>
          )}
          <Button
            variant="destructive"
            fullWidth
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
