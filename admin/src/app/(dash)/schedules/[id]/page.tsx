"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, FullScreenLoader, Alert, Badge } from "@/components/ui";
import { errorMessage } from "@/lib/error/apiError";
import { ScheduleForm } from "@/modules/schedule/components/ScheduleForm";
import { GenerateTripsPanel } from "@/modules/schedule/components/GenerateTripsPanel";
import {
  useSchedule,
  useUpdateSchedule,
} from "@/modules/schedule/hooks/useSchedules";

export default function EditSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: schedule, isLoading, error } = useSchedule(id);
  const update = useUpdateSchedule(id);

  if (isLoading) return <FullScreenLoader />;
  if (error || !schedule)
    return (
      <>
        <PageHeader title="Schedule" backHref="/schedules" />
        <Alert tone="error">
          {errorMessage(error) || "Schedule not found"}
        </Alert>
      </>
    );

  return (
    <>
      <PageHeader
        title={schedule.name}
        description="Edit schedule"
        backHref="/schedules"
        action={
          <Badge tone={schedule.isActive ? "success" : "neutral"}>
            {schedule.isActive ? "Active" : "Inactive"}
          </Badge>
        }
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-semibold">Details</h2>
          <ScheduleForm
            schedule={schedule}
            submitting={update.isPending}
            error={update.error}
            onSubmit={(input) =>
              update.mutate(input, {
                onSuccess: () => router.push("/schedules"),
              })
            }
          />
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">Trips</h2>
          <GenerateTripsPanel scheduleId={schedule._id} />
        </div>
      </div>
    </>
  );
}
