"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Alert, Spinner } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { useRoutes, useRoute } from "@/modules/route/hooks/useRoutes";
import { calculateFare } from "@/modules/conductor/services/conductor.service";
import type { FareQuote } from "@/modules/conductor/constant/conductor.types";
import {
  PASSENGER_CATEGORIES,
  CATEGORY_LABEL,
  PAYMENT_METHODS,
  METHOD_LABEL,
  ONLINE_METHODS,
  type PassengerCategory,
  type PaymentMethod,
} from "../constant/ticket.types";
import { useBuyTicket } from "../hooks/useTickets";

export function BuyTicketForm({ initialRouteId = "" }: { initialRouteId?: string }) {
  const router = useRouter();
  const routesQ = useRoutes({ status: "ACTIVE", limit: 100 });
  const buy = useBuyTicket();

  const [routeId, setRouteId] = useState(initialRouteId);
  const [boardingStop, setBoardingStop] = useState("");
  const [destinationStop, setDestinationStop] = useState("");
  const [category, setCategory] = useState<PassengerCategory>("ADULT");
  const [method, setMethod] = useState<PaymentMethod>("CASH");

  const [quote, setQuote] = useState<FareQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const routeQ = useRoute(routeId);
  const stops = useMemo(() => {
    const list = routeQ.data?.orderedStops ?? [];
    return [...list].sort((a, b) => a.sequence - b.sequence);
  }, [routeQ.data?.orderedStops]);

  const stopLabel = (s: (typeof stops)[number], i: number) =>
    s.stop?.name ?? s.stop?.code ?? `Stop ${i + 1}`;

  const boardingSeq =
    stops.find((s) => s.stopId === boardingStop)?.sequence ?? -Infinity;

  const resetQuote = () => {
    setQuote(null);
    setErr(null);
  };

  const getFare = async () => {
    setErr(null);
    setQuoting(true);
    try {
      const q = await calculateFare({
        routeId,
        boardingStopId: boardingStop,
        destinationStopId: destinationStop,
        passengerCategory: category,
      });
      setQuote(q);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setQuoting(false);
    }
  };

  const submit = async () => {
    setErr(null);
    try {
      const ticket = await buy.mutateAsync({
        route: routeId,
        boardingStop,
        destinationStop,
        passengerCategory: category,
        paymentMethod: method,
        paid: !ONLINE_METHODS.includes(method),
      });
      router.replace(`/tickets/${ticket._id}?new=1`);
    } catch (e) {
      setErr(errorMessage(e));
    }
  };

  const canQuote =
    routeId &&
    boardingStop &&
    destinationStop &&
    boardingStop !== destinationStop;

  return (
    <div className="flex flex-col gap-5 p-4">
      {err && <Alert tone="error">{err}</Alert>}

      <Field label="Route" required>
        {({ id }) => (
          <select
            id={id}
            value={routeId}
            onChange={(e) => {
              setRouteId(e.target.value);
              setBoardingStop("");
              setDestinationStop("");
              resetQuote();
            }}
            className="h-11 rounded-[var(--radius-app)] border bg-card px-3 text-sm"
          >
            <option value="">Select a route…</option>
            {(routesQ.data?.routes ?? []).map((r) => (
              <option key={r._id} value={r._id}>
                {r.routeNumber} — {r.name || r.destination || "route"}
              </option>
            ))}
          </select>
        )}
      </Field>

      {routeId && routeQ.isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Loading stops…
        </div>
      )}

      {stops.length > 0 && (
        <>
          <Field label="Boarding stop" required>
            {({ id }) => (
              <select
                id={id}
                value={boardingStop}
                onChange={(e) => {
                  setBoardingStop(e.target.value);
                  resetQuote();
                }}
                className="h-11 rounded-[var(--radius-app)] border bg-card px-3 text-sm"
              >
                <option value="">Select…</option>
                {stops.map((s, i) => (
                  <option key={s.stopId} value={s.stopId}>
                    {stopLabel(s, i)}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Destination stop" required>
            {({ id }) => (
              <select
                id={id}
                value={destinationStop}
                onChange={(e) => {
                  setDestinationStop(e.target.value);
                  resetQuote();
                }}
                className="h-11 rounded-[var(--radius-app)] border bg-card px-3 text-sm"
              >
                <option value="">Select…</option>
                {stops
                  .filter((s) => s.sequence > boardingSeq)
                  .map((s, i) => (
                    <option key={s.stopId} value={s.stopId}>
                      {stopLabel(s, i)}
                    </option>
                  ))}
              </select>
            )}
          </Field>
        </>
      )}

      <Field label="Passenger type" required>
        {({ id }) => (
          <select
            id={id}
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as PassengerCategory);
              resetQuote();
            }}
            className="h-11 rounded-[var(--radius-app)] border bg-card px-3 text-sm"
          >
            {PASSENGER_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        )}
      </Field>

      {!quote ? (
        <Button
          type="button"
          fullWidth
          loading={quoting}
          disabled={!canQuote}
          onClick={getFare}
        >
          Get fare
        </Button>
      ) : (
        <>
          <div className="rounded-[var(--radius-app)] border p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Fare</span>
              <span className="text-xl font-semibold">
                {quote.currency} {quote.amount.toFixed(2)}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {quote.stopsSpanned} stop{quote.stopsSpanned === 1 ? "" : "s"}
              {quote.distanceKm != null
                ? ` · ${quote.distanceKm.toFixed(1)} km`
                : ""}
              {quote.appliedConcession
                ? ` · ${quote.appliedConcession.name} (−${quote.appliedConcession.discountPercent}%)`
                : ""}
            </p>
          </div>

          <Field label="Payment" required>
            {({ id }) => (
              <select
                id={id}
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                className="h-11 rounded-[var(--radius-app)] border bg-card px-3 text-sm"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {METHOD_LABEL[m]}
                  </option>
                ))}
              </select>
            )}
          </Field>

          {ONLINE_METHODS.includes(method) && (
            <p className="text-xs text-muted-foreground">
              The ticket is issued as <b>payment pending</b> — complete payment
              on the ticket screen to activate it.
            </p>
          )}

          <Button type="button" fullWidth loading={buy.isPending} onClick={submit}>
            {ONLINE_METHODS.includes(method)
              ? "Reserve ticket"
              : `Buy ticket · ${quote.currency} ${quote.amount.toFixed(2)}`}
          </Button>
          <button
            type="button"
            className="text-xs text-muted-foreground underline"
            onClick={resetQuote}
          >
            Change trip
          </button>
        </>
      )}
    </div>
  );
}
