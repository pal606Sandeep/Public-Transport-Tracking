import type { PaymentQr } from "../constant/conductor.types";

/**
 * Renders the UPI payment intent. A scannable QR image needs a QR lib
 * (`qrcode`) — deferred to the PWA-infra pass; for now the passenger opens the
 * UPI link or the conductor reads the reference.
 */
export function PaymentQrView({ qr }: { qr: PaymentQr }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-app)] border p-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Collect payment
      </p>
      <p className="text-2xl font-semibold">₹{qr.payment.amount}</p>

      <a
        href={qr.upiString}
        className="w-full rounded-[var(--radius-app)] bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
      >
        Open in UPI app
      </a>

      <div className="w-full break-all rounded-[var(--radius-app)] bg-muted p-2 font-mono text-[11px]">
        {qr.upiString}
      </div>
      <p className="text-xs text-muted-foreground">
        Ref <span className="font-mono">{qr.paymentReference}</span> · status{" "}
        {qr.payment.status.toLowerCase()}
      </p>
    </div>
  );
}
