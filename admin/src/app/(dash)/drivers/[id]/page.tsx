"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  FullScreenLoader,
  Alert,
  Badge,
  Card,
  CardHeader,
  CardBody,
} from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { DriverForm } from "@/modules/driver/components/DriverForm";
import { DriverAssignPanel } from "@/modules/driver/components/DriverAssignPanel";
import { useDriver, useUpdateDriver } from "@/modules/driver/hooks/useDrivers";

export default function EditDriverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: driver, isLoading, error } = useDriver(id);
  const update = useUpdateDriver(id);

  if (isLoading) return <FullScreenLoader />;
  if (error || !driver)
    return (
      <>
        <PageHeader title="Driver" backHref="/drivers" />
        <Alert tone="error">{errorMessage(error) || "Driver not found"}</Alert>
      </>
    );

  const recent = [...(driver.attendance ?? [])]
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .slice(0, 8);

  return (
    <>
      <PageHeader
        title={driver.name}
        description={`Employee ${driver.employeeId}`}
        backHref="/drivers"
        action={
          <Badge tone={driver.status === "ACTIVE" ? "success" : "neutral"}>
            {driver.status.replace("_", " ")}
          </Badge>
        }
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold">Details</h2>
          <DriverForm
            driver={driver}
            submitting={update.isPending}
            error={update.error}
            onSubmit={(input) =>
              update.mutate(
                {
                  name: input.name,
                  phone: input.phone,
                  employeeId: input.employeeId,
                  licenseNumber: input.licenseNumber,
                  licenseType: input.licenseType,
                  licenseExpiry: input.licenseExpiry,
                  joiningDate: input.joiningDate,
                  status: input.status,
                  shift: input.shift,
                },
                { onSuccess: () => router.push("/drivers") }
              )
            }
          />
        </div>

        <div className="flex flex-col gap-6">
          <DriverAssignPanel driver={driver} />

          <Card>
            <CardHeader title="Recent attendance" />
            <CardBody>
              {recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No attendance recorded.
                </p>
              ) : (
                <ul className="flex flex-col gap-1 text-sm">
                  {recent.map((a, i) => (
                    <li
                      key={i}
                      className="flex justify-between border-b pb-1 last:border-0"
                    >
                      <span>{new Date(a.date).toLocaleDateString()}</span>
                      <span className="text-muted-foreground">
                        {a.checkIn
                          ? new Date(a.checkIn).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                        {" → "}
                        {a.checkOut
                          ? new Date(a.checkOut).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
