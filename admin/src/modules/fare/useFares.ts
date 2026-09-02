"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as svc from "./fare.service";
import type {
  FareInput,
  FareRuleInput,
  ConcessionInput,
  PassInput,
} from "./fare.types";

const keys = {
  rules: ["fares", "rules"] as const,
  fares: ["fares", "fares"] as const,
  concessions: ["fares", "concessions"] as const,
  passes: ["fares", "passes"] as const,
};

/* fare rules */
export const useFareRules = () =>
  useQuery({ queryKey: keys.rules, queryFn: svc.listFareRules });

export const useFareRuleMutations = () => {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: keys.rules });
  return {
    create: useMutation({
      mutationFn: (i: FareRuleInput) => svc.createFareRule(i),
      onSuccess: inv,
    }),
    update: useMutation({
      mutationFn: (a: { id: string; input: Partial<FareRuleInput> }) =>
        svc.updateFareRule(a.id, a.input),
      onSuccess: inv,
    }),
    remove: useMutation({
      mutationFn: (id: string) => svc.deleteFareRule(id),
      onSuccess: inv,
    }),
  };
};

/* fares */
export const useFares = () =>
  useQuery({ queryKey: keys.fares, queryFn: () => svc.listFares({ limit: 100 }) });

export const useFareMutations = () => {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: keys.fares });
  return {
    create: useMutation({
      mutationFn: (i: FareInput) => svc.createFare(i),
      onSuccess: inv,
    }),
    update: useMutation({
      mutationFn: (a: { id: string; input: Partial<FareInput> }) =>
        svc.updateFare(a.id, a.input),
      onSuccess: inv,
    }),
    remove: useMutation({
      mutationFn: (id: string) => svc.deleteFare(id),
      onSuccess: inv,
    }),
  };
};

/* concessions */
export const useConcessions = () =>
  useQuery({
    queryKey: keys.concessions,
    queryFn: () => svc.listConcessions({ limit: 100 }),
  });

export const useConcessionMutations = () => {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: keys.concessions });
  return {
    create: useMutation({
      mutationFn: (i: ConcessionInput) => svc.createConcession(i),
      onSuccess: inv,
    }),
    update: useMutation({
      mutationFn: (a: { id: string; input: Partial<ConcessionInput> }) =>
        svc.updateConcession(a.id, a.input),
      onSuccess: inv,
    }),
    remove: useMutation({
      mutationFn: (id: string) => svc.deleteConcession(id),
      onSuccess: inv,
    }),
  };
};

/* passes */
export const usePasses = () =>
  useQuery({
    queryKey: keys.passes,
    queryFn: () => svc.listPasses({ limit: 100 }),
  });

export const usePassMutations = () => {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: keys.passes });
  return {
    create: useMutation({
      mutationFn: (i: PassInput) => svc.createPass(i),
      onSuccess: inv,
    }),
    update: useMutation({
      mutationFn: (a: { id: string; input: Partial<PassInput> }) =>
        svc.updatePass(a.id, a.input),
      onSuccess: inv,
    }),
    remove: useMutation({
      mutationFn: (id: string) => svc.deletePass(id),
      onSuccess: inv,
    }),
  };
};
