"use client";

import Link from "next/link";
import { PageHeader, Card, CardBody } from "@/components/ui";
import { useSession } from "@/modules/auth/hooks/useAuth";

const QUICK = [
  { label: "Add a stop", href: "/stops/new" },
  { label: "Manage stops", href: "/stops" },
];

export default function DashboardPage() {
  const { user } = useSession();

  return (
    <>
      <PageHeader
        title={`Welcome${user?.name ? `, ${user.name}` : ""}`}
        description="Operations control centre."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK.map((q) => (
          <Link key={q.href} href={q.href}>
            <Card className="transition-colors hover:border-primary">
              <CardBody>
                <p className="text-sm font-medium">{q.label}</p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        More modules (routes, vehicles, trips, dispatch, fares, analytics) are
        being wired up. Items marked <em>soon</em> in the sidebar aren&apos;t
        available yet.
      </p>
    </>
  );
}
