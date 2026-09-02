"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as svc from "../services/conductor.service";
import type { FareCalcInput } from "../constant/conductor.types";

export const conductorKeys = {
  activeTrip: ["conductor", "active-trip"] as const,
  tickets: ["conductor", "tickets"] as const,
};

export const useConductorTrip = () =>
  useQuery({
    queryKey: conductorKeys.activeTrip,
    queryFn: svc.getActiveTrip,
    staleTime: 15_000,
  });

export const useSubmitOccupancy = () =>
  useMutation({
    mutationFn: (input: {
      vehicleId: string;
      tripId: string;
      passengerCount: number;
    }) => svc.submitOccupancy(input),
  });

export const useFareQuote = () =>
  useMutation({
    mutationFn: (input: FareCalcInput) => svc.calculateFare(input),
  });

export const useIssueTicket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: svc.issueTicket,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: conductorKeys.tickets }),
  });
};

export const useTripTickets = () =>
  useQuery({
    queryKey: conductorKeys.tickets,
    queryFn: () => svc.listTripTickets({ limit: 50 }),
  });

export const useValidateTicket = () =>
  useMutation({
    mutationFn: (ticketCode: string) => svc.validateTicketCode(ticketCode),
  });

export const usePaymentQr = () =>
  useMutation({
    mutationFn: (input: {
      tripId: string;
      amount: number;
      purpose?: string;
    }) => svc.createPaymentQr(input),
  });

export const useReconcile = () =>
  useMutation({
    mutationFn: ({
      tripId,
      ...body
    }: {
      tripId: string;
      ticketsIssued: number;
      cashCollected: number;
      digitalCollected: number;
    }) => svc.reconcileTrip(tripId, body),
  });
