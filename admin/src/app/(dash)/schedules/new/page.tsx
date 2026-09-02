"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { ScheduleForm } from "@/modules/schedule/components/ScheduleForm";
import { useCreateSchedule } from "@/modules/schedule/hooks/useSchedules";

export default function NewSchedulePage() {
  const router = useRouter();
  const create = useCreateSchedule();

  return (
    <>
      <PageHeader
        title="Add schedule"
        description="Create the timetable, then generate trips from it on the next screen."
        backHref="/schedules"
      />
      <ScheduleForm
        submitting={create.isPending}
        error={create.error}
        onSubmit={(input) =>
          create.mutate(input, {
            onSuccess: (schedule) =>
              router.replace(`/schedules/${schedule._id}`),
          })
        }
      />
    </>
  );
}
