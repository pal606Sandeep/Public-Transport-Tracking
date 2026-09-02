"use client";

import { useMemo, useState } from "react";
import { Button, Field, Alert } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import type { ActiveTrip } from "@/modules/driver/constant/driver.types";
import {
  PASSENGER_CATEGORIES,
  type PassengerCategory,
  type FareQuote,
} from "../constant/conductor.types";
import {
  useFareQuote,
  useIssueTicket,
  usePaymentQr,
} from "../hooks/useConductor";
import { PaymentQrView } from "./PaymentQrView";

export function IssueTicketForm({ trip }: { trip: ActiveTrip }) {
  const stops = useMemo(
    () => trip.route?.orderedStops ?? [],
    [trip.route?.orderedStops]
  );
  const routeId = trip.route?._id ?? "";
  const vehicleId = trip.vehicle;
  const tripId = trip._id;

  const [boarding, setBoarding] = useState(stops[0]?.stopId ?? "");
  const [dest, setDest] = useState(stops[stops.length - 1]?.stopId ?? "");
  const [category, setCategory] = useState<PassengerCategory>("ADULT");
  const [quote, setQuote] = useState<FareQuote | null>(null);

  const fare = useFareQuote();
  const issue = useIssueTicket();
  const qr = usePaymentQr();

  const destOptions = useMemo(() => {
    const bIdx = stops.findIndex((s) => s.stopId === boarding);
    return bIdx >= 0 ? stops.slice(bIdx + 1) : stops;
  }, [stops, boarding]);

  const getQuote = async () => {
    setQuote(null);
    qr.reset();
    issue.reset();
    const q = await fare.mutateAsync({
      routeId,
      boardingStopId: boarding,
      destinationStopId: dest,
      passengerCategory: category,
    });
    setQuote(q);
  };

  const finish = async (method: "CASH" | "QR") => {
    if (!quote) return;
    await issue.mutateAsync({
      route: routeId,
      trip: tripId,
      vehicle: vehicleId,
      boardingStop: boarding,
      destinationStop: dest,
      passengerCategory: category,
      paymentMethod: method,
      paid: method === "CASH",
      distanceKm: quote.distanceKm ?? undefined,
    });
    if (method === "QR") {
      await qr.mutateAsync({
        tripId,
        amount: quote.amount,
        purpose: "onboard ticket",
      });
    }
  };

  const stopName = (id: string) =>
    stops.find((s) => s.stopId === id)?.name ?? id.slice(-6);

  if (issue.isSuccess && !qr.data) {
    return (
      <div className="p-4">
        <Alert tone="success">
          Ticket issued · ₹{quote?.amount} · cash collected.
        </Alert>
        <Button
          className="mt-4"
          fullWidth
          variant="secondary"
          onClick={() => {
            issue.reset();
            setQuote(null);
          }}
        >
          Issue another
        </Button>
      </div>
    );
  }

  if (qr.data) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <PaymentQrView qr={qr.data} />
        <Button
          fullWidth
          variant="secondary"
          onClick={() => {
            qr.reset();
            issue.reset();
            setQuote(null);
          }}
        >
          Done · issue another
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {(fare.isError || issue.isError || qr.isError) && (
        <Alert tone="error">
          {errorMessage(fare.error || issue.error || qr.error)}
        </Alert>
      )}

      <Field label="From">
        {(p) => (
          <select
            {...p}
            value={boarding}
            onChange={(e) => {
              setBoarding(e.target.value);
              setQuote(null);
            }}
            className="h-11 w-full rounded-[var(--radius-app)] border bg-card px-3 text-sm"
          >
            {stops.map((s) => (
              <option key={s.stopId} value={s.stopId}>
                {s.name ?? stopName(s.stopId)}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field label="To">
        {(p) => (
          <select
            {...p}
            value={dest}
            onChange={(e) => {
              setDest(e.target.value);
              setQuote(null);
            }}
            className="h-11 w-full rounded-[var(--radius-app)] border bg-card px-3 text-sm"
          >
            {destOptions.map((s) => (
              <option key={s.stopId} value={s.stopId}>
                {s.name ?? stopName(s.stopId)}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field label="Passenger">
        {(p) => (
          <select
            {...p}
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as PassengerCategory);
              setQuote(null);
            }}
            className="h-11 w-full rounded-[var(--radius-app)] border bg-card px-3 text-sm"
          >
            {PASSENGER_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c[0] + c.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        )}
      </Field>

      {!quote ? (
        <Button
          fullWidth
          loading={fare.isPending}
          disabled={!boarding || !dest || boarding === dest}
          onClick={getQuote}
        >
          Get fare
        </Button>
      ) : (
        <>
          <div className="rounded-[var(--radius-app)] border p-3 text-center">
            <p className="text-2xl font-semibold">
              {quote.currency === "INR" ? "₹" : ""}
              {quote.amount}
            </p>
            <p className="text-xs text-muted-foreground">
              {quote.stopsSpanned} stops
              {quote.appliedConcession
                ? ` · ${quote.appliedConcession.discountPercent}% ${quote.appliedConcession.name}`
                : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              fullWidth
              loading={issue.isPending && issue.variables?.paymentMethod === "CASH"}
              onClick={() => finish("CASH")}
            >
              Cash
            </Button>
            <Button
              fullWidth
              variant="secondary"
              loading={
                (issue.isPending &&
                  issue.variables?.paymentMethod === "QR") ||
                qr.isPending
              }
              onClick={() => finish("QR")}
            >
              Show QR
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
