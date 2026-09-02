"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as tickets from "../services/ticket.service";
import * as payments from "../services/payment.service";
import { rememberTicketCode } from "../lib/ticketCodeStore";

export const ticketKeys = {
  list: ["tickets", "mine"] as const,
  detail: (id: string) => ["tickets", "detail", id] as const,
  passes: ["tickets", "passes"] as const,
  activePass: ["tickets", "passes", "active"] as const,
  payments: ["payments", "mine"] as const,
};

export const useMyTickets = () =>
  useQuery({
    queryKey: ticketKeys.list,
    queryFn: () => tickets.listMyTickets({ limit: 30 }),
  });

export const useTicket = (id: string) =>
  useQuery({
    queryKey: ticketKeys.detail(id),
    queryFn: () => tickets.getTicket(id),
    enabled: Boolean(id),
  });

export const useBuyTicket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: tickets.buyTicket,
    onSuccess: (t) => {
      if (t.ticketCode) rememberTicketCode(t._id, t.ticketCode);
      qc.invalidateQueries({ queryKey: ticketKeys.list });
      qc.setQueryData(ticketKeys.detail(t._id), t);
    },
  });
};

export const useCancelTicket = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) => tickets.cancelTicket(id, reason),
    onSuccess: (t) => {
      qc.setQueryData(ticketKeys.detail(id), t);
      qc.invalidateQueries({ queryKey: ticketKeys.list });
    },
  });
};

export const useMyPasses = () =>
  useQuery({ queryKey: ticketKeys.passes, queryFn: tickets.listMyPasses });

export const useActivePass = () =>
  useQuery({
    queryKey: ticketKeys.activePass,
    queryFn: tickets.getActivePass,
  });

export const useMyPayments = () =>
  useQuery({
    queryKey: ticketKeys.payments,
    queryFn: () => payments.listMyPayments({ limit: 30 }),
  });

export const usePayForTicket = (ticketId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      amount: number;
      method: "UPI" | "CARD" | "NET_BANKING" | "WALLET";
      provider: string;
    }) =>
      payments.createPayment({
        ticket: ticketId,
        payableFor: "ticket",
        ...input,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ticketKeys.payments });
      qc.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) });
    },
  });
};
