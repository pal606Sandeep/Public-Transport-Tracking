"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui";
import {
  CrudSection,
  ActiveBadge,
  type FieldDef,
} from "@/modules/fare/components/CrudSection";
import {
  useFareRules,
  useFareRuleMutations,
  useFares,
  useFareMutations,
  useConcessions,
  useConcessionMutations,
  usePasses,
  usePassMutations,
} from "@/modules/fare/useFares";
import {
  FARE_TYPES,
  CONCESSION_TYPES,
  PASS_TYPES,
  type Fare,
  type FareRule,
  type Concession,
  type Pass,
} from "@/modules/fare/fare.types";

const TABS = ["Fare rules", "Fares", "Concessions", "Passes"] as const;
type Tab = (typeof TABS)[number];

const ruleFields: FieldDef[] = [
  { name: "name", label: "Name", type: "text", required: true },
  { name: "description", label: "Description", type: "text" },
  { name: "baseFare", label: "Base fare", type: "number", required: true },
  { name: "perStopFare", label: "Per-stop fare", type: "number", required: true },
  { name: "perKmFare", label: "Per-km fare", type: "number" },
  { name: "minimumFare", label: "Minimum fare", type: "number" },
  { name: "currency", label: "Currency", type: "text", hint: "e.g. INR" },
  {
    name: "acceptedPaymentMethods",
    label: "Payment methods",
    type: "csv",
    hint: "Comma-separated, e.g. QR, CASH, CARD, UPI",
  },
  { name: "isActive", label: "Active", type: "checkbox" },
];

const fareFields: FieldDef[] = [
  { name: "name", label: "Name", type: "text", required: true },
  { name: "type", label: "Type", type: "select", options: FARE_TYPES },
  { name: "amount", label: "Amount", type: "number", required: true },
  { name: "distanceFromKm", label: "Distance from (km)", type: "number" },
  { name: "distanceToKm", label: "Distance to (km)", type: "number" },
  { name: "priority", label: "Priority", type: "number" },
  { name: "isActive", label: "Active", type: "checkbox" },
];

const concessionFields: FieldDef[] = [
  { name: "name", label: "Name", type: "text", required: true },
  { name: "code", label: "Code", type: "text", required: true },
  { name: "type", label: "Type", type: "select", options: CONCESSION_TYPES },
  {
    name: "discountPercent",
    label: "Discount %",
    type: "number",
    required: true,
  },
  { name: "validFrom", label: "Valid from", type: "date" },
  { name: "validTo", label: "Valid to", type: "date" },
  { name: "maxPerDay", label: "Max per day", type: "number" },
  { name: "isActive", label: "Active", type: "checkbox" },
];

const passFields: FieldDef[] = [
  { name: "name", label: "Name", type: "text", required: true },
  { name: "type", label: "Type", type: "select", options: PASS_TYPES },
  { name: "price", label: "Price", type: "number", required: true },
  { name: "currency", label: "Currency", type: "text", hint: "e.g. INR" },
  { name: "durationDays", label: "Duration (days)", type: "number" },
  { name: "validFrom", label: "Valid from", type: "date" },
  { name: "validTo", label: "Valid to", type: "date" },
  { name: "unlimited", label: "Unlimited rides", type: "checkbox" },
  { name: "isActive", label: "Active", type: "checkbox" },
];

export default function FaresPage() {
  const [tab, setTab] = useState<Tab>("Fare rules");

  const rulesQ = useFareRules();
  const ruleM = useFareRuleMutations();
  const faresQ = useFares();
  const fareM = useFareMutations();
  const concQ = useConcessions();
  const concM = useConcessionMutations();
  const passQ = usePasses();
  const passM = usePassMutations();

  return (
    <>
      <PageHeader
        title="Fares &amp; passes"
        description="Fare rules, route/distance fares, concessions and travel passes."
      />

      <div className="mb-6 flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={
              "-mb-px border-b-2 px-3 py-2 text-sm " +
              (tab === t
                ? "border-primary font-medium text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground")
            }
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Fare rules" && (
        <CrudSection<FareRule>
          title="Fare rules"
          rows={rulesQ.data ?? []}
          loading={rulesQ.isLoading}
          error={rulesQ.error}
          fields={ruleFields}
          create={ruleM.create}
          update={ruleM.update}
          remove={ruleM.remove}
          columns={[
            { header: "Name", render: (r) => r.name },
            { header: "Base", render: (r) => r.baseFare },
            { header: "Per stop", render: (r) => r.perStopFare },
            { header: "Per km", render: (r) => r.perKmFare ?? "—" },
            { header: "Currency", render: (r) => r.currency },
            {
              header: "Status",
              render: (r) => <ActiveBadge active={r.isActive} />,
            },
          ]}
        />
      )}

      {tab === "Fares" && (
        <CrudSection<Fare>
          title="Fares"
          rows={faresQ.data?.fares ?? []}
          loading={faresQ.isLoading}
          error={faresQ.error}
          fields={fareFields}
          create={fareM.create}
          update={fareM.update}
          remove={fareM.remove}
          columns={[
            { header: "Name", render: (r) => r.name },
            { header: "Type", render: (r) => r.type },
            { header: "Amount", render: (r) => r.amount },
            { header: "Priority", render: (r) => r.priority },
            {
              header: "Status",
              render: (r) => <ActiveBadge active={r.isActive} />,
            },
          ]}
        />
      )}

      {tab === "Concessions" && (
        <CrudSection<Concession>
          title="Concessions"
          rows={concQ.data?.concessions ?? []}
          loading={concQ.isLoading}
          error={concQ.error}
          fields={concessionFields}
          create={concM.create}
          update={concM.update}
          remove={concM.remove}
          columns={[
            { header: "Name", render: (r) => r.name },
            { header: "Code", render: (r) => r.code },
            { header: "Type", render: (r) => r.type },
            { header: "Discount", render: (r) => `${r.discountPercent}%` },
            {
              header: "Status",
              render: (r) => <ActiveBadge active={r.isActive} />,
            },
          ]}
        />
      )}

      {tab === "Passes" && (
        <CrudSection<Pass>
          title="Passes"
          rows={passQ.data?.passes ?? []}
          loading={passQ.isLoading}
          error={passQ.error}
          fields={passFields}
          create={passM.create}
          update={passM.update}
          remove={passM.remove}
          columns={[
            { header: "Name", render: (r) => r.name },
            { header: "Type", render: (r) => r.type },
            { header: "Price", render: (r) => `${r.currency} ${r.price}` },
            {
              header: "Duration",
              render: (r) => (r.durationDays ? `${r.durationDays}d` : "—"),
            },
            {
              header: "Status",
              render: (r) => <ActiveBadge active={r.isActive} />,
            },
          ]}
        />
      )}
    </>
  );
}
