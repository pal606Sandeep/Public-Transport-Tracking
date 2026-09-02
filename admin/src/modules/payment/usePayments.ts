"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as svc from "./payment.service";
import type { PaymentListParams } from "./payment.types";

export const paymentKeys = {
  all: ["payments"] as const,
  list: (p: PaymentListParams) => ["payments", "list", p] as const,
};

export const usePayments = (params: PaymentListParams) =>
  useQuery({
    queryKey: paymentKeys.list(params),
    queryFn: () => svc.listPayments(params),
  });

export const useRefundPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      svc.refundPayment(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: paymentKeys.all }),
  });
};
